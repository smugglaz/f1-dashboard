from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models
from backend.fastf1_service import fastf1_service

router = APIRouter(prefix="/api/historical", tags=["historical"])


@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.get("/seasons")
def get_seasons(db: Session = Depends(get_db)):
    rows = db.query(models.Race.year).distinct().order_by(models.Race.year.desc()).all()
    return {"seasons": [r[0] for r in rows]}


@router.get("/races/{year}")
def get_races(year: int, db: Session = Depends(get_db)):
    races = (
        db.query(models.Race)
        .filter(models.Race.year == year)
        .order_by(models.Race.round)
        .all()
    )

    # Pre-fetch winners (position=1) for all races in this year
    winners = (
        db.query(models.RaceResult)
        .join(models.Race, models.RaceResult.race_id == models.Race.id)
        .filter(models.Race.year == year, models.RaceResult.position == 1)
        .all()
    )
    winner_map = {}
    for w in winners:
        winner_map[w.race_id] = {
            "code": w.driver.code if w.driver else None,
            "name": f"{w.driver.first_name} {w.driver.last_name}" if w.driver else None,
            "constructor": w.constructor.name if w.constructor else None,
        }

    return {
        "year": year,
        "races": [
            {
                "round": r.round,
                "name": r.race_name,
                "date": r.date,
                "time": r.time,
                "circuit": {
                    "id": r.circuit.circuit_id if r.circuit else None,
                    "name": r.circuit.name if r.circuit else None,
                    "country": r.circuit.country if r.circuit else None,
                    "locality": r.circuit.locality if r.circuit else None,
                }
                if r.circuit
                else None,
                "winner": winner_map.get(r.id),
                "has_sprint": bool(r.has_sprint),
                "sprint_date": r.sprint_date,
                "qualifying_format": r.qualifying_format or "KNOCKOUT",
            }
            for r in races
        ],
    }


@router.get("/races/{year}/{round}")
def get_race_detail(year: int, round: int, db: Session = Depends(get_db)):
    race = (
        db.query(models.Race)
        .filter(models.Race.year == year, models.Race.round == round)
        .first()
    )
    if not race:
        raise HTTPException(404, f"Race {year} round {round} not found")

    results = (
        db.query(models.RaceResult)
        .filter(models.RaceResult.race_id == race.id)
        .order_by(models.RaceResult.position.nullslast())
        .all()
    )
    return {
        "race": {
            "year": race.year,
            "round": race.round,
            "name": race.race_name,
            "date": race.date,
            "circuit": race.circuit.name if race.circuit else None,
        },
        "results": [
            {
                "position": r.position,
                "position_text": r.position_text,
                "driver": {
                    "id": r.driver.driver_id,
                    "code": r.driver.code,
                    "name": f"{r.driver.first_name} {r.driver.last_name}",
                },
                "constructor": r.constructor.name if r.constructor else None,
                "grid": r.grid,
                "laps": r.laps,
                "status": r.status,
                "points": r.points,
                "time": r.time_text,
                "fastest_lap_time": r.fastest_lap_time,
                "fastest_lap_rank": r.fastest_lap_rank,
            }
            for r in results
        ],
    }


@router.get("/qualifying/{year}/{round}")
def get_qualifying(year: int, round: int, db: Session = Depends(get_db)):
    race = (
        db.query(models.Race)
        .filter(models.Race.year == year, models.Race.round == round)
        .first()
    )
    if not race:
        raise HTTPException(404, f"Race {year} round {round} not found")

    results = (
        db.query(models.QualifyingResult)
        .filter(models.QualifyingResult.race_id == race.id)
        .order_by(models.QualifyingResult.position)
        .all()
    )
    return {
        "race": {
            "year": race.year,
            "round": race.round,
            "name": race.race_name,
        },
        "results": [
            {
                "position": r.position,
                "driver": {
                    "id": r.driver.driver_id,
                    "code": r.driver.code,
                    "name": f"{r.driver.first_name} {r.driver.last_name}",
                },
                "constructor": r.constructor.name if r.constructor else None,
                "q1": r.q1,
                "q2": r.q2,
                "q3": r.q3,
            }
            for r in results
        ],
    }


