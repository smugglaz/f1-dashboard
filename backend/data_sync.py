import asyncio
import logging
import os
from datetime import date, datetime, timedelta

import httpx
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend import models

logger = logging.getLogger("f1-dashboard.sync")

JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1"
RATE_DELAY = 0.5  # seconds between Jolpica requests
MAX_PER_PAGE = 100


def _qualifying_format(year: int) -> str:
    """Return the qualifying format name for display/context purposes."""
    if year < 2003:
        return "LEGACY"       # Pre-2003: aggregate/unstructured, limited data
    elif year <= 2005:
        return "ONE_LAP"      # 2003-2005: one-lap or two-stage formats
    else:
        return "KNOCKOUT"     # 2006+: Q1/Q2/Q3 knockout


class JolpicaClient:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=15.0)

    async def _fetch(self, endpoint: str, params: dict = None) -> dict:
        url = f"{JOLPICA_BASE}/{endpoint}.json"
        if params is None:
            params = {}
        params.setdefault("limit", MAX_PER_PAGE)
        resp = await self.client.get(url, params=params)
        if resp.status_code == 429:
            logger.warning("Rate limited by Jolpica, waiting 60s...")
            await asyncio.sleep(60)
            resp = await self.client.get(url, params=params)
        resp.raise_for_status()
        return resp.json().get("MRData", {})

    async def _fetch_all(self, endpoint: str) -> list:
        """Fetch all pages from a paginated Jolpica endpoint."""
        all_items = []
        offset = 0
        while True:
            data = await self._fetch(endpoint, {"limit": MAX_PER_PAGE, "offset": offset})
            table_key = None
            for key in data:
                if key.endswith("Table"):
                    table_key = key
                    break
            if not table_key:
                break
            table = data[table_key]
            list_key = None
            for key in table:
                if isinstance(table[key], list):
                    list_key = key
                    break
            if not list_key:
                break
            items = table[list_key]
            all_items.extend(items)
            total = int(data.get("total", 0))
            offset += MAX_PER_PAGE
            if offset >= total:
                break
            await asyncio.sleep(RATE_DELAY)
        return all_items

    async def get_races(self, year: int) -> list:
        data = await self._fetch(f"{year}")
        table = data.get("RaceTable", {})
        return table.get("Races", [])

    async def get_race_results(self, year: int, round_num: int) -> list:
        data = await self._fetch(f"{year}/{round_num}/results", {"limit": MAX_PER_PAGE})
        table = data.get("RaceTable", {})
        races = table.get("Races", [])
        if races:
            return races[0].get("Results", [])
        return []

    async def get_qualifying(self, year: int, round_num: int) -> list:
        data = await self._fetch(f"{year}/{round_num}/qualifying", {"limit": MAX_PER_PAGE})
        table = data.get("RaceTable", {})
        races = table.get("Races", [])
        if races:
            return races[0].get("QualifyingResults", [])
        return []

    async def get_sprint_results(self, year: int, round_num: int) -> list:
        """Fetch sprint race results. Returns empty list if no sprint this round."""
        try:
            data = await self._fetch(f"{year}/{round_num}/sprint", {"limit": MAX_PER_PAGE})
            table = data.get("RaceTable", {})
            races = table.get("Races", [])
            if races:
                return races[0].get("SprintResults", [])
        except Exception:
            pass
        return []

    async def get_driver_standings(self, year: int) -> list:
        data = await self._fetch(f"{year}/driverStandings", {"limit": MAX_PER_PAGE})
        table = data.get("StandingsTable", {})
        lists = table.get("StandingsLists", [])
        if lists:
            return lists[0]
        return {}

    async def get_constructor_standings(self, year: int) -> list:
        data = await self._fetch(f"{year}/constructorStandings", {"limit": MAX_PER_PAGE})
        table = data.get("StandingsTable", {})
        lists = table.get("StandingsLists", [])
        if lists:
            return lists[0]
        return {}

    async def get_pit_stops(self, year: int, round_num: int) -> list:
        data = await self._fetch(f"{year}/{round_num}/pitstops", {"limit": MAX_PER_PAGE})
        table = data.get("RaceTable", {})
        races = table.get("Races", [])
        if races:
            return races[0].get("PitStops", [])
        return []

    async def close(self):
        await self.client.aclose()


