from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_score_shape_and_range() -> None:
    payload = {
        "user_id": "u-1",
        "as_of_date": "2026-02-28",
        "bp_sys_trend_14d": 4.2,
        "bp_sys_var_7d": 12.4,
        "bp_dia_trend_14d": 2.0,
        "bp_dia_var_7d": 7.0,
        "hrv_z_7d": -0.8,
        "rhr_z_7d": 0.6,
        "steps_z_7d": -1.2,
        "sleep_debt_hours_7d": 3.5,
        "weight_trend_14d": 0.4,
        "glucose_trend_14d": 6.0,
        "adherence_nudge_7d": 0.3,
    }

    res = client.post("/score", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert 0.0 <= body["risk"] <= 1.0
    assert body["band"] in {"green", "amber", "red"}
    assert isinstance(body["drivers"], list)
    assert len(body["drivers"]) >= 1
    assert isinstance(body["model_version"], str)
    assert body["as_of_date"] == payload["as_of_date"]
