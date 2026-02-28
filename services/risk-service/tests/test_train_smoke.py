from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.ml import ModelManager
import app.main as main_module


def _row(idx: int, label: float) -> dict:
    return {
        "label": label,
        "features": {
            "user_id": f"u-{idx}",
            "as_of_date": "2026-02-28",
            "bp_sys_trend_14d": 5.0 if label > 0.5 else 0.3,
            "bp_sys_var_7d": 10.0 if label > 0.5 else 2.0,
            "bp_dia_trend_14d": 3.0 if label > 0.5 else 0.2,
            "bp_dia_var_7d": 7.0 if label > 0.5 else 1.5,
            "hrv_z_7d": -1.0 if label > 0.5 else 0.4,
            "rhr_z_7d": 0.8 if label > 0.5 else -0.2,
            "steps_z_7d": -1.4 if label > 0.5 else 0.9,
            "sleep_debt_hours_7d": 6.0 if label > 0.5 else 1.0,
            "weight_trend_14d": 0.6 if label > 0.5 else -0.2,
            "glucose_trend_14d": 8.0 if label > 0.5 else 0.0,
            "adherence_nudge_7d": 0.2 if label > 0.5 else 0.8,
        },
    }


def test_train_creates_artifacts_and_health_loaded(tmp_path: Path) -> None:
    main_module.model_manager = ModelManager(artifact_dir=tmp_path)
    client = TestClient(app)

    rows = [_row(i, 1.0 if i % 2 else 0.0) for i in range(30)]

    res = client.post("/train", json={"rows": rows})
    assert res.status_code == 200

    body = res.json()
    assert body["model_version"].startswith("ml-")
    assert body["n_samples"] == 30

    assert (tmp_path / "model.pkl").exists()
    assert (tmp_path / "metadata.json").exists()

    h = client.get("/health")
    assert h.status_code == 200
    assert h.json()["model_loaded"] is True