def _get_or_create_circuit(db: Session, circuit_data: dict) -> models.Circuit:
    cid = circuit_data.get("circuitId", "")
    circuit = db.query(models.Circuit).filter(models.Circuit.circuit_id == cid).first()
    if not circuit:
        loc = circuit_data.get("Location", {})
        circuit = models.Circuit(
            circuit_id=cid,
            name=circuit_data.get("circuitName", ""),
            country=loc.get("country", ""),
            locality=loc.get("locality", ""),
            latitude=float(loc.get("lat", 0)),
            longitude=float(loc.get("long", 0)),
        )
        db.add(circuit)
        db.flush()
    return circuit


def _get_or_create_driver(db: Session, driver_data: dict) -> models.Driver:
    did = driver_data.get("driverId", "")
    driver = db.query(models.Driver).filter(models.Driver.driver_id == did).first()
    if not driver:
        driver = models.Driver(
            driver_id=did,
            code=driver_data.get("code", ""),
            number=int(driver_data["permanentNumber"]) if driver_data.get("permanentNumber") else None,
            first_name=driver_data.get("givenName", ""),
            last_name=driver_data.get("familyName", ""),
            nationality=driver_data.get("nationality", ""),
            date_of_birth=driver_data.get("dateOfBirth", ""),
        )
        db.add(driver)
        db.flush()
    return driver


def _get_or_create_constructor(db: Session, constructor_data: dict) -> models.Constructor:
    cid = constructor_data.get("constructorId", "")
    constructor = db.query(models.Constructor).filter(models.Constructor.constructor_id == cid).first()
    if not constructor:
        constructor = models.Constructor(
            constructor_id=cid,
            name=constructor_data.get("name", ""),
            nationality=constructor_data.get("nationality", ""),
        )
        db.add(constructor)
        db.flush()
    return constructor


def _upsert_sync_status(db: Session, year: int, status: str = "completed"):
    """Write or update SyncStatus for a full season. round=0 means full season."""
    existing = db.query(models.SyncStatus).filter(
        models.SyncStatus.sync_type == "season",
        models.SyncStatus.year == year,
        models.SyncStatus.round == 0,
    ).first()
    if existing:
        existing.last_synced = datetime.now()
        existing.status = status
    else:
        db.add(models.SyncStatus(
            sync_type="season",
            year=year,
            round=0,
            status=status,
            last_synced=datetime.now(),
        ))


def _is_season_synced(db: Session, year: int, current_year: int) -> bool:
    """Return True if we can safely skip syncing this season.
    Past seasons that completed sync never need re-syncing.
    Current year is always re-synced (results change throughout the season).
    """
    if year >= current_year:
        return False
    status = db.query(models.SyncStatus).filter(
        models.SyncStatus.sync_type == "season",
        models.SyncStatus.year == year,
        models.SyncStatus.round == 0,
        models.SyncStatus.status == "completed",
    ).first()
    return status is not None


