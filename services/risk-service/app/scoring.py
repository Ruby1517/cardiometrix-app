from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from app.models import Driver, FeaturesV1
from app.utils import band_for_risk, clip


RULE_MODEL_VERSION = "rule-v0"


@dataclass(frozen=True)
class RuleTerm:
    key: str
    name: str
    weight: float
    max_signal: float
    signal_fn: Callable[[dict[str, float]], float]


RULE_TERMS: list[RuleTerm] = [
    RuleTerm("bp_sys_trend_14d", "Systolic BP trend", 0.18, 12.0, lambda f: max(f["bp_sys_trend_14d"], 0.0)),
    RuleTerm("bp_sys_var_7d", "Systolic BP variability", 0.10, 20.0, lambda f: max(f["bp_sys_var_7d"], 0.0)),
    RuleTerm("bp_dia_trend_14d", "Diastolic BP trend", 0.08, 8.0, lambda f: max(f["bp_dia_trend_14d"], 0.0)),
    RuleTerm("bp_dia_var_7d", "Diastolic BP variability", 0.07, 15.0, lambda f: max(f["bp_dia_var_7d"], 0.0)),
    RuleTerm("hrv_z_7d", "Low HRV", 0.10, 3.0, lambda f: max(-f["hrv_z_7d"], 0.0)),
    RuleTerm("rhr_z_7d", "Elevated resting HR", 0.08, 3.0, lambda f: max(f["rhr_z_7d"], 0.0)),
    RuleTerm("steps_z_7d", "Low activity", 0.10, 3.0, lambda f: max(-f["steps_z_7d"], 0.0)),
    RuleTerm("sleep_debt_hours_7d", "Sleep debt", 0.12, 14.0, lambda f: max(f["sleep_debt_hours_7d"], 0.0)),
    RuleTerm("weight_trend_14d", "Weight gain trend", 0.06, 3.0, lambda f: max(f["weight_trend_14d"], 0.0)),
    RuleTerm("glucose_trend_14d", "Glucose trend", 0.07, 20.0, lambda f: max(f["glucose_trend_14d"], 0.0)),
    RuleTerm("a1c_latest", "Elevated A1c", 0.03, 3.0, lambda f: max(f["a1c_latest"] - 5.7, 0.0)),
    RuleTerm("ldl_latest", "Elevated LDL", 0.03, 80.0, lambda f: max(f["ldl_latest"] - 100.0, 0.0)),
    RuleTerm("adherence_nudge_7d", "Low nudge adherence", 0.08, 0.5, lambda f: max(0.5 - f["adherence_nudge_7d"], 0.0)),
]


def score_rule_v0(features: FeaturesV1) -> tuple[float, str, list[Driver], str]:
    vals = features.as_feature_dict()
    risk = 0.05
    drivers: list[Driver] = []

    for term in RULE_TERMS:
        raw_signal = term.signal_fn(vals)
        normalized = clip(raw_signal / term.max_signal, 0.0, 1.0)
        contribution = term.weight * normalized
        risk += contribution

        if contribution >= 0.01:
            source_value = vals[term.key]
            direction = "up" if contribution >= 0 else "down"
            drivers.append(
                Driver(
                    name=term.name,
                    value=round(source_value, 4),
                    direction=direction,
                    contribution=round(contribution, 4),
                )
            )

    risk = clip(risk, 0.0, 1.0)
    band = band_for_risk(risk)

    if not drivers:
        drivers = [Driver(name="Baseline", value=0.05, direction="down", contribution=0.0)]

    drivers = sorted(drivers, key=lambda d: (-abs(d.contribution), d.name))[:6]
    return round(risk, 6), band, drivers, RULE_MODEL_VERSION
