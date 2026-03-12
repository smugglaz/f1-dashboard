import asyncio
import logging
from datetime import datetime
from typing import Optional

import httpx
from fastapi import WebSocket
from sqlalchemy.orm import Session

from backend import models

logger = logging.getLogger("f1-dashboard.live")

OPENF1_BASE = "https://api.openf1.org/v1"
POLL_INTERVAL = 10  # seconds


class OpenF1Client:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10.0)
        self._semaphore = asyncio.Semaphore(3)

    async def _get(self, endpoint: str, params: dict = None) -> list | dict:
        async with self._semaphore:
            url = f"{OPENF1_BASE}/{endpoint}"
            resp = await self.client.get(url, params=params or {})
            if resp.status_code == 429:
                logger.warning("OpenF1 rate limited, waiting 5s...")
                await asyncio.sleep(5)
                resp = await self.client.get(url, params=params or {})
            resp.raise_for_status()
            return resp.json()

    async def get_latest_session(self) -> Optional[dict]:
        try:
            data = await self._get("sessions", {"session_key": "latest"})
            if isinstance(data, list) and data:
                return data[0]
            return data if isinstance(data, dict) else None
        except Exception as e:
            logger.error(f"Error fetching latest session: {e}")
            return None

    async def get_positions(self, session_key: int) -> list:
        try:
            return await self._get("position", {"session_key": session_key})
        except Exception:
            return []

    async def get_intervals(self, session_key: int) -> list:
        try:
            return await self._get("intervals", {"session_key": session_key})
        except Exception:
            return []

    async def get_laps(self, session_key: int) -> list:
        try:
            return await self._get("laps", {"session_key": session_key})
        except Exception:
            return []

    async def get_weather(self, session_key: int) -> list:
        try:
            return await self._get("weather", {"session_key": session_key})
        except Exception:
            return []

    async def get_pit_stops(self, session_key: int) -> list:
        try:
            return await self._get("pit", {"session_key": session_key})
        except Exception:
            return []

    async def get_race_control(self, session_key: int) -> list:
        try:
            return await self._get("race_control", {"session_key": session_key})
        except Exception:
            return []

    async def get_stints(self, session_key: int) -> list:
        try:
            return await self._get("stints", {"session_key": session_key})
        except Exception:
            return []

    async def get_drivers(self, session_key: int) -> list:
        try:
            return await self._get("drivers", {"session_key": session_key})
        except Exception:
            return []

    async def close(self):
        await self.client.aclose()


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        dead = []
        async with self._lock:
            for conn in self.active_connections:
                try:
                    await conn.send_json(message)
                except Exception:
                    dead.append(conn)
            for conn in dead:
                self.active_connections.remove(conn)

    @property
    def has_connections(self):
        return len(self.active_connections) > 0


