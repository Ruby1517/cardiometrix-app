from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


FEATURE_NAMES_V1 = [
    "bp_sys_trend_14d",
    "bp_sys_var_7d",
    "bp_dia_trend_14d",
    "bp_dia_var_7d",
    "hrv_z_7d",
    "rhr_z_7d",
    "steps_z_7d",
    "sleep_debt_hours_7d",
    "weight_trend_14d",
    "glucose_trend_14d",
    "a1c_latest",
    "ldl_latest",
    "adherence_nudge_7d",
]


class Driver(BaseModel):
    name: str
    value: float
    direction: Literal["up", "down"]
    contribution: float


class FeaturesV1(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str | None = None
    as_of_date: str

    bp_sys_trend_14d: float | None = 0.0
    bp_sys_var_7d: float | None = 0.0
    bp_dia_trend_14d: float | None = 0.0
    bp_dia_var_7d: float | None = 0.0
    hrv_z_7d: float | None = 0.0
    rhr_z_7d: float | None = 0.0
    steps_z_7d: float | None = 0.0
    sleep_debt_hours_7d: float | None = 0.0
    weight_trend_14d: float | None = 0.0
    glucose_trend_14d: float | None = 0.0
    a1c_latest: float | None = None
    ldl_latest: float | None = None
    adherence_nudge_7d: float | None = 0.5

    @field_validator("as_of_date")
    @classmethod
    def validate_date(cls, value: str) -> str:
        datetime.strptime(value, "%Y-%m-%d")
        return value

    @field_validator("adherence_nudge_7d")
    @classmethod
    def validate_adherence(cls, value: float | None) -> float | None:
        if value is None:
            return value
        if value < 0 or value > 1:
            raise ValueError("adherence_nudge_7d must be in [0, 1]")
        return value

    def as_feature_dict(self) -> dict[str, float]:
        return {
            "bp_sys_trend_14d": float(self.bp_sys_trend_14d or 0.0),
            "bp_sys_var_7d": float(self.bp_sys_var_7d or 0.0),
            "bp_dia_trend_14d": float(self.bp_dia_trend_14d or 0.0),
            "bp_dia_var_7d": float(self.bp_dia_var_7d or 0.0),
            "hrv_z_7d": float(self.hrv_z_7d or 0.0),
            "rhr_z_7d": float(self.rhr_z_7d or 0.0),
            "steps_z_7d": float(self.steps_z_7d or 0.0),
            "sleep_debt_hours_7d": float(self.sleep_debt_hours_7d or 0.0),
            "weight_trend_14d": float(self.weight_trend_14d or 0.0),
            "glucose_trend_14d": float(self.glucose_trend_14d or 0.0),
            "a1c_latest": float(self.a1c_latest or 0.0),
            "ldl_latest": float(self.ldl_latest or 0.0),
            "adherence_nudge_7d": float(self.adherence_nudge_7d if self.adherence_nudge_7d is not None else 0.5),
        }

    def as_feature_vector(self) -> list[float]:
        dct = self.as_feature_dict()
        return [dct[name] for name in FEATURE_NAMES_V1]


class ScoreOutput(BaseModel):
    risk: float = Field(ge=0.0, le=1.0)
    band: Literal["green", "amber", "red"]
    drivers: list[Driver]
    model_version: str
    as_of_date: str


class BatchScoreRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: list[FeaturesV1] = Field(min_length=1, max_length=500)


class BatchScoreOutput(BaseModel):
    items: list[ScoreOutput]


class TrainRow(BaseModel):
    model_config = ConfigDict(extra="forbid")
    features: FeaturesV1
    label: float


class TrainRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    rows: list[TrainRow] = Field(min_length=5, max_length=50000)


class TrainMetrics(BaseModel):
    auc: float | None = None
    logloss: float | None = None


class TrainOutput(BaseModel):
    model_version: str
    metrics: TrainMetrics
    n_samples: int


class HealthOutput(BaseModel):
    ok: bool
    model_loaded: bool
    model_version: str
