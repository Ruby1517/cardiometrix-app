from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_batch_keeps_order_and_count() -> None:
    payload = {
        "items": [
            {
                "user_id": "u-1",
                "as_of_date": "2026-02-28",
                "bp_sys_trend_14d": 4.0,
                "steps_z_7d": -1.0,
            },
            {
                "user_id": "u-2",
                "as_of_date": "2026-02-28",
                "bp_sys_trend_14d": 0.1,
                "steps_z_7d": 0.8,
            },
        ]
    }

    res = client.post("/score/batch", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert "items" in body
    assert len(body["items"]) == 2
    assert body["items"][0]["as_of_date"] == "2026-02-28"
    assert body["items"][1]["as_of_date"] == "2026-02-28"
