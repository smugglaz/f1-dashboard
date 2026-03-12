from fastapi import APIRouter, HTTPException
from datetime import datetime

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


def _get_predictor():
    from backend.main import app
    predictor = getattr(app.state, "predictor", None)
    if not predictor:
        raise HTTPException(503, "Prediction model not available")
    return predictor


@router.get("/next-race")
def predict_next_race():
    predictor = _get_predictor()
    from backend.database import SessionLocal
    from backend import models

    db = SessionLocal()
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        current_year = datetime.now().year

        # Find the next race (first race with date >= today)
        race = (
            db.query(models.Race)
            .filter(models.Race.year == current_year, models.Race.date >= today)
            .order_by(models.Race.date)
            .first()
        )
        if not race:
            # Fall back to the last race
            race = (
                db.query(models.Race)
                .filter(models.Race.year == current_year)
                .order_by(models.Race.round.desc())
                .first()
            )
        if not race:
            raise HTTPException(404, "No races found for current season")

        return predictor.predict_race(race.year, race.round)
    finally:
        db.close()


@router.get("/{year}/{round}")
def predict_race(year: int, round: int):
    predictor = _get_predictor()
    return predictor.predict_race(year, round)


@router.get("/model-info")
def model_info():
    predictor = _get_predictor()
    return predictor.get_model_info()