class LiveTimingPoller:
    def __init__(self, ws_manager: ConnectionManager, session_factory):
        self.openf1 = OpenF1Client()
        self.ws_manager = ws_manager
        self.session_factory = session_factory
        self._current_session = None
        self._previous_state = {}
        self._running = False
        self._task = None
        self._driver_info = {}  # Cache: driver_number -> {abbreviation, full_name, team_name, team_colour}
        self._driver_info_session_key = None  # Track which session we cached drivers for

    def register_jobs(self, scheduler):
        scheduler.add_job(
            self._poll_cycle,
            "interval",
            seconds=POLL_INTERVAL,
            id="live_polling",
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=10,
        )

    async def _poll_cycle(self):
        try:
            # No browsers watching — skip entirely (0 API calls)
            if not self.ws_manager.has_connections:
                return

            # Check for active session
            session = await self.openf1.get_latest_session()
            if not session:
                if self.ws_manager.has_connections:
                    await self.ws_manager.broadcast({
                        "type": "status",
                        "status": "no_active_session",
                    })
                return

            session_key = session.get("session_key")
            self._current_session = session

            # Only fetch detailed timing when session is actually live
            if session.get("status") != "Started":
                await self.ws_manager.broadcast({
                    "type": "status",
                    "status": "no_live_session",
                    "session": {
                        "key": session_key,
                        "name": session.get("session_name", ""),
                        "type": session.get("session_type", ""),
                        "status": session.get("status", ""),
                        "circuit": session.get("circuit_short_name", ""),
                        "country": session.get("country_name", ""),
                    },
                })
                return

            # Fetch driver info once per session (names, teams, colors)
            if session_key != self._driver_info_session_key or not self._driver_info:
                driver_list = await self.openf1.get_drivers(session_key)
                if driver_list:
                    self._driver_info = {}
                    for d in driver_list:
                        dn = d.get("driver_number")
                        if dn:
                            self._driver_info[dn] = {
                                "abbreviation": d.get("name_acronym", ""),
                                "full_name": d.get("full_name", ""),
                                "team_name": d.get("team_name", ""),
                                "team_colour": d.get("team_colour", ""),
                            }
                    self._driver_info_session_key = session_key
                    logger.info(f"Cached driver info for session {session_key}: {len(self._driver_info)} drivers")
                await asyncio.sleep(0.35)

            # Fetch live data (stagger to respect rate limits)
            positions = await self.openf1.get_positions(session_key)
            await asyncio.sleep(0.35)
            intervals = await self.openf1.get_intervals(session_key)
            await asyncio.sleep(0.35)
            laps = await self.openf1.get_laps(session_key)
            await asyncio.sleep(0.35)
            weather = await self.openf1.get_weather(session_key)
            await asyncio.sleep(0.35)
            race_control = await self.openf1.get_race_control(session_key)
            await asyncio.sleep(0.35)
            stints = await self.openf1.get_stints(session_key)

            # Build timing state from latest data per driver, enriched with driver info
            timing = self._build_timing_state(positions, intervals, laps, stints)
            # Merge cached driver info (names, teams, colors) into timing entries
            for entry in timing:
                dn = entry.get("driver_number")
                info = self._driver_info.get(dn, {})
                entry["abbreviation"] = info.get("abbreviation", "")
                entry["full_name"] = info.get("full_name", "")
                entry["team_name"] = info.get("team_name", "")
                entry["team_colour"] = info.get("team_colour", "")
            weather_latest = weather[-1] if weather else {}
            rc_recent = race_control[-5:] if race_control else []

            new_state = {
                "type": "timing_update",
                "session": {
                    "key": session_key,
                    "name": session.get("session_name", ""),
                    "type": session.get("session_type", ""),
                    "status": session.get("status", ""),
                    "circuit": session.get("circuit_short_name", ""),
                    "country": session.get("country_name", ""),
                },
                "timing": timing,
                "weather": {
                    "air_temp": weather_latest.get("air_temperature"),
                    "track_temp": weather_latest.get("track_temperature"),
                    "humidity": weather_latest.get("humidity"),
                    "wind_speed": weather_latest.get("wind_speed"),
                    "wind_direction": weather_latest.get("wind_direction"),
                    "rainfall": weather_latest.get("rainfall"),
                },
                "race_control": [
                    {
                        "date": rc.get("date", ""),
                        "category": rc.get("category", ""),
                        "flag": rc.get("flag", ""),
                        "message": rc.get("message", ""),
                        "driver_number": rc.get("driver_number"),
                        "lap_number": rc.get("lap_number"),
                    }
                    for rc in rc_recent
                ],
                "timestamp": datetime.utcnow().isoformat(),
            }

            # Broadcast to WebSocket clients
            if self.ws_manager.has_connections:
                await self.ws_manager.broadcast(new_state)

            self._previous_state = new_state

        except Exception as e:
            logger.error(f"Error in poll cycle: {e}")

    def _build_timing_state(self, positions, intervals, laps, stints) -> list:
        """Build per-driver timing from latest OpenF1 data."""
        drivers = {}

        # Latest position per driver
        for p in positions:
            dn = p.get("driver_number")
            if dn:
                drivers.setdefault(dn, {})["position"] = p.get("position")
                drivers[dn]["driver_number"] = dn

        # Latest interval per driver
        for i in intervals:
            dn = i.get("driver_number")
            if dn and dn in drivers:
                drivers[dn]["gap_to_leader"] = i.get("gap_to_leader")
                drivers[dn]["interval"] = i.get("interval")

        # Latest lap per driver
        driver_laps = {}
        for lap in laps:
            dn = lap.get("driver_number")
            if dn:
                driver_laps.setdefault(dn, []).append(lap)

        for dn, drv_laps in driver_laps.items():
            if dn in drivers and drv_laps:
                latest = drv_laps[-1]
                drivers[dn]["last_lap_time"] = latest.get("lap_duration")
                drivers[dn]["lap_number"] = latest.get("lap_number")
                drivers[dn]["sector_1_time"] = latest.get("duration_sector_1")
                drivers[dn]["sector_2_time"] = latest.get("duration_sector_2")
                drivers[dn]["sector_3_time"] = latest.get("duration_sector_3")
                drivers[dn]["segments_s1"] = latest.get("segments_sector_1", [])
                drivers[dn]["segments_s2"] = latest.get("segments_sector_2", [])
                drivers[dn]["segments_s3"] = latest.get("segments_sector_3", [])

        # Latest stint per driver
        driver_stints = {}
        for s in stints:
            dn = s.get("driver_number")
            if dn:
                driver_stints.setdefault(dn, []).append(s)

        for dn, drv_stints in driver_stints.items():
            if dn in drivers and drv_stints:
                latest = drv_stints[-1]
                drivers[dn]["tire_compound"] = latest.get("compound")
                drivers[dn]["tire_age"] = latest.get("tyre_age_at_start")
                drivers[dn]["stint_number"] = latest.get("stint_number")

        # Sort by position
        timing = sorted(drivers.values(), key=lambda d: d.get("position") or 99)
        return timing

    def get_current_session(self) -> Optional[dict]:
        return self._current_session

    def get_latest_state(self) -> dict:
        return self._previous_state
