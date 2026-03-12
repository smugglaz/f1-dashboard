# Data Sync API Reference

Quick reference for all external APIs used by the F1 Dashboard, their endpoints, response shapes, rate limits, and known quirks. Written to avoid re-investigating these APIs in future sessions.

---

## 1. Jolpica (Ergast Successor)

**Base URL:** `https://api.jolpi.ca/ergast/f1`
**Client:** `backend/data_sync.py` → `JolpicaClient`
**Protocol:** REST / JSON
**Auth:** None (public API)
**Timeout:** 15 seconds
**Rate limit:** Returns HTTP 429 when exceeded; our client waits 60s then retries once. We add 0.5s (`RATE_DELAY`) between sequential requests.
**Pagination:** `?limit=100&offset=N` — response includes `MRData.total` for total count.

### Endpoints Used

| Method | URL Pattern | Returns | Response Path |
|--------|------------|---------|---------------|
| GET | `/{year}.json` | Race calendar for a season | `MRData.RaceTable.Races[]` |
| GET | `/{year}/{round}/results.json` | Race results | `MRData.RaceTable.Races[0].Results[]` |
| GET | `/{year}/{round}/qualifying.json` | Qualifying results | `MRData.RaceTable.Races[0].QualifyingResults[]` |
| GET | `/{year}/{round}/pitstops.json` | Pit stop data (2011+) | `MRData.RaceTable.Races[0].PitStops[]` |
| GET | `/{year}/{round}/sprint.json` | Sprint results (2021+) | `MRData.RaceTable.Races[0].SprintResults[]` |
| GET | `/{year}/driverStandings.json` | Driver championship standings | `MRData.StandingsTable.StandingsLists[0].DriverStandings[]` |
| GET | `/{year}/constructorStandings.json` | Constructor standings (1958+) | `MRData.StandingsTable.StandingsLists[0].ConstructorStandings[]` |

### Response Shapes

**Race object (from calendar):**
```json
{
  "round": "1",
  "raceName": "Bahrain Grand Prix",
  "date": "2024-03-02",
  "time": "15:00:00Z",
  "url": "https://en.wikipedia.org/wiki/...",
  "Circuit": {
    "circuitId": "bahrain",
    "circuitName": "Bahrain International Circuit",
    "Location": { "lat": "26.0325", "long": "50.5106", "locality": "Sakhir", "country": "Bahrain" }
  },
  "SprintDate": "2024-03-01",
  "SprintTime": "14:30:00Z"
}
```

**Result object:**
```json
{
  "position": "1",
  "positionText": "1",
  "points": "25",
  "grid": "1",
  "laps": "57",
  "status": "Finished",
  "Driver": { "driverId": "max_verstappen", "permanentNumber": "1", "code": "VER", "givenName": "Max", "familyName": "Verstappen", "nationality": "Dutch", "dateOfBirth": "1997-09-30" },
  "Constructor": { "constructorId": "red_bull", "name": "Red Bull", "nationality": "Austrian" },
  "Time": { "millis": "5765432", "time": "1:36:05.432" },
  "FastestLap": { "rank": "1", "Time": { "time": "1:32.456" }, "AverageSpeed": { "speed": "210.123" } }
}
```

**Qualifying object:**
```json
{ "position": "1", "Driver": {...}, "Constructor": {...}, "Q1": "1:30.123", "Q2": "1:29.456", "Q3": "1:28.789" }
```

**Pit stop object:**
```json
{ "driverId": "max_verstappen", "stop": "1", "lap": "20", "time": "15:30:00", "duration": "23.456" }
```

**Standing object:**
```json
{ "position": "1", "points": "575", "wins": "19", "Driver": {...} }
```

### Known Quirks
- Sprint endpoint returns HTTP error (not empty list) for non-sprint rounds — must catch exceptions.
- `positionText` can be "R" (retired), "D" (disqualified), "E" (excluded), "W" (withdrawn), "F" (failed to qualify), "N" (not classified) — not always numeric.
- Qualifying data has limited structure pre-2003 (no Q1/Q2/Q3 split). Our `_qualifying_format()` function classifies eras: LEGACY (<2003), ONE_LAP (2003-2005), KNOCKOUT (2006+).
- Constructor standings only available from 1958 onward.
- Pit stop data only available from 2011 onward.
- For current season, future rounds have calendar data but NO results/qualifying/pitstops — our date guard (`race_date > today`) skips these.
- The `total` field in pagination can report stale counts; always check if returned items list is empty.

### Sync Behavior
- **Initial sync:** On startup, syncs from `SYNC_FROM_YEAR` env var (default: current_year - 2) to current year. Past completed seasons are skipped via `SyncStatus` DB table.
- **Periodic sync:** Every 60 minutes, re-syncs current season only (force=True). Skips future rounds by date.
- **Per-round API calls:** For each past round: 4-5 calls (results, qualifying, pitstops, sprint if 2021+). Plus 1 call for calendar, 1 for driver standings, 1 for constructor standings per season.

---

## 2. OpenF1 (Live Timing)

