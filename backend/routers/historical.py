from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func
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

    standings = query.order_by(
        models.DriverStanding.points.desc(),
        models.DriverStanding.wins.desc(),
        models.DriverStanding.position,
    ).all()

    # Re-assign positions based on sorted order (fixes position=0 from API for unclassified drivers)
    for idx, s in enumerate(standings, 1):
        s._display_position = idx

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
                "position": s._display_position,
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

    standings = query.order_by(
        models.ConstructorStanding.points.desc(),
        models.ConstructorStanding.wins.desc(),
        models.ConstructorStanding.position,
    ).all()

    for idx, s in enumerate(standings, 1):
        s._display_position = idx

    return {
        "year": year,
        "round": standings[0].round if standings else None,
        "standings": [
            {
                "position": s._display_position,
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


# --- Advanced Analytics Endpoints ---


@router.get("/standings/drivers/{year}/progression")
def get_driver_standings_progression(year: int, db: Session = Depends(get_db)):
    """Round-by-round championship points for line chart visualization."""
    standings = (
        db.query(models.DriverStanding)
        .filter(models.DriverStanding.year == year)
        .order_by(models.DriverStanding.round, models.DriverStanding.position)
        .all()
    )
    if not standings:
        return {"year": year, "rounds": []}

    races = (
        db.query(models.Race)
        .filter(models.Race.year == year)
        .order_by(models.Race.round)
        .all()
    )
    race_name_map = {r.round: r.race_name for r in races}

    # Build constructor map from latest race results
    latest_results = (
        db.query(models.RaceResult)
        .join(models.Race, models.RaceResult.race_id == models.Race.id)
        .filter(models.Race.year == year)
        .order_by(models.Race.round.desc())
        .all()
    )
    constructor_map = {}
    for rr in latest_results:
        did = rr.driver_id
        if did not in constructor_map and rr.constructor:
            constructor_map[did] = rr.constructor.name

    rounds_data = defaultdict(list)
    for s in standings:
        rounds_data[s.round].append({
            "code": s.driver.code,
            "name": f"{s.driver.first_name} {s.driver.last_name}",
            "points": s.points,
            "position": s.position,
            "constructor": constructor_map.get(s.driver_id, ""),
        })

    return {
        "year": year,
        "rounds": [
            {
                "round": rnd,
                "round_name": race_name_map.get(rnd, f"Round {rnd}"),
                "drivers": drivers,
            }
            for rnd, drivers in sorted(rounds_data.items())
        ],
    }


@router.get("/teammates/{year}")
def get_teammate_comparison(year: int, db: Session = Depends(get_db)):
    """Head-to-head teammate stats for qualifying and race finishes."""
    race_results = (
        db.query(models.RaceResult)
        .join(models.Race, models.RaceResult.race_id == models.Race.id)
        .filter(models.Race.year == year)
        .order_by(models.Race.round)
        .all()
    )
    qual_results = (
        db.query(models.QualifyingResult)
        .join(models.Race, models.QualifyingResult.race_id == models.Race.id)
        .filter(models.Race.year == year)
        .order_by(models.Race.round)
        .all()
    )
    max_round = (
        db.query(models.DriverStanding.round)
        .filter(models.DriverStanding.year == year)
        .order_by(models.DriverStanding.round.desc())
        .first()
    )
    standings_map = {}
    if max_round:
        for s in (
            db.query(models.DriverStanding)
            .filter(models.DriverStanding.year == year, models.DriverStanding.round == max_round[0])
            .all()
        ):
            standings_map[s.driver_id] = s.points

    constructor_race = defaultdict(lambda: defaultdict(dict))
    driver_info = {}
    constructor_names = {}
    for rr in race_results:
        cid = rr.constructor_id
        did = rr.driver_id
        if cid not in constructor_names and rr.constructor:
            constructor_names[cid] = rr.constructor.name
        if did not in driver_info and rr.driver:
            driver_info[did] = {
                "id": rr.driver.driver_id,
                "code": rr.driver.code,
                "name": f"{rr.driver.first_name} {rr.driver.last_name}",
            }
        constructor_race[cid][rr.race_id][did] = {
            "position": rr.position,
            "grid": rr.grid,
            "status": rr.status,
        }

    constructor_qual = defaultdict(lambda: defaultdict(dict))
    for qr in qual_results:
        cid = qr.constructor_id
        did = qr.driver_id
        if did not in driver_info and qr.driver:
            driver_info[did] = {
                "id": qr.driver.driver_id,
                "code": qr.driver.code,
                "name": f"{qr.driver.first_name} {qr.driver.last_name}",
            }
        constructor_qual[cid][qr.race_id][did] = qr.position

    comparisons = []
    for cid in constructor_race:
        all_drivers = set()
        for race_id, drivers in constructor_race[cid].items():
            all_drivers.update(drivers.keys())
        driver_list = sorted(all_drivers)
        if len(driver_list) < 2:
            continue

        race_counts = {did: 0 for did in driver_list}
        for race_id, drivers in constructor_race[cid].items():
            for did in drivers:
                race_counts[did] += 1
        top_two = sorted(driver_list, key=lambda d: race_counts[d], reverse=True)[:2]
        d1, d2 = top_two

        q_wins = {d1: 0, d2: 0}
        r_wins = {d1: 0, d2: 0}
        finishes = {d1: [], d2: []}
        grids = {d1: [], d2: []}
        q_rounds = 0
        r_rounds = 0

        for race_id, drivers in constructor_race[cid].items():
            if d1 in drivers and d2 in drivers:
                p1 = drivers[d1]["position"]
                p2 = drivers[d2]["position"]
                g1 = drivers[d1]["grid"]
                g2 = drivers[d2]["grid"]
                if p1 is not None and p2 is not None:
                    r_rounds += 1
                    if p1 < p2:
                        r_wins[d1] += 1
                    elif p2 < p1:
                        r_wins[d2] += 1
                if p1 is not None:
                    finishes[d1].append(p1)
                if p2 is not None:
                    finishes[d2].append(p2)
                if g1:
                    grids[d1].append(g1)
                if g2:
                    grids[d2].append(g2)

        for race_id, drivers in constructor_qual[cid].items():
            if d1 in drivers and d2 in drivers:
                q_rounds += 1
                if drivers[d1] < drivers[d2]:
                    q_wins[d1] += 1
                elif drivers[d2] < drivers[d1]:
                    q_wins[d2] += 1

        def build_driver_stats(did):
            avg_f = round(sum(finishes[did]) / len(finishes[did]), 1) if finishes[did] else None
            avg_g = round(sum(grids[did]) / len(grids[did]), 1) if grids[did] else None
            return {
                **driver_info.get(did, {"id": "", "code": "???", "name": "Unknown"}),
                "qualifying_wins": q_wins.get(did, 0),
                "race_wins": r_wins.get(did, 0),
                "points": standings_map.get(did, 0),
                "avg_finish": avg_f,
                "avg_grid": avg_g,
            }

        comparisons.append({
            "constructor": constructor_names.get(cid, "Unknown"),
            "drivers": [build_driver_stats(d1), build_driver_stats(d2)],
            "total_qualifying_rounds": q_rounds,
            "total_race_rounds": r_rounds,
        })

    comparisons.sort(
        key=lambda c: sum(d["points"] for d in c["drivers"]),
        reverse=True,
    )
    return {"year": year, "comparisons": comparisons}


@router.get("/driver-stats/{year}/{driver_id}")
def get_driver_season_stats(year: int, driver_id: str, db: Session = Depends(get_db)):
    """Aggregated season statistics for a single driver."""
    driver = db.query(models.Driver).filter(models.Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(404, f"Driver {driver_id} not found")

    results = (
        db.query(models.RaceResult)
        .join(models.Race, models.RaceResult.race_id == models.Race.id)
        .filter(models.Race.year == year, models.RaceResult.driver_id == driver.id)
        .all()
    )
    if not results:
        raise HTTPException(404, f"No results for {driver_id} in {year}")

    quals = (
        db.query(models.QualifyingResult)
        .join(models.Race, models.QualifyingResult.race_id == models.Race.id)
        .filter(models.Race.year == year, models.QualifyingResult.driver_id == driver.id)
        .all()
    )

    constructor_name = ""
    for r in results:
        if r.constructor:
            constructor_name = r.constructor.name
            break

    positions = [r.position for r in results if r.position is not None]
    grids_list = [r.grid for r in results if r.grid and r.grid > 0]
    qual_positions = [q.position for q in quals if q.position]

    wins = sum(1 for p in positions if p == 1)
    podiums = sum(1 for p in positions if p <= 3)
    points_finishes = sum(1 for p in positions if p <= 10)
    total_points = sum(r.points for r in results if r.points)
    dnfs = sum(1 for r in results if r.status and r.status != "Finished" and not r.status.startswith("+"))
    fastest_laps = sum(1 for r in results if r.fastest_lap_rank == 1)

    return {
        "year": year,
        "driver": {
            "id": driver.driver_id,
            "code": driver.code,
            "name": f"{driver.first_name} {driver.last_name}",
        },
        "constructor": constructor_name,
        "stats": {
            "races": len(results),
            "wins": wins,
            "podiums": podiums,
            "points_finishes": points_finishes,
            "dnfs": dnfs,
            "total_points": total_points,
            "points_per_race": round(total_points / len(results), 2) if results else 0,
            "avg_grid": round(sum(grids_list) / len(grids_list), 1) if grids_list else None,
            "avg_finish": round(sum(positions) / len(positions), 1) if positions else None,
            "best_finish": min(positions) if positions else None,
            "worst_finish": max(positions) if positions else None,
            "poles": sum(1 for q in qual_positions if q == 1),
            "avg_qualifying": round(sum(qual_positions) / len(qual_positions), 1) if qual_positions else None,
            "fastest_laps": fastest_laps,
        },
    }


@router.get("/lap-positions/{year}/{round}")
def get_lap_positions(year: int, round: int, db: Session = Depends(get_db)):
    """Lap-by-lap position data for position chart visualization."""
    race = (
        db.query(models.Race)
        .filter(models.Race.year == year, models.Race.round == round)
        .first()
    )
    if not race:
        raise HTTPException(404, f"Race {year} round {round} not found")

    lap_times = (
        db.query(models.LapTime)
        .filter(models.LapTime.race_id == race.id)
        .order_by(models.LapTime.lap_number)
        .all()
    )
    if not lap_times:
        return {"race": {"year": year, "round": round, "name": race.race_name}, "laps": []}

    driver_ids = set(lt.driver_id for lt in lap_times)
    drivers = db.query(models.Driver).filter(models.Driver.id.in_(driver_ids)).all()
    driver_map = {d.id: d.code for d in drivers}

    race_results = (
        db.query(models.RaceResult)
        .filter(models.RaceResult.race_id == race.id)
        .all()
    )
    driver_constructor = {}
    for rr in race_results:
        if rr.driver and rr.constructor:
            driver_constructor[rr.driver_id] = rr.constructor.name

    laps_data = defaultdict(list)
    for lt in lap_times:
        code = driver_map.get(lt.driver_id, "???")
        laps_data[lt.lap_number].append({
            "code": code,
            "position": lt.position,
            "constructor": driver_constructor.get(lt.driver_id, ""),
        })

    return {
        "race": {"year": year, "round": round, "name": race.race_name},
        "laps": [
            {"lap": lap, "drivers": drivers}
            for lap, drivers in sorted(laps_data.items())
        ],
    }


# --- V2.0 Dashboard & Race Analysis Endpoints ---


def _get_race_or_404(year: int, round_num: int, db: Session):
    """Shared helper to fetch a Race or raise 404."""
    race = (
        db.query(models.Race)
        .filter(models.Race.year == year, models.Race.round == round_num)
        .first()
    )
    if not race:
        raise HTTPException(404, f"Race {year} round {round_num} not found")
    return race


@router.get("/race-summary/{year}/{round_num}")
def get_race_summary(year: int, round_num: int, db: Session = Depends(get_db)):
    """Aggregated race summary: winner, margin, safety cars, weather, DNFs, pit count."""
    race = _get_race_or_404(year, round_num, db)

    results = (
        db.query(models.RaceResult)
        .filter(models.RaceResult.race_id == race.id)
        .order_by(models.RaceResult.position.nullslast())
        .all()
    )

    winner = None
    second = None
    for r in results:
        if r.position == 1:
            winner = r
        elif r.position == 2:
            second = r

    dnfs = [
        {
            "driver": r.driver.code if r.driver else "???",
            "status": r.status,
        }
        for r in results
        if r.status and r.status != "Finished" and not r.status.startswith("+")
    ]

    fastest_lap_holder = None
    for r in results:
        if r.fastest_lap_rank == 1:
            fastest_lap_holder = {
                "code": r.driver.code if r.driver else None,
                "time": r.fastest_lap_time,
            }
            break

    # Race control: count safety cars, VSCs, red flags
    rc_msgs = (
        db.query(models.RaceControlMessage)
        .filter(
            models.RaceControlMessage.race_id == race.id,
            models.RaceControlMessage.session_type == "Race",
        )
        .all()
    )
    sc_count = sum(1 for m in rc_msgs if m.flag == "SC" or (m.category == "SafetyCar" and "SAFETY CAR DEPLOYED" in (m.message or "").upper()))
    vsc_count = sum(1 for m in rc_msgs if m.flag == "VSC" or (m.category == "SafetyCar" and "VIRTUAL" in (m.message or "").upper()))
    red_flag_count = sum(1 for m in rc_msgs if m.flag == "RED")

    # Weather summary
    weather = (
        db.query(models.SessionWeather)
        .filter(
            models.SessionWeather.race_id == race.id,
            models.SessionWeather.session_type == "Race",
        )
        .all()
    )
    had_rain = any(w.rainfall for w in weather) if weather else False
    avg_air_temp = round(sum(w.air_temp for w in weather if w.air_temp) / max(1, sum(1 for w in weather if w.air_temp)), 1) if weather else None
    avg_track_temp = round(sum(w.track_temp for w in weather if w.track_temp) / max(1, sum(1 for w in weather if w.track_temp)), 1) if weather else None

    # Pit stop count
    pit_count = db.query(models.PitStop).filter(models.PitStop.race_id == race.id).count()

    return {
        "race": {
            "year": race.year,
            "round": race.round,
            "name": race.race_name,
            "date": race.date,
            "circuit": race.circuit.name if race.circuit else None,
        },
        "winner": {
            "code": winner.driver.code if winner and winner.driver else None,
            "name": f"{winner.driver.first_name} {winner.driver.last_name}" if winner and winner.driver else None,
            "constructor": winner.constructor.name if winner and winner.constructor else None,
            "grid": winner.grid,
            "laps": winner.laps,
        } if winner else None,
        "margin": winner.time_text if winner else None,
        "second": {
            "code": second.driver.code if second and second.driver else None,
            "name": f"{second.driver.first_name} {second.driver.last_name}" if second and second.driver else None,
            "time": second.time_text,
        } if second else None,
        "fastest_lap": fastest_lap_holder,
        "safety_cars": sc_count,
        "virtual_safety_cars": vsc_count,
        "red_flags": red_flag_count,
        "dnfs": dnfs,
        "total_pit_stops": pit_count,
        "weather": {
            "rain": had_rain,
            "avg_air_temp": avg_air_temp,
            "avg_track_temp": avg_track_temp,
        },
        "has_race_control_data": len(rc_msgs) > 0,
        "has_weather_data": len(weather) > 0,
    }


@router.get("/stints/{year}/{round_num}")
def get_stints(year: int, round_num: int, db: Session = Depends(get_db)):
    """Per-driver stint list for strategy timeline visualization."""
    race = _get_race_or_404(year, round_num, db)

    stints = (
        db.query(models.Stint)
        .filter(
            models.Stint.race_id == race.id,
            models.Stint.session_type == "Race",
        )
        .order_by(models.Stint.driver_id, models.Stint.stint_number)
        .all()
    )

    # Get finishing order for sorting
    results = (
        db.query(models.RaceResult)
        .filter(models.RaceResult.race_id == race.id)
        .all()
    )
    finish_order = {}
    driver_constructors = {}
    for r in results:
        if r.driver:
            finish_order[r.driver_id] = r.position or 999
            if r.constructor:
                driver_constructors[r.driver_id] = r.constructor.name

    drivers_data = defaultdict(list)
    driver_codes = {}
    for s in stints:
        if s.driver:
            driver_codes[s.driver_id] = s.driver.code
        drivers_data[s.driver_id].append({
            "stint": s.stint_number,
            "compound": s.compound,
            "lap_start": s.lap_start,
            "lap_end": s.lap_end,
            "tyre_age_at_start": s.tyre_age_at_start,
            "fresh": s.fresh_tyre,
        })

    sorted_drivers = sorted(drivers_data.keys(), key=lambda d: finish_order.get(d, 999))

    return {
        "race": {"year": race.year, "round": race.round, "name": race.race_name},
        "total_laps": max((r.laps or 0) for r in results) if results else 0,
        "drivers": [
            {
                "code": driver_codes.get(did, "???"),
                "position": finish_order.get(did),
                "constructor": driver_constructors.get(did, ""),
                "stints": drivers_data[did],
            }
            for did in sorted_drivers
        ],
    }


@router.get("/sectors/{year}/{round_num}/{session}")
def get_sectors(year: int, round_num: int, session: str, db: Session = Depends(get_db)):
    """Sector times, speed traps, and theoretical best lap per driver."""
    race = _get_race_or_404(year, round_num, db)

    laps = (
        db.query(models.FastF1Lap)
        .filter(
            models.FastF1Lap.race_id == race.id,
            models.FastF1Lap.session_type == session,
            models.FastF1Lap.is_accurate == True,
        )
        .all()
    )
    if not laps:
        return {"race": {"year": year, "round": round_num, "name": race.race_name}, "drivers": [], "session_bests": {}}

    driver_map = {}
    driver_laps = defaultdict(list)
    for lap in laps:
        if lap.driver:
            driver_map[lap.driver_id] = lap.driver.code
        driver_laps[lap.driver_id].append(lap)

    # Session bests
    all_s1 = [l.sector1_ms for l in laps if l.sector1_ms]
    all_s2 = [l.sector2_ms for l in laps if l.sector2_ms]
    all_s3 = [l.sector3_ms for l in laps if l.sector3_ms]
    session_best_s1 = min(all_s1) if all_s1 else None
    session_best_s2 = min(all_s2) if all_s2 else None
    session_best_s3 = min(all_s3) if all_s3 else None
    theoretical_best = None
    if session_best_s1 and session_best_s2 and session_best_s3:
        theoretical_best = session_best_s1 + session_best_s2 + session_best_s3

    drivers_out = []
    for did in sorted(driver_laps.keys(), key=lambda d: driver_map.get(d, "ZZZ")):
        dl = driver_laps[did]
        best_s1 = min((l.sector1_ms for l in dl if l.sector1_ms), default=None)
        best_s2 = min((l.sector2_ms for l in dl if l.sector2_ms), default=None)
        best_s3 = min((l.sector3_ms for l in dl if l.sector3_ms), default=None)
        best_lap = min((l.lap_time_ms for l in dl if l.lap_time_ms), default=None)
        personal_theoretical = None
        if best_s1 and best_s2 and best_s3:
            personal_theoretical = best_s1 + best_s2 + best_s3

        speeds = [l for l in dl if l.speed_st]
        max_speed_st = max((l.speed_st for l in speeds), default=None) if speeds else None
        max_speed_fl = max((l.speed_fl for l in dl if l.speed_fl), default=None)

        drivers_out.append({
            "code": driver_map.get(did, "???"),
            "best_s1_ms": best_s1,
            "best_s2_ms": best_s2,
            "best_s3_ms": best_s3,
            "best_lap_ms": best_lap,
            "theoretical_best_ms": personal_theoretical,
            "is_session_best_s1": best_s1 == session_best_s1,
            "is_session_best_s2": best_s2 == session_best_s2,
            "is_session_best_s3": best_s3 == session_best_s3,
            "max_speed_trap": max_speed_st,
            "max_finish_speed": max_speed_fl,
        })

    # Sort by best lap time
    drivers_out.sort(key=lambda d: d["best_lap_ms"] or 999999999)

    return {
        "race": {"year": year, "round": round_num, "name": race.race_name},
        "session": session,
        "session_bests": {
            "s1_ms": session_best_s1,
            "s2_ms": session_best_s2,
            "s3_ms": session_best_s3,
            "theoretical_best_ms": theoretical_best,
        },
        "drivers": drivers_out,
    }


@router.get("/weather/{year}/{round_num}/{session}")
def get_weather(year: int, round_num: int, session: str, db: Session = Depends(get_db)):
    """Weather timeline for a session, downsampled for charting."""
    race = _get_race_or_404(year, round_num, db)

    samples = (
        db.query(models.SessionWeather)
        .filter(
            models.SessionWeather.race_id == race.id,
            models.SessionWeather.session_type == session,
        )
        .order_by(models.SessionWeather.timestamp_s)
        .all()
    )

    # Downsample to ~120 points max for chart performance
    max_points = 120
    step = max(1, len(samples) // max_points)
    downsampled = samples[::step]

    return {
        "race": {"year": year, "round": round_num, "name": race.race_name},
        "session": session,
        "total_samples": len(samples),
        "samples": [
            {
                "time_s": s.timestamp_s,
                "air_temp": s.air_temp,
                "track_temp": s.track_temp,
                "humidity": s.humidity,
                "pressure": s.pressure,
                "rainfall": s.rainfall,
                "wind_direction": s.wind_direction,
                "wind_speed": s.wind_speed,
            }
            for s in downsampled
        ],
    }


@router.get("/race-control/{year}/{round_num}/{session}")
def get_race_control(year: int, round_num: int, session: str, db: Session = Depends(get_db)):
    """Chronological race control messages: flags, safety cars, penalties."""
    race = _get_race_or_404(year, round_num, db)

    messages = (
        db.query(models.RaceControlMessage)
        .filter(
            models.RaceControlMessage.race_id == race.id,
            models.RaceControlMessage.session_type == session,
        )
        .order_by(models.RaceControlMessage.timestamp_s)
        .all()
    )

    return {
        "race": {"year": year, "round": round_num, "name": race.race_name},
        "session": session,
        "messages": [
            {
                "time_s": m.timestamp_s,
                "category": m.category,
                "flag": m.flag,
                "message": m.message,
                "driver": m.driver.code if m.driver else None,
                "scope": m.scope,
                "sector": m.sector,
                "lap": m.lap_number,
            }
            for m in messages
        ],
    }


@router.get("/tyre-performance/{year}/{round_num}")
def get_tyre_performance(year: int, round_num: int, db: Session = Depends(get_db)):
    """Average lap time by compound x tyre_life for degradation curves.
    Filters: Race session, is_accurate, green flag (track_status=1), no pit laps."""
    race = _get_race_or_404(year, round_num, db)

    laps = (
        db.query(models.FastF1Lap)
        .filter(
            models.FastF1Lap.race_id == race.id,
            models.FastF1Lap.session_type == "Race",
            models.FastF1Lap.is_accurate == True,
            models.FastF1Lap.is_pit_in == False,
            models.FastF1Lap.is_pit_out == False,
            models.FastF1Lap.lap_time_ms != None,
            models.FastF1Lap.compound != None,
            models.FastF1Lap.tyre_life != None,
        )
        .all()
    )

    # Filter green-flag laps (track_status '1' or None meaning green)
    green_laps = [l for l in laps if l.track_status in (None, '', '1')]

    # Group by compound × tyre_life
    compound_data = defaultdict(lambda: defaultdict(list))
    for lap in green_laps:
        compound_data[lap.compound][lap.tyre_life].append(lap.lap_time_ms)

    curves = {}
    for compound, life_map in compound_data.items():
        points = []
        for tyre_life in sorted(life_map.keys()):
            times = life_map[tyre_life]
            avg = round(sum(times) / len(times))
            points.append({
                "tyre_life": tyre_life,
                "avg_lap_ms": avg,
                "sample_count": len(times),
            })
        curves[compound] = points

    return {
        "race": {"year": year, "round": round_num, "name": race.race_name},
        "total_laps_analyzed": len(green_laps),
        "compounds": curves,
    }


@router.get("/circuit-info/{year}/{round_num}")
def get_circuit_info(year: int, round_num: int, db: Session = Depends(get_db)):
    """Circuit metadata + full session schedule."""
    race = _get_race_or_404(year, round_num, db)
    circuit = race.circuit

    schedule = []
    session_fields = [
        ("FP1", race.fp1_date, race.fp1_time),
        ("FP2", race.fp2_date, race.fp2_time),
        ("FP3", race.fp3_date, race.fp3_time),
        ("Qualifying", race.qualifying_date, race.qualifying_time),
        ("Race", race.date, race.time),
    ]
    if race.has_sprint:
        schedule.append({"session": "Sprint Qualifying", "date": race.sprint_qualifying_date, "time": race.sprint_qualifying_time})
        schedule.append({"session": "Sprint", "date": race.sprint_date, "time": race.sprint_time})

    for name, date, time in session_fields:
        if date:
            schedule.append({"session": name, "date": date, "time": time})

    # Sort schedule by date+time
    schedule.sort(key=lambda s: (s.get("date") or "", s.get("time") or ""))

    return {
        "race": {
            "year": race.year,
            "round": race.round,
            "name": race.race_name,
            "date": race.date,
            "has_sprint": bool(race.has_sprint),
        },
        "circuit": {
            "name": circuit.name if circuit else None,
            "country": circuit.country if circuit else None,
            "locality": circuit.locality if circuit else None,
            "latitude": circuit.latitude if circuit else None,
            "longitude": circuit.longitude if circuit else None,
            "track_length_km": circuit.track_length_km if circuit else None,
            "num_corners": circuit.num_corners if circuit else None,
            "altitude": circuit.altitude if circuit else None,
        } if circuit else None,
        "schedule": schedule,
    }
