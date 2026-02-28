# Cardiometrix AI Risk Service

Python FastAPI microservice for near-term cardiometabolic risk scoring.

- Uses a deterministic `RULE_MODEL_V0` by default.
- Can train and persist an ML model (`model.pkl`) via `/train`.
- Returns risk, band, and top drivers for each score request.

## Scope

This service only scores incoming precomputed features. It does **not** collect Apple Health / Google Fit data.

## Requirements

- Python 3.11+
- pip

## Install

```bash
cd services/risk-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --port 8001
```

## Test

```bash
pytest -q
```

## Endpoints

- `GET /health`
- `POST /score`
- `POST /score/batch`
- `POST /train`

## Example: Score

```bash
curl -s -X POST http://localhost:8001/score \
  -H 'Content-Type: application/json' \
  -d '{
    "user_id": "user-123",
    "as_of_date": "2026-02-28",
    "bp_sys_trend_14d": 4.0,
    "bp_sys_var_7d": 10.0,
    "bp_dia_trend_14d": 2.0,
    "bp_dia_var_7d": 7.0,
    "hrv_z_7d": -0.7,
    "rhr_z_7d": 0.5,
    "steps_z_7d": -1.1,
    "sleep_debt_hours_7d": 3.2,
    "weight_trend_14d": 0.4,
    "glucose_trend_14d": 5.0,
    "a1c_latest": 6.1,
    "ldl_latest": 125,
    "adherence_nudge_7d": 0.4
  }'
```

Example response:

```json
{
  "risk": 0.5343,
  "band": "amber",
  "drivers": [
    {
      "name": "Sleep debt",
      "value": 3.2,
      "direction": "up",
      "contribution": 0.0274
    }
  ],
  "model_version": "rule-v0",
  "as_of_date": "2026-02-28"
}
```

## Example: Batch Score

```bash
curl -s -X POST http://localhost:8001/score/batch \
  -H 'Content-Type: application/json' \
  -d '{
    "items": [
      {
        "user_id": "u1",
        "as_of_date": "2026-02-28",
        "bp_sys_trend_14d": 3.2,
        "steps_z_7d": -0.8
      },
      {
        "user_id": "u2",
        "as_of_date": "2026-02-28",
        "bp_sys_trend_14d": 0.1,
        "steps_z_7d": 0.6
      }
    ]
  }'
```

## Example: Train

```bash
curl -s -X POST http://localhost:8001/train \
  -H 'Content-Type: application/json' \
  -d '{
    "rows": [
      {
        "label": 1,
        "features": {
          "user_id": "u-a",
          "as_of_date": "2026-02-28",
          "bp_sys_trend_14d": 6,
          "steps_z_7d": -1.5,
          "sleep_debt_hours_7d": 6
        }
      },
      {
        "label": 0,
        "features": {
          "user_id": "u-b",
          "as_of_date": "2026-02-28",
          "bp_sys_trend_14d": 0.2,
          "steps_z_7d": 0.6,
          "sleep_debt_hours_7d": 1
        }
      },
      {
        "label": 1,
        "features": {
          "user_id": "u-c",
          "as_of_date": "2026-02-28",
          "bp_sys_trend_14d": 5,
          "steps_z_7d": -1.2,
          "sleep_debt_hours_7d": 5
        }
      },
      {
        "label": 0,
        "features": {
          "user_id": "u-d",
          "as_of_date": "2026-02-28",
          "bp_sys_trend_14d": 0.1,
          "steps_z_7d": 0.8,
          "sleep_debt_hours_7d": 0.5
        }
      },
      {
        "label": 1,
        "features": {
          "user_id": "u-e",
          "as_of_date": "2026-02-28",
          "bp_sys_trend_14d": 5.5,
          "steps_z_7d": -1.0,
          "sleep_debt_hours_7d": 4.5
        }
      }
    ]
  }'
```

Expected shape:

```json
{
  "model_version": "ml-1",
  "metrics": {
    "auc": 0.92,
    "logloss": 0.41
  },
  "n_samples": 500
}
```

## Integration (Node API)

Node API should call:

```http
POST http://risk-service:8001/score
Content-Type: application/json
```

with a `FeaturesV1` JSON payload.

## docker-compose Snippet

```yaml
services:
  node-api:
    build: ./api
    ports:
      - "3000:3000"
    depends_on:
      - risk-service
    environment:
      PY_SCORER_URL: http://risk-service:8001/score

  risk-service:
    build:
      context: ./services/risk-service
    ports:
      - "8001:8001"
```