class DataSyncManager:
    def __init__(self, session_factory):
        self.session_factory = session_factory
        self.jolpica = JolpicaClient()

    def register_jobs(self, scheduler):
        from datetime import timedelta
        # One-time startup sync — skips already-completed seasons automatically
        scheduler.add_job(
            self.initial_sync,
            "date",
            run_date=datetime.now() + timedelta(seconds=5),
            id="initial_sync",
            replace_existing=True,
            misfire_grace_time=30,
        )
        # Periodic current season sync (every 30 min)
        scheduler.add_job(
            self.sync_current_season,
            "interval",
            minutes=60,
            id="current_season_sync",
            replace_existing=True,
        )

    async def initial_sync(self):
        """Sync seasons from SYNC_FROM_YEAR to current.

        Already-completed past seasons are skipped in milliseconds (DB check only).
        Set SYNC_FROM_YEAR=1950 in .env to build the full archive (takes hours on
        first run, then instant on subsequent restarts due to skip logic).
        Default: last 3 seasons.
        """
        logger.info("Starting initial data sync...")
        current_year = datetime.now().year
        sync_from = int(os.getenv("SYNC_FROM_YEAR", str(current_year - 2)))

        # Priority: current year first, then backwards through history
        years = [current_year] + list(range(current_year - 1, sync_from - 1, -1))
        total = len(years)
        logger.info(f"Will sync {total} seasons ({sync_from}–{current_year}). "
                    f"Already-completed seasons are skipped automatically.")

        for i, year in enumerate(years, 1):
            try:
                await self.sync_season(year)
                await asyncio.sleep(RATE_DELAY)
            except Exception as e:
                logger.error(f"Error syncing {year}: {e}")

        logger.info("Initial sync complete")

    async def sync_current_season(self):
        """Sync current season data (called periodically)."""
        current_year = datetime.now().year
        try:
            await self.sync_season(current_year, force=True)
        except Exception as e:
            logger.error(f"Error syncing current season: {e}")

    async def sync_season(self, year: int, force: bool = False):
        """Sync all data for a given season.

        - Skips past seasons already marked 'completed' in SyncStatus (unless force=True).
        - Sets qualifying_format on each race based on the era.
        - Detects and stores sprint race results for 2021+ rounds.
        - Writes SyncStatus on completion so subsequent calls skip instantly.
        """
        current_year = datetime.now().year

        # Skip check for already-synced past seasons
        if not force:
            db = self.session_factory()
            try:
                if _is_season_synced(db, year, current_year):
                    logger.debug(f"Season {year} already synced, skipping")
                    return
            finally:
                db.close()

        logger.info(f"Syncing season {year}...")
        db = self.session_factory()
        try:
            # 1. Sync race calendar
            races_data = await self.jolpica.get_races(year)
            await asyncio.sleep(RATE_DELAY)

            qf = _qualifying_format(year)

            for race_data in races_data:
                circuit = _get_or_create_circuit(db, race_data.get("Circuit", {}))
                round_num = int(race_data.get("round", 0))

                race = db.query(models.Race).filter(
                    models.Race.year == year,
                    models.Race.round == round_num,
                ).first()
                if not race:
                    race = models.Race(
                        year=year,
                        round=round_num,
                        race_name=race_data.get("raceName", ""),
                        circuit_id=circuit.id,
                        date=race_data.get("date", ""),
                        time=race_data.get("time", ""),
                        url=race_data.get("url", ""),
                        qualifying_format=qf,
                        has_sprint=False,
                    )
                    db.add(race)
                else:
                    race.race_name = race_data.get("raceName", race.race_name)
                    race.date = race_data.get("date", race.date)
                    race.time = race_data.get("time", race.time)
                    race.qualifying_format = qf
                db.flush()

                # Skip future rounds — no results exist yet
                race_date_str = race_data.get("date", "")
                if race_date_str > date.today().isoformat():
                    logger.debug(f"Skipping future round {year} R{round_num} ({race_date_str})")
                    continue

                # 2. Sync race results
                try:
                    results = await self.jolpica.get_race_results(year, round_num)
                    await asyncio.sleep(RATE_DELAY)
                    for r in results:
                        driver = _get_or_create_driver(db, r.get("Driver", {}))
                        constructor = _get_or_create_constructor(db, r.get("Constructor", {}))

                        existing = db.query(models.RaceResult).filter(
                            models.RaceResult.race_id == race.id,
                            models.RaceResult.driver_id == driver.id,
                        ).first()

                        pos = r.get("position")
                        pos_int = int(pos) if pos and str(pos).isdigit() else None
                        time_data = r.get("Time", {})
                        fl = r.get("FastestLap", {})

                        values = dict(
                            grid=int(r.get("grid", 0)),
                            position=pos_int,
                            position_text=r.get("positionText", ""),
                            points=float(r.get("points", 0)),
                            laps=int(r.get("laps", 0)),
                            status=r.get("status", ""),
                            time_text=time_data.get("time", ""),
                            time_millis=int(time_data["millis"]) if time_data.get("millis") else None,
                            fastest_lap_rank=int(fl.get("rank", 0)) if fl.get("rank") else None,
                            fastest_lap_time=fl.get("Time", {}).get("time", ""),
                            fastest_lap_speed=fl.get("AverageSpeed", {}).get("speed", ""),
                        )

                        if existing:
                            for k, v in values.items():
                                setattr(existing, k, v)
                        else:
                            db.add(models.RaceResult(
                                race_id=race.id,
                                driver_id=driver.id,
                                constructor_id=constructor.id,
                                **values,
                            ))
                except Exception as e:
                    logger.debug(f"No results for {year} R{round_num}: {e}")

                # 3. Sync qualifying (GP qualifying — sets Sunday grid)
                try:
                    quals = await self.jolpica.get_qualifying(year, round_num)
                    await asyncio.sleep(RATE_DELAY)
                    for q in quals:
                        driver = _get_or_create_driver(db, q.get("Driver", {}))
                        constructor = _get_or_create_constructor(db, q.get("Constructor", {}))

                        existing = db.query(models.QualifyingResult).filter(
                            models.QualifyingResult.race_id == race.id,
                            models.QualifyingResult.driver_id == driver.id,
                        ).first()

                        values = dict(
                            position=int(q.get("position", 0)),
                            q1=q.get("Q1", ""),
                            q2=q.get("Q2", ""),
                            q3=q.get("Q3", ""),
                        )

                        if existing:
                            for k, v in values.items():
                                setattr(existing, k, v)
                        else:
                            db.add(models.QualifyingResult(
                                race_id=race.id,
                                driver_id=driver.id,
                                constructor_id=constructor.id,
                                **values,
                            ))
                except Exception as e:
                    logger.debug(f"No qualifying for {year} R{round_num}: {e}")

                # 4. Sync pit stops (available 2011+)
                try:
                    stops = await self.jolpica.get_pit_stops(year, round_num)
                    await asyncio.sleep(RATE_DELAY)
                    for s in stops:
                        did = s.get("driverId", "")
                        driver = db.query(models.Driver).filter(models.Driver.driver_id == did).first()
                        if not driver:
                            continue
                        stop_num = int(s.get("stop", 0))

                        existing = db.query(models.PitStop).filter(
                            models.PitStop.race_id == race.id,
                            models.PitStop.driver_id == driver.id,
                            models.PitStop.stop_number == stop_num,
                        ).first()

                        if not existing:
                            db.add(models.PitStop(
                                race_id=race.id,
                                driver_id=driver.id,
                                stop_number=stop_num,
                                lap=int(s.get("lap", 0)),
                                time_of_day=s.get("time", ""),
                                duration=s.get("duration", ""),
                            ))
                except Exception as e:
                    logger.debug(f"No pit stops for {year} R{round_num}: {e}")

                # 5. Sync sprint race results (2021+)
                # We only query for sprint data in years where it exists.
                # An empty response means this is a non-sprint round — handled silently.
                if year >= 2021:
                    try:
                        sprint_results = await self.jolpica.get_sprint_results(year, round_num)
                        await asyncio.sleep(RATE_DELAY)
                        if sprint_results:
                            race.has_sprint = True
                            if race_data.get("SprintDate"):
                                race.sprint_date = race_data["SprintDate"]
                            if race_data.get("SprintTime"):
                                race.sprint_time = race_data["SprintTime"]

                            for sr in sprint_results:
                                driver = _get_or_create_driver(db, sr.get("Driver", {}))
                                constructor = _get_or_create_constructor(db, sr.get("Constructor", {}))

                                existing = db.query(models.SprintResult).filter(
                                    models.SprintResult.race_id == race.id,
                                    models.SprintResult.driver_id == driver.id,
                                ).first()

                                pos = sr.get("position")
                                pos_int = int(pos) if pos and str(pos).isdigit() else None
                                time_data = sr.get("Time", {})
                                fl = sr.get("FastestLap", {})

                                values = dict(
                                    grid=int(sr.get("grid", 0)),
                                    position=pos_int,
                                    position_text=sr.get("positionText", ""),
                                    points=float(sr.get("points", 0)),
                                    laps=int(sr.get("laps", 0)),
                                    status=sr.get("status", ""),
                                    time_text=time_data.get("time", ""),
                                    time_millis=int(time_data["millis"]) if time_data.get("millis") else None,
                                    fastest_lap_time=fl.get("Time", {}).get("time", ""),
                                )

                                if existing:
                                    for k, v in values.items():
                                        setattr(existing, k, v)
                                else:
                                    db.add(models.SprintResult(
                                        race_id=race.id,
                                        driver_id=driver.id,
                                        constructor_id=constructor.id,
                                        **values,
                                    ))
                    except Exception as e:
                        logger.debug(f"No sprint data for {year} R{round_num}: {e}")

            db.flush()

            # 6. Sync driver standings
            try:
                ds_data = await self.jolpica.get_driver_standings(year)
                await asyncio.sleep(RATE_DELAY)
                if ds_data:
                    round_num = int(ds_data.get("round", 0))
                    for s in ds_data.get("DriverStandings", []):
                        driver = _get_or_create_driver(db, s.get("Driver", {}))
                        existing = db.query(models.DriverStanding).filter(
                            models.DriverStanding.year == year,
                            models.DriverStanding.round == round_num,
                            models.DriverStanding.driver_id == driver.id,
                        ).first()
                        values = dict(
                            position=int(s.get("position", 0)),
                            points=float(s.get("points", 0)),
                            wins=int(s.get("wins", 0)),
                        )
                        if existing:
                            for k, v in values.items():
                                setattr(existing, k, v)
                        else:
                            db.add(models.DriverStanding(
                                year=year, round=round_num,
                                driver_id=driver.id, **values,
                            ))
            except Exception as e:
                logger.error(f"Error syncing driver standings {year}: {e}")

            # 7. Sync constructor standings (available from 1958)
            try:
                cs_data = await self.jolpica.get_constructor_standings(year)
                await asyncio.sleep(RATE_DELAY)
                if cs_data:
                    round_num = int(cs_data.get("round", 0))
                    for s in cs_data.get("ConstructorStandings", []):
                        constructor = _get_or_create_constructor(db, s.get("Constructor", {}))
                        existing = db.query(models.ConstructorStanding).filter(
                            models.ConstructorStanding.year == year,
                            models.ConstructorStanding.round == round_num,
                            models.ConstructorStanding.constructor_id == constructor.id,
                        ).first()
                        values = dict(
                            position=int(s.get("position", 0)),
                            points=float(s.get("points", 0)),
                            wins=int(s.get("wins", 0)),
                        )
                        if existing:
                            for k, v in values.items():
                                setattr(existing, k, v)
                        else:
                            db.add(models.ConstructorStanding(
                                year=year, round=round_num,
                                constructor_id=constructor.id, **values,
                            ))
            except Exception as e:
                logger.error(f"Error syncing constructor standings {year}: {e}")

            # Mark season as fully synced — future restarts will skip this year instantly
            _upsert_sync_status(db, year, "completed")
            db.commit()
            logger.info(f"Season {year} sync complete")

        except Exception as e:
            db.rollback()
            try:
                _upsert_sync_status(db, year, "failed")
                db.commit()
            except Exception:
                pass
            logger.error(f"Error syncing season {year}: {e}")
            raise
        finally:
            db.close()
