import asyncio
import logging
from functools import lru_cache

import numpy as np
import fastf1
from fastf1.plotting import get_driver_style

logger = logging.getLogger("f1-dashboard.fastf1")

SESSION_TYPE_MAP = {
    "FP1": "FP1", "FP2": "FP2", "FP3": "FP3",
    "Q": "Q", "qualifying": "Q",
    "R": "R", "race": "R",
    "S": "S", "sprint": "S",
    "SQ": "SQ", "sprint_qualifying": "SQ",
}


class FastF1Service:
    def __init__(self):
        self._session_cache = {}

    def _cache_key(self, year, gp, session_type):
        return f"{year}_{gp}_{session_type}"

    def _load_session_sync(self, year, gp, session_type):
        key = self._cache_key(year, gp, session_type)
        if key in self._session_cache:
            return self._session_cache[key]
        st = SESSION_TYPE_MAP.get(session_type, session_type)
        session = fastf1.get_session(year, gp, st)
        session.load(telemetry=True, laps=True, weather=True)
        self._session_cache[key] = session
        return session

    async def _load_session(self, year, gp, session_type):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._load_session_sync, year, gp, session_type
        )

    def _apply_rotation(self, x, y, rotation_deg):
        angle = np.radians(rotation_deg)
        cos_a, sin_a = np.cos(angle), np.sin(angle)
        x_rot = x * cos_a - y * sin_a
        y_rot = x * sin_a + y * cos_a
        return x_rot, y_rot

    async def get_circuit_info(self, year: int, gp) -> dict:
        session = await self._load_session(year, gp, "R")
        ci = session.get_circuit_info()
        rotation = ci.rotation

        # Get track outline from fastest lap telemetry
        fastest = session.laps.pick_fastest()
        if fastest is None or (hasattr(fastest, 'empty') and fastest.empty):
            # Fallback: pick any lap
            laps = session.laps.pick_quicklaps()
            if laps is not None and len(laps) > 0:
                fastest = laps.iloc[0]

        tel = fastest.get_car_data().add_distance()
        pos = fastest.get_pos_data()

        x = pos["X"].values.astype(float)
        y = pos["Y"].values.astype(float)
        x_rot, y_rot = self._apply_rotation(x, y, rotation)

        corners = []
        if ci.corners is not None and len(ci.corners) > 0:
            for _, row in ci.corners.iterrows():
                cx, cy = self._apply_rotation(
                    np.array([row["X"]]), np.array([row["Y"]]), rotation
                )
                corners.append({
                    "number": int(row["Number"]),
                    "x": float(cx[0]),
                    "y": float(cy[0]),
                    "letter": row.get("Letter", ""),
                })

        marshal_sectors = []
        if ci.marshal_sectors is not None and len(ci.marshal_sectors) > 0:
            for _, row in ci.marshal_sectors.iterrows():
                sx, sy = self._apply_rotation(
                    np.array([row["X"]]), np.array([row["Y"]]), rotation
                )
                marshal_sectors.append({
                    "number": int(row.get("Number", 0)),
                    "x": float(sx[0]),
                    "y": float(sy[0]),
                })

        return {
            "name": session.event["EventName"],
            "circuit": session.event.get("Location", ""),
            "track": {
                "x": x_rot.tolist(),
                "y": y_rot.tolist(),
            },
            "corners": corners,
            "marshal_sectors": marshal_sectors,
            "rotation_applied": True,
        }

    async def get_lap_telemetry(
        self, year: int, gp, session_type: str, driver: str, lap_number: int = None
    ) -> dict:
        session = await self._load_session(year, gp, session_type)
        ci = session.get_circuit_info()
        rotation = ci.rotation

        driver_laps = session.laps.pick_drivers(driver)
        if driver_laps is None or len(driver_laps) == 0:
            return {"error": f"No laps for driver {driver}"}

        if lap_number:
            lap = driver_laps[driver_laps["LapNumber"] == lap_number]
            if len(lap) == 0:
                return {"error": f"Lap {lap_number} not found for {driver}"}
            lap = lap.iloc[0]
        else:
            lap = driver_laps.pick_fastest()

        car_data = lap.get_car_data().add_distance()
        pos_data = lap.get_pos_data()

        x = pos_data["X"].values.astype(float)
        y = pos_data["Y"].values.astype(float)
        x_rot, y_rot = self._apply_rotation(x, y, rotation)

        return {
            "driver": driver,
            "lap_number": int(lap["LapNumber"]),
            "lap_time": str(lap["LapTime"]),
            "telemetry": {
                "distance": car_data["Distance"].tolist(),
                "speed": car_data["Speed"].tolist(),
                "throttle": car_data["Throttle"].tolist(),
                "brake": car_data["Brake"].astype(int).tolist(),
                "gear": car_data["nGear"].tolist(),
                "rpm": car_data["RPM"].tolist() if "RPM" in car_data.columns else [],
                "drs": car_data["DRS"].tolist() if "DRS" in car_data.columns else [],
                "x": x_rot.tolist(),
                "y": y_rot.tolist(),
            },
        }

    async def get_lap_comparison(
        self, year: int, gp, session_type: str, drivers: list[str]
    ) -> dict:
        session = await self._load_session(year, gp, session_type)
        ci = session.get_circuit_info()
        rotation = ci.rotation
        result = {"drivers": []}

        ref_tel = None
        for drv in drivers:
            laps = session.laps.pick_drivers(drv)
            if laps is None or len(laps) == 0:
                continue
            fastest = laps.pick_fastest()
            if fastest is None:
                continue

            car_data = fastest.get_car_data().add_distance()
            pos_data = fastest.get_pos_data()

            x = pos_data["X"].values.astype(float)
            y = pos_data["Y"].values.astype(float)
            x_rot, y_rot = self._apply_rotation(x, y, rotation)

            try:
                style = get_driver_style(drv)
                color = style.get("color", "#ffffff")
            except Exception:
                color = "#ffffff"

            driver_data = {
                "abbreviation": drv,
                "color": color,
                "lap_time": str(fastest["LapTime"]),
                "telemetry": {
                    "distance": car_data["Distance"].tolist(),
                    "speed": car_data["Speed"].tolist(),
                    "throttle": car_data["Throttle"].tolist(),
                    "brake": car_data["Brake"].astype(int).tolist(),
                    "gear": car_data["nGear"].tolist(),
                    "x": x_rot.tolist(),
                    "y": y_rot.tolist(),
                },
            }

            # Compute delta to first driver
            if ref_tel is None:
                ref_tel = car_data
                driver_data["delta"] = [0.0] * len(car_data)
            else:
                try:
                    delta = car_data["Time"] - ref_tel["Time"].iloc[: len(car_data)]
                    driver_data["delta"] = [
                        d.total_seconds() if hasattr(d, "total_seconds") else float(d)
                        for d in delta
                    ]
                except Exception:
                    driver_data["delta"] = [0.0] * len(car_data)

            result["drivers"].append(driver_data)

        return result

    async def get_driver_colors(self, year: int, gp, session_type: str) -> dict:
        session = await self._load_session(year, gp, session_type)
        drivers = []
        for _, drv in session.results.iterrows():
            abbr = drv.get("Abbreviation", "")
            team = drv.get("TeamName", "")
            try:
                style = get_driver_style(abbr)
                color = style.get("color", "#ffffff")
            except Exception:
                color = "#ffffff"
            drivers.append({
                "abbreviation": abbr,
                "team": team,
                "color": color,
                "number": int(drv.get("DriverNumber", 0)) if drv.get("DriverNumber") else None,
                "full_name": drv.get("FullName", ""),
            })
        return {"drivers": drivers}


# Singleton
fastf1_service = FastF1Service()