**Base URL:** `https://api.openf1.org/v1`
**Client:** `backend/live_data.py` → `OpenF1Client`
**Protocol:** REST / JSON (returns arrays)
**Auth:** None (public API)
**Timeout:** 10 seconds
**Rate limit:** Returns HTTP 429; our client waits 5s then retries once. Concurrency limited to 3 simultaneous requests via `asyncio.Semaphore(3)`.
**Stagger:** 0.35s pause between sequential calls during a poll cycle.

### Endpoints Used

| Method | URL Pattern | Params | Returns |
|--------|------------|--------|---------|
| GET | `/sessions` | `session_key=latest` | Latest session info |
| GET | `/drivers` | `session_key={key}` | Driver list for session |
| GET | `/position` | `session_key={key}` | Position changes over time |
| GET | `/intervals` | `session_key={key}` | Gap to leader / interval |
| GET | `/laps` | `session_key={key}` | Lap-by-lap timing data |
| GET | `/weather` | `session_key={key}` | Weather readings |
| GET | `/race_control` | `session_key={key}` | Race control messages (flags, penalties) |
| GET | `/stints` | `session_key={key}` | Tire stint data (compound, age) |
| GET | `/pit` | `session_key={key}` | Pit stop events |

### Response Shapes

**Session object:**
```json
{
  "session_key": 11234,
  "meeting_key": 1279,
  "session_name": "Race",
  "session_type": "Race",
  "status": "Started",
  "circuit_short_name": "Melbourne",
  "country_name": "Australia",
  "date_start": "2026-03-15T05:00:00+00:00",
  "date_end": "2026-03-15T07:00:00+00:00"
}
```

**Critical field — `status`:**
- `"Started"` = session is currently live (actively producing timing data)
- `"Finished"` / `"Finalised"` = session is over
- Other values = not yet started or inactive
- **Our poll guard:** Only fetch the 6 detailed endpoints when `status == "Started"`. Otherwise broadcast a "no_live_session" status message (1 API call instead of 7).

**Driver object:**
```json
{
  "driver_number": 1,
  "name_acronym": "VER",
  "full_name": "Max VERSTAPPEN",
  "team_name": "Red Bull Racing",
  "team_colour": "3671C6"
}
```

**Position object:**
```json
{ "driver_number": 1, "position": 1, "date": "2024-03-02T15:30:00.000000+00:00" }
```

**Interval object:**
```json
{ "driver_number": 1, "gap_to_leader": "+0.000", "interval": "+0.000" }
```

**Lap object:**
```json
{
  "driver_number": 1,
  "lap_number": 15,
  "lap_duration": 90.123,
  "duration_sector_1": 28.456,
  "duration_sector_2": 33.789,
  "duration_sector_3": 27.878,
  "segments_sector_1": [2048, 2049, 2064, 2049],
  "segments_sector_2": [2048, 2049, 2050, 2049, 2064],
  "segments_sector_3": [2048, 2049, 2049]
}
```

**Stint object:**
```json
{ "driver_number": 1, "stint_number": 2, "compound": "MEDIUM", "tyre_age_at_start": 0, "lap_start": 20, "lap_end": 40 }
```

**Weather object:**
```json
{ "air_temperature": 28.5, "track_temperature": 45.2, "humidity": 55, "wind_speed": 3.2, "wind_direction": 180, "rainfall": 0 }
```

**Race control object:**
```json
{ "date": "2024-03-02T15:35:00", "category": "Flag", "flag": "YELLOW", "message": "Yellow Flag in Sector 2", "driver_number": 44, "lap_number": 12 }
```

### Known Quirks
- All endpoints return **arrays** (even sessions with `session_key=latest` returns a 1-element array).
- `circuit_short_name` can be empty string for newly created sessions — causes 400 errors if used as a filter parameter. Always use `session_key` for filtering.
- OpenF1 uses `meeting_key` and `session_key` as primary identifiers. A meeting = a race weekend. A session = FP1/FP2/FP3/Q/Sprint/Race within that weekend.
- Position/interval/lap data is **append-only** — each poll returns ALL entries for the session, not just new ones. Our code takes the latest per driver.
- Segment values in lap data are integer codes representing mini-sector colors (2048=green, 2049=yellow, 2064=purple, etc.).
- When no session is live, `/sessions?session_key=latest` returns the most recent finished session (not null).
- Pit stop data (`/pit`) and stints (`/stints`) return 404 for sessions that haven't started or have no data yet.

### Polling Behavior
- **Interval:** Every 10 seconds (`POLL_INTERVAL`).
- **Connection guard:** If no WebSocket clients are connected, the entire poll cycle is skipped (0 API calls).
- **Session status guard:** If latest session status is not "Started", broadcasts status info and returns (1 API call).
- **Live session:** Fetches all 7 endpoints (drivers cached once per session, then positions, intervals, laps, weather, race_control, stints) with 0.35s stagger = ~2.5s per cycle.
- **Driver cache:** Driver info is fetched once per session_key and cached in memory (`_driver_info` dict).

---