@router.get("/pitstops/{year}/{round}")
def get_pitstops(year: int, round: int, db: Session = Depends(get_db)):
    race = (
        db.query(models.Race)
        .filter(models.Race.year == year, models.Race.round == round)
        .first()
    )
    if not race:
        raise HTTPException(404, f"Race {year} round {round} not found")

    stops = (
        db.query(models.PitStop)
        .filter(models.PitStop.race_id == race.id)
        .order_by(models.PitStop.lap, models.PitStop.stop_number)
        .all()
    )
    return {
        "race": {"year": race.year, "round": race.round, "name": race.race_name},
        "stops": [
            {
                "driver": {
                    "id": s.driver.driver_id,
                    "code": s.driver.code,
                    "name": f"{s.driver.first_name} {s.driver.last_name}",
                },
                "stop": s.stop_number,
                "lap": s.lap,
                "time": s.time_of_day,
                "duration": s.duration,
            }
            for s in stops
        ],
    }


@router.get("/standings/drivers/{year}")
def get_driver_standings(
    year: int, round: int = Query(default=None), db: Session = Depends(get_db)
):
    query = db.query(models.DriverStanding).filter(models.DriverStanding.year == year)
    if round is not None:
        query = query.filter(models.DriverStanding.round == round)
    else:
        max_round = (
            db.query(models.DriverStanding.round)
            .filter(models.DriverStanding.year == year)
            .order_by(models.DriverStanding.round.desc())
            .first()
        )
        if max_round:
            query = query.filter(models.DriverStanding.round == max_round[0])

    standings = query.order_by(models.DriverStanding.position).all()

    # Enrich with constructor name: find latest RaceResult for each driver in this year
    the_round = standings[0].round if standings else None
    constructor_map = {}
    if standings:
        latest_results = (
            db.query(models.RaceResult)
            .join(models.Race, models.RaceResult.race_id == models.Race.id)
            .filter(models.Race.year == year)
            .order_by(models.Race.round.desc())
            .all()
        )
        for rr in latest_results:
            did = rr.driver_id
            if did not in constructor_map and rr.constructor:
                constructor_map[did] = rr.constructor.name

    return {
        "year": year,
        "round": the_round,
        "standings": [
            {
                "position": s.position,
                "driver": {
                    "id": s.driver.driver_id,
                    "code": s.driver.code,
                    "name": f"{s.driver.first_name} {s.driver.last_name}",
                    "nationality": s.driver.nationality,
                },
                "constructor": constructor_map.get(s.driver_id, ""),
                "points": s.points,
                "wins": s.wins,
            }
            for s in standings
        ],
    }


@router.get("/standings/constructors/{year}")
def get_constructor_standings(
    year: int, round: int = Query(default=None), db: Session = Depends(get_db)
):
    query = db.query(models.ConstructorStanding).filter(
        models.ConstructorStanding.year == year
    )
    if round is not None:
        query = query.filter(models.ConstructorStanding.round == round)
    else:
        max_round = (
            db.query(models.ConstructorStanding.round)
            .filter(models.ConstructorStanding.year == year)
            .order_by(models.ConstructorStanding.round.desc())
            .first()
        )
        if max_round:
            query = query.filter(models.ConstructorStanding.round == max_round[0])

    standings = query.order_by(models.ConstructorStanding.position).all()
    return {
        "year": year,
        "round": standings[0].round if standings else None,
        "standings": [
            {
                "position": s.position,
                "constructor": {
                    "id": s.constructor.constructor_id,
                    "name": s.constructor.name,
                    "nationality": s.constructor.nationality,
                },
                "points": s.points,
                "wins": s.wins,
            }
            for s in standings
        ],
    }


# --- FastF1 Telemetry Endpoints ---


@router.get("/circuit/{year}/{round}")
async def get_circuit(year: int, round: int):
    try:
        return await fastf1_service.get_circuit_info(year, round)
    except Exception as e:
        raise HTTPException(500, f"Error loading circuit data: {e}")


@router.get("/telemetry/{year}/{round}/{session}")
async def get_telemetry(
    year: int,
    round: int,
    session: str,
    driver: str = Query(..., description="Driver code, e.g. VER"),
    lap: int = Query(default=None, description="Lap number (default: fastest)"),
):
    try:
        return await fastf1_service.get_lap_telemetry(year, round, session, driver, lap)
    except Exception as e:
        raise HTTPException(500, f"Error loading telemetry: {e}")


