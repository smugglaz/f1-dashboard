from collections import defaultdict

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