## 3. FastF1 (Telemetry)

**Library:** `fastf1` Python package (not a REST API)
**Client:** `backend/fastf1_service.py` → `FastF1Service`
**Data source:** FastF1 downloads from its own CDN (Ergast + F1 timing data, pre-processed)
**Cache:** File-based cache enabled at startup in `backend/main.py` via `fastf1.Cache.enable_cache("cache/")`

### Functions Used

| Function | Purpose | Notes |
|----------|---------|-------|
| `fastf1.get_session(year, gp, session_type)` | Load session metadata | `gp` can be round number (int) or GP name (str) |
| `session.load(telemetry=True, laps=True, weather=True)` | Download all session data | Heavy operation, cached after first call |
| `session.laps.pick_drivers(driver)` | Filter laps by driver abbreviation | Returns DataFrame |
| `session.laps.pick_fastest()` | Get fastest lap | Returns single lap Series |
| `lap.get_car_data().add_distance()` | Car telemetry (speed, throttle, brake, gear, RPM, DRS) | Returns DataFrame with Distance column |
| `lap.get_pos_data()` | Position data (X, Y coordinates) | Used for track maps |
| `session.get_circuit_info()` | Circuit metadata (corners, marshal sectors, rotation) | Includes rotation angle for proper map orientation |
| `get_driver_style(abbreviation)` | Official team color for driver | From `fastf1.plotting` |

### Session Type Mapping
```
FP1, FP2, FP3 → Practice sessions
Q / qualifying → Qualifying
R / race → Race
S / sprint → Sprint Race
SQ / sprint_qualifying → Sprint Qualifying (2022+)
```

### Telemetry Data Columns
- **Car data:** Distance, Speed, Throttle (0-100), Brake (0/1 boolean), nGear (0-8), RPM, DRS
- **Position data:** X, Y (track coordinates in meters from origin)
- **Lap data:** LapNumber, LapTime (timedelta), Sector1/2/3Time, Compound, TyreLife

### Known Quirks
- `session.load()` is **synchronous and slow** (5-30 seconds depending on cache). Runs in `run_in_executor()` to avoid blocking the event loop.
- `pick_fastest()` can return `None` if no valid laps exist (e.g., red-flagged sessions).
- Track coordinates need rotation by `circuit_info.rotation` degrees for proper visual orientation.
- FastF1 data availability lags a few hours after a session ends.
- The library caches aggressively — first load is slow, subsequent loads are fast.
- `get_driver_style()` can throw exceptions for unknown/historical drivers — always wrap in try/except.

---

## 4. News (RSS Feeds)

**Client:** `backend/news_fetcher.py` → `NewsFetcher`
**Library:** `feedparser` (Python RSS parser)
**Protocol:** RSS/Atom XML
**Auth:** None

### Feeds

| Source | URL | Notes |
|--------|-----|-------|
| Formula1.com | `https://www.formula1.com/en/latest/all.xml` | Official F1 news |
| Autosport | `https://www.autosport.com/rss/f1/news` | Motorsport journalism |
| Motorsport.com | `https://www.motorsport.com/rss/f1/news/` | Motorsport journalism |

### Parsed Fields per Article
- `title` — article headline
- `url` (`entry.link`) — article URL, used as unique key for dedup
- `summary` — truncated to 500 chars
- `image_url` — from `media_content[0].url` or `media_thumbnail[0].url`
- `published` — parsed from `published_parsed` tuple
- `category` — from `tags[0].term`

### Behavior
- Fetches up to 30 entries per feed per cycle.
- Deduplicates by URL (skips if already in `NewsArticle` table).
- **Schedule:** Once at startup (8s delay), then every 15 minutes.
- No rate limiting concerns — standard RSS feed polling.

---

## 5. Scheduler Summary (APScheduler)

All jobs registered via `AsyncIOScheduler` in `backend/main.py` lifespan:

| Job ID | Interval | Target | Purpose |
|--------|----------|--------|---------|
| `initial_sync` | Once (startup + 5s) | `DataSyncManager.initial_sync` | Bulk sync seasons from SYNC_FROM_YEAR to current |
| `current_season_sync` | Every 60 min | `DataSyncManager.sync_current_season` | Re-sync current year's results |
| `live_polling` | Every 10 sec | `LiveTimingPoller._poll_cycle` | OpenF1 live data → WebSocket broadcast |
| `news_fetch_startup` | Once (startup + 8s) | `NewsFetcher.fetch_all_feeds` | Initial news fetch |
| `news_fetch` | Every 15 min | `NewsFetcher.fetch_all_feeds` | Periodic news refresh |

### Optimization Guards (implemented)
1. **Connection guard** (live_data.py): Poll cycle exits immediately if no WebSocket clients connected.
2. **Session status guard** (live_data.py): Only fetches 7 detailed endpoints when `session.status == "Started"`.
3. **Future date guard** (data_sync.py): Skips results/qualifying/pitstops for rounds where `race_date > today`.
4. **Completed season guard** (data_sync.py): Past seasons marked "completed" in SyncStatus table are skipped on restart.