@router.get("/lap-comparison/{year}/{round}/{session}")
async def get_lap_comparison(
    year: int,
    round: int,
    session: str,
    drivers: str = Query(..., description="Comma-separated driver codes, e.g. VER,HAM"),
):
    driver_list = [d.strip() for d in drivers.split(",")]
    if len(driver_list) > 4:
        raise HTTPException(400, "Maximum 4 drivers for comparison")
    try:
        return await fastf1_service.get_lap_comparison(year, round, session, driver_list)
    except Exception as e:
        raise HTTPException(500, f"Error loading lap comparison: {e}")


@router.get("/driver-colors/{year}/{round}/{session}")
async def get_driver_colors(year: int, round: int, session: str):
    try:
        return await fastf1_service.get_driver_colors(year, round, session)
    except Exception as e:
        raise HTTPException(500, f"Error loading driver colors: {e}")


@router.post("/sync/{year}")
async def sync_year(year: int, request: Request):
    """On-demand sync for a specific season. Starts in background and returns immediately.
    Client should poll GET /races/{year} until races appear."""
    import asyncio
    current_year = __import__("datetime").datetime.now().year
    if year < 1950 or year > current_year:
        raise HTTPException(400, f"Year must be between 1950 and {current_year}")
    sync_manager = getattr(request.app.state, "sync_manager", None)
    if not sync_manager:
        raise HTTPException(503, "Sync manager not available")
    # Fire-and-forget — don't await; client polls /races/{year} for completion
    asyncio.create_task(sync_manager.sync_season(year))
    return {"status": "started", "year": year, "message": f"Season {year} sync started in background"}


# --- Sprint Race Endpoints (2021+) ---


@router.get("/sprint/{year}/{round}")
def get_sprint_results(year: int, round: int, db: Session = Depends(get_db)):
    """Sprint race results for sprint-weekend rounds (2021+)."""
    race = (
        db.query(models.Race)
        .filter(models.Race.year == year, models.Race.round == round)
        .first()
    )
    if not race:
        raise HTTPException(404, f"Race {year} round {round} not found")

    results = (
        db.query(models.SprintResult)
        .filter(models.SprintResult.race_id == race.id)
        .order_by(models.SprintResult.position.nullslast())
        .all()
    )
    return {
        "race": {
            "year": race.year,
            "round": race.round,
            "name": race.race_name,
            "sprint_date": race.sprint_date,
            "circuit": race.circuit.name if race.circuit else None,
        },
        "results": [
            {
                "position": r.position,
                "position_text": r.position_text,
                "driver": {
                    "id": r.driver.driver_id,
                    "code": r.driver.code,
                    "name": f"{r.driver.first_name} {r.driver.last_name}",
                },
                "constructor": r.constructor.name if r.constructor else None,
                "grid": r.grid,
                "laps": r.laps,
                "status": r.status,
                "points": r.points,
                "time": r.time_text,
                "fastest_lap_time": r.fastest_lap_time,
            }
            for r in results
        ],
    }


@router.get("/sprint-qualifying/{year}/{round}")
def get_sprint_qualifying(year: int, round: int, db: Session = Depends(get_db)):
    """Sprint Shootout / Sprint Qualifying results for sprint-weekend rounds (2021+).
    Note: Jolpica does not expose a dedicated sprint qualifying endpoint.
    This returns data only if it was synced via an alternative source."""
    race = (
        db.query(models.Race)
        .filter(models.Race.year == year, models.Race.round == round)
        .first()
    )
    if not race:
        raise HTTPException(404, f"Race {year} round {round} not found")

    results = (
        db.query(models.SprintShootoutResult)
        .filter(models.SprintShootoutResult.race_id == race.id)
        .order_by(models.SprintShootoutResult.position)
        .all()
    )
    return {
        "race": {
            "year": race.year,
            "round": race.round,
            "name": race.race_name,
        },
        "results": [
            {
                "position": r.position,
                "driver": {
                    "id": r.driver.driver_id,
                    "code": r.driver.code,
                    "name": f"{r.driver.first_name} {r.driver.last_name}",
                },
                "constructor": r.constructor.name if r.constructor else None,
                "sq1": r.sq1,
                "sq2": r.sq2,
                "sq3": r.sq3,
            }
            for r in results
        ],
    }
