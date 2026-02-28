from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SERVICE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_ARTIFACT_DIR = SERVICE_DIR / "artifacts"


def get_artifact_dir() -> Path:
    raw = os.getenv("RISK_ARTIFACT_DIR")
    if raw:
        return Path(raw).resolve()
    return DEFAULT_ARTIFACT_DIR


def clip(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def band_for_risk(risk: float) -> str:
    if risk < 0.33:
        return "green"
    if risk < 0.66:
        return "amber"
    return "red"


def now_iso8601() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def dump_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, sort_keys=True)


def next_model_version(current: str | None) -> str:
    if not current:
        return "ml-1"
    if not current.startswith("ml-"):
        return "ml-1"
    try:
        idx = int(current.split("-", 1)[1])
    except ValueError:
        return "ml-1"
    return f"ml-{idx + 1}"
