from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss, roc_auc_score
from sklearn.model_selection import train_test_split

from app.models import FEATURE_NAMES_V1, Driver, FeaturesV1, TrainRequest
from app.scoring import RULE_MODEL_VERSION, score_rule_v0
from app.utils import band_for_risk, clip, dump_json, get_artifact_dir, load_json, next_model_version, now_iso8601


logger = logging.getLogger(__name__)


class ModelManager:
    def __init__(self, artifact_dir: Path | None = None) -> None:
        self.artifact_dir = artifact_dir or get_artifact_dir()
        self.model_path = self.artifact_dir / "model.pkl"
        self.metadata_path = self.artifact_dir / "metadata.json"
        self.model: Any | None = None
        self.metadata: dict[str, Any] = {}
        self.load_model_if_exists()

    def model_loaded(self) -> bool:
        return self.model is not None

    def model_version(self) -> str:
        if self.model is None:
            return RULE_MODEL_VERSION
        return str(self.metadata.get("model_version") or RULE_MODEL_VERSION)

    def load_model_if_exists(self) -> bool:
        self.artifact_dir.mkdir(parents=True, exist_ok=True)
        if not self.model_path.exists() or not self.metadata_path.exists():
            self.model = None
            self.metadata = {}
            return False
        self.model = joblib.load(self.model_path)
        self.metadata = load_json(self.metadata_path)
        logger.info("loaded_model version=%s", self.metadata.get("model_version"))
        return True

    def score_one(self, features: FeaturesV1) -> tuple[float, str, list[Driver], str]:
        if self.model is None:
            return score_rule_v0(features)

        vector = np.array(features.as_feature_vector(), dtype=float)
        risk = float(self._predict_proba(vector))
        risk = clip(risk, 0.0, 1.0)
        drivers = self._drivers_from_model(vector)
        if not drivers:
            drivers = [Driver(name="Model baseline", value=0.0, direction="down", contribution=0.0)]
        return round(risk, 6), band_for_risk(risk), drivers, self.model_version()

    def train_and_save(self, req: TrainRequest) -> dict[str, Any]:
        rows = req.rows
        x = np.array([r.features.as_feature_vector() for r in rows], dtype=float)
        y_raw = np.array([float(r.label) for r in rows], dtype=float)
        y = (y_raw >= 0.5).astype(int)

        if len(np.unique(y)) < 2:
            raise ValueError("Training labels must contain at least two classes after thresholding at 0.5")

        estimator, model_type = self._build_estimator()

        x_train, x_eval, y_train, y_eval = self._split_dataset(x, y)
        estimator.fit(x_train, y_train)

        probs_eval = self._predict_proba_batch(estimator, x_eval)
        auc = self._safe_auc(y_eval, probs_eval)
        ll = self._safe_logloss(y_eval, probs_eval)

        prev_version = None
        if self.metadata_path.exists():
            prev_meta = load_json(self.metadata_path)
            prev_version = str(prev_meta.get("model_version"))

        model_version = next_model_version(prev_version)
        feature_means = x_train.mean(axis=0).tolist()

        metadata: dict[str, Any] = {
            "model_version": model_version,
            "trained_at": now_iso8601(),
            "feature_names": FEATURE_NAMES_V1,
            "feature_means": feature_means,
            "training_metrics": {
                "auc": auc,
                "logloss": ll,
            },
            "n_samples": int(x.shape[0]),
            "model_type": model_type,
            "label_mode": "binary_threshold_0.5",
        }

        self.artifact_dir.mkdir(parents=True, exist_ok=True)
        joblib.dump(estimator, self.model_path)
        dump_json(self.metadata_path, metadata)

        self.model = estimator
        self.metadata = metadata

        logger.info("trained_model version=%s n_samples=%d", model_version, x.shape[0])
        return {
            "model_version": model_version,
            "metrics": {
                "auc": auc,
                "logloss": ll,
            },
            "n_samples": int(x.shape[0]),
        }

    def _build_estimator(self) -> tuple[Any, str]:
        try:
            from xgboost import XGBClassifier  # type: ignore

            model = XGBClassifier(
                n_estimators=80,
                learning_rate=0.08,
                max_depth=3,
                subsample=1.0,
                colsample_bytree=1.0,
                random_state=42,
                eval_metric="logloss",
            )
            return model, "xgboost"
        except Exception:
            model = LogisticRegression(max_iter=1000, random_state=42)
            return model, "logistic_regression"

    def _split_dataset(self, x: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        n = x.shape[0]
        if n >= 20 and len(np.unique(y)) > 1:
            return train_test_split(x, y, test_size=0.2, random_state=42, stratify=y)
        return x, x, y, y

    def _predict_proba(self, vector: np.ndarray) -> float:
        arr = vector.reshape(1, -1)
        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(arr)
            return float(probs[0][1])
        if hasattr(self.model, "decision_function"):
            decision = float(self.model.decision_function(arr)[0])
            return 1.0 / (1.0 + np.exp(-decision))
        pred = float(self.model.predict(arr)[0])
        return clip(pred, 0.0, 1.0)

    def _predict_proba_batch(self, model: Any, x: np.ndarray) -> np.ndarray:
        if hasattr(model, "predict_proba"):
            return model.predict_proba(x)[:, 1]
        if hasattr(model, "decision_function"):
            decision = model.decision_function(x)
            return 1.0 / (1.0 + np.exp(-decision))
        pred = model.predict(x)
        return np.clip(np.asarray(pred, dtype=float), 0.0, 1.0)

    def _safe_auc(self, y_true: np.ndarray, y_prob: np.ndarray) -> float | None:
        if len(np.unique(y_true)) < 2:
            return None
        try:
            return float(roc_auc_score(y_true, y_prob))
        except Exception:
            return None

    def _safe_logloss(self, y_true: np.ndarray, y_prob: np.ndarray) -> float | None:
        try:
            prob = np.clip(y_prob, 1e-6, 1 - 1e-6)
            return float(log_loss(y_true, prob, labels=[0, 1]))
        except Exception:
            return None

    def _drivers_from_model(self, vector: np.ndarray) -> list[Driver]:
        means = np.asarray(self.metadata.get("feature_means", [0.0] * len(FEATURE_NAMES_V1)), dtype=float)
        centered = vector - means

        contributions = None
        if hasattr(self.model, "coef_"):
            coefs = np.asarray(self.model.coef_[0], dtype=float)
            contributions = centered * coefs
        elif hasattr(self.model, "feature_importances_"):
            importances = np.asarray(self.model.feature_importances_, dtype=float)
            contributions = centered * importances

        if contributions is None:
            return []

        drivers: list[Driver] = []
        for idx, contrib in enumerate(contributions.tolist()):
            if abs(contrib) < 1e-4:
                continue
            val = float(vector[idx])
            direction = "up" if contrib >= 0 else "down"
            drivers.append(
                Driver(
                    name=FEATURE_NAMES_V1[idx],
                    value=round(val, 4),
                    direction=direction,
                    contribution=round(float(contrib), 4),
                )
            )

        if not drivers:
            return []

        drivers.sort(key=lambda d: (-abs(d.contribution), d.name))
        return drivers[:6]
