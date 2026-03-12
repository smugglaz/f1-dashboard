# F1 Analytics & Live Companion Dashboard

A full-stack Formula 1 analytics platform — historical research tool (1950-present) and real-time race companion.

## Quick Start

**Windows (recommended):** Double-click `launch.bat` in the parent folder. It starts the server, waits for services, and opens your browser.

**Manual:**

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Build the frontend
cd frontend && npm install && npm run build && cd ..

# 3. Run
python main.py
```

Open http://localhost:8000

## Features

| Page | What it does |
|------|-------------|
| **Dashboard** | Driver & constructor standings, race calendar, next race countdown |
| **Race History** | Results, qualifying, pit stops for any season (1950-present) |
| **Track Map** | Circuit visualization with speed/throttle/brake/gear overlays, lap comparison (2018+) |
| **Live Timing** | Real-time timing tower, weather, race control messages during active F1 sessions |
| **Predictions** | ML-powered podium probability forecasts |
| **News** | Aggregated RSS feeds from major F1 outlets |

## Project Structure

```
f1-dashboard/
├── main.py                  Entry point (starts uvicorn on port 8000)
├── requirements.txt         Python dependencies
├── f1_data.db               SQLite database (~91 MB, auto-created on first run)
│
├── backend/
│   ├── main.py              FastAPI app, lifespan, middleware, route mounting
│   ├── models.py            SQLAlchemy ORM models (Race, Driver, Circuit, etc.)
│   ├── database.py          SQLite connection (WAL mode)
│   ├── data_sync.py         Background sync: Jolpica API → database (last 3 seasons)
│   ├── live_data.py         OpenF1 live polling → WebSocket broadcast
│   ├── fastf1_service.py    Telemetry & circuit data service (on-demand, cached)
│   ├── news_fetcher.py      RSS feed aggregator
│   ├── predictor.py         Gradient Boosting podium predictor
│   └── routers/
│       ├── historical.py    /api/races, /api/standings, /api/results, /api/telemetry
│       ├── live.py          /api/live/*, /ws/timing (WebSocket)
│       ├── news.py          /api/news
│       └── predictions.py   /api/predictions
│
└── frontend/
    ├── package.json         React 19, Vite 7, Tailwind 4, Plotly.js
    ├── vite.config.js       Dev server proxy + build config
    ├── index.html           HTML shell
    └── src/
        ├── App.jsx          Router: 6 pages
        ├── main.jsx         React entry point
        ├── index.css        Global styles + Tailwind
        ├── components/      13 reusable UI components
        │   ├── Layout.jsx           Sidebar navigation
        │   ├── StandingsTable.jsx   Driver/constructor standings with team colors
        │   ├── TimingTower.jsx      Live timing tower (pit wall style)
        │   ├── TrackMap.jsx         Circuit map with telemetry overlay
        │   ├── TelemetryChart.jsx   Speed/throttle/brake charts
        │   ├── LapComparison.jsx    Delta time comparison
        │   ├── LiveTrackMap.jsx     Live driver positions on track
        │   ├── MiniSectorBar.jsx    Sector timing indicators
        │   ├── WeatherWidget.jsx    Track conditions display
        │   ├── RaceControlFeed.jsx  Race control messages
        │   ├── NewsCard.jsx         News article card
        │   ├── DataTable.jsx        Generic sortable table
        │   └── LoadingSpinner.jsx   Loading indicator
        ├── pages/           6 route pages
        │   ├── Dashboard.jsx        Home: standings + calendar
        │   ├── History.jsx          Browse past race data
        │   ├── RaceMap.jsx          Telemetry & circuit visualization
        │   ├── LiveTiming.jsx       Real-time session companion
        │   ├── Predictions.jsx      Podium probability forecasts
        │   └── News.jsx             Aggregated F1 news
        ├── hooks/
        │   ├── useApi.js            REST API data fetching
        │   └── useWebSocket.js      WebSocket connection management
        └── utils/
            ├── teams.js             Team colors, names, driver mappings
            ├── colors.js            Position, status, tire, sector color maps
            └── format.js            Lap times, positions, driver names formatting
```

## Architecture

```
Browser ──── React SPA (Vite + Tailwind + Plotly.js)
               │
               ├── REST (/api/*) ──── FastAPI
               └── WebSocket (/ws/timing)    │
                                             │
                    ┌────────────────────────┘
                    │
        ┌───────────┼───────────┬──────────────┐
        │           │           │              │
   Jolpica API   OpenF1 API   FastF1      RSS Feeds
   (historical)  (live)       (telemetry)  (news)
        │           │           │              │
        └───────────┴───────────┴──────────────┘
                    │
              SQLite (WAL mode)
```

## Data Sources

| Source | Purpose | Polling |
|--------|---------|---------|
| Jolpica API | Historical results, standings, pit stops (1950-present) | On startup + every 60 min (current season only, past races only) |
| OpenF1 API | Live timing, positions, intervals, weather | Every 10s during active sessions, only when browser connected |
| FastF1 | Telemetry, circuit maps (2018+) | On-demand, cached locally |
| RSS Feeds | News from Motorsport.com, Autosport, PlanetF1, etc. | Every 15 min |

## First Run

On first startup, the background sync populates historical data from Jolpica API (last 3 seasons). This takes a few minutes due to rate limiting. Subsequent starts use cached data and only sync recent race results.

FastF1 telemetry is fetched on-demand and cached locally. First request for a session takes 10-30 seconds.

## Configuration

Copy `.env.example` to `.env` to customize:

- `FASTF1_CACHE_DIR` — Cache location (default: `./cache/fastf1`)
- `DATABASE_URL` — Database path (default: `sqlite:///./f1_data.db`)

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, APScheduler, httpx
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, Plotly.js, Lucide icons
- **ML**: scikit-learn (Gradient Boosting Classifier)
- **Database**: SQLite with WAL mode
