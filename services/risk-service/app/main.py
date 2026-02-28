from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException

from app.ml import ModelManager
from app.models import BatchScoreOutput, BatchScoreRequest, FeaturesV1, HealthOutput, ScoreOutput, TrainOutput, TrainRequest


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("risk-service")

app = FastAPI(title="Cardiometrix AI Risk Service", version="0.1.0")
model_manager = ModelManager()


@app.get("/health", response_model=HealthOutput)
def health() -> HealthOutput:
    return HealthOutput(ok=True, model_loaded=model_manager.model_loaded(), model_version=model_manager.model_version())


@app.post("/score", response_model=ScoreOutput)
def score(payload: FeaturesV1) -> ScoreOutput:
    logger.info("score_request user_id=%s as_of_date=%s", payload.user_id, payload.as_of_date)
    risk, band, drivers, model_version = model_manager.score_one(payload)
    return ScoreOutput(
        risk=risk,
        band=band,
        drivers=drivers,
        model_version=model_version,
        as_of_date=payload.as_of_date,
    )


@app.post("/score/batch", response_model=BatchScoreOutput)
def score_batch(payload: BatchScoreRequest) -> BatchScoreOutput:
    scored = []
    for item in payload.items:
        risk, band, drivers, model_version = model_manager.score_one(item)
        scored.append(
            ScoreOutput(
                risk=risk,
                band=band,
                drivers=drivers,
                model_version=model_version,
                as_of_date=item.as_of_date,
            )
        )
    return BatchScoreOutput(items=scored)


@app.post("/train", response_model=TrainOutput)
def train(payload: TrainRequest) -> TrainOutput:
    try:
        out = model_manager.train_and_save(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return TrainOutput(
        model_version=out["model_version"],
        metrics=out["metrics"],
        n_samples=out["n_samples"],
    )
