# F1 Analytics & Live Companion Dashboard v2.0

A full-stack Formula 1 analytics platform — historical research tool (1950-present), real-time race companion, and deep race analysis with strategy, sector, and tyre insights.

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
| **Dashboard** | KPI hero cards, championship battle, recent race summary, upcoming race countdown, standings with gap bars, points progression, teammate comparison |
| **Race Analysis** | Results, qualifying, pit stops, position chart + **Strategy timeline**, **Sector analysis**, **Tyre degradation curves**, **Weather & race control conditions** (2018+ via FastF1) |
| **Track Map** | Circuit visualization with speed/throttle/brake/gear overlays, lap comparison (2018+) |
| **Live Timing** | Real-time timing tower, weather, race control messages during active F1 sessions |
| **Predictions** | ML-powered podium probability forecasts with model transparency |
| **News** | Aggregated RSS feeds from major F1 outlets with source filtering |

### v2.0 Highlights

- **shadcn/ui component system** — Card, Badge, Button, Tabs, Select, Skeleton, Tooltip, and 9 F1-specific compound components (KpiCard, TyreBadge, FlagBadge, GapBar, Sparkline, etc.)
- **7 new API endpoints** — race-summary, stints, sectors, weather, race-control, tyre-performance, circuit-info
- **Race Analysis deep-dive** — Strategy stints timeline, sector dominance table with purple highlights, tyre degradation curves by compound, weather + race control conditions feed
- **Responsive layout** — Mobile hamburger menu with slide-out sidebar
- **Skeleton loading states** — Contextual loading placeholders instead of generic spinners
- **Recharts integration** — Lightweight charts for weather, tyre degradation, and sparklines

## Project Structure

```
f1-dashboard/
├── main.py                  Entry point (starts uvicorn on port 8000)
├── requirements.txt         Python dependencies
├── f1_data.db               SQLite database (~91 MB, auto-created on first run)
│
├── backend/
│   ├── main.py              FastAPI app, lifespan, middleware, route mounting
│   ├── models.py            SQLAlchemy ORM models (Race, Driver, Circuit, Stint, FastF1Lap, etc.)
│   ├── database.py          SQLite connection (WAL mode)
│   ├── data_sync.py         Background sync: Jolpica API → database (last 3 seasons)
│   ├── live_data.py         OpenF1 live polling → WebSocket broadcast
│   ├── fastf1_service.py    Telemetry & circuit data service (on-demand, cached)
│   ├── news_fetcher.py      RSS feed aggregator
│   ├── predictor.py         Gradient Boosting podium predictor
│   └── routers/
│       ├── historical.py    26 routes: standings, results, telemetry, stints, sectors, weather, etc.
│       ├── live.py          /api/live/*, /ws/timing (WebSocket)
│       ├── news.py          /api/news
│       └── predictions.py   /api/predictions
│
└── frontend/
    ├── package.json         React 19, Vite 7, Tailwind 4, Recharts, Radix UI, Plotly.js
    ├── vite.config.js       Dev server proxy + build config + @ alias
    ├── jsconfig.json         Path alias: @/ → src/
    ├── index.html           HTML shell
    └── src/
        ├── App.jsx          Router: 6 pages + legacy /history redirect
        ├── main.jsx         React entry point
        ├── index.css        Global styles + Tailwind + shadcn CSS variables
        ├── lib/
        │   └── utils.js             cn() utility (clsx + tailwind-merge)
        ├── components/
        │   ├── Layout.jsx            Responsive sidebar with mobile hamburger menu
        │   ├── StandingsTable.jsx    Driver/constructor standings with gap bars
        │   ├── PointsProgression.jsx Cumulative points line chart
        │   ├── TeammateComparison.jsx H2H comparison cards
        │   ├── TimingTower.jsx       Live timing tower (pit wall style)
        │   ├── TrackMap.jsx          Circuit map with telemetry overlay
        │   ├── TelemetryChart.jsx    Speed/throttle/brake charts
        │   ├── LapComparison.jsx     Delta time comparison
        │   ├── LiveTrackMap.jsx      Live driver positions on track
        │   ├── WeatherWidget.jsx     Track conditions display
        │   ├── RaceControlFeed.jsx   Race control messages
        │   ├── NewsCard.jsx          News article card
        │   └── LoadingSpinner.jsx    Loading indicator (legacy)
        │
        ├── components/ui/            shadcn/ui primitives + F1 compound components
        │   ├── card.jsx              Card, CardHeader, CardTitle, CardContent, CardFooter
        │   ├── badge.jsx             default/secondary/destructive/outline variants
        │   ├── button.jsx            7 variants + 4 sizes
        │   ├── tabs.jsx              Radix Tabs wrapper
        │   ├── select.jsx            Radix Select wrapper
        │   ├── separator.jsx         Horizontal/vertical separator
        │   ├── skeleton.jsx          Animated loading placeholder
        │   ├── tooltip.jsx           Radix Tooltip wrapper
        │   ├── scroll-area.jsx       Radix ScrollArea wrapper
        │   ├── kpi-card.jsx          Hero value + trend arrow + delta
        │   ├── data-card.jsx         Card with header icon + title + action slot
        │   ├── stat-row.jsx          Label + value + optional badge
        │   ├── sparkline.jsx         Tiny SVG line chart
        │   ├── tyre-badge.jsx        Colored pill for compound (S/M/H/I/W)
        │   ├── flag-badge.jsx        Race control flag badges
        │   ├── gap-bar.jsx           Proportional fill bar for points gaps
        │   ├── empty-state.jsx       Icon + title + description + action
        │   └── page-header.jsx       Title + subtitle + right slot
        │
        ├── components/dashboard/     Dashboard-specific components
        │   ├── HeroKPIs.jsx          4 KPI cards (leader, wins, constructors, progress)
        │   ├── RecentRaceSummary.jsx  Latest race winner + events + badges
        │   ├── UpcomingRace.jsx      Next race countdown + circuit info
        │   └── RaceTimeline.jsx      3-card strip: last / next / upcoming
        │
        ├── components/race/          Race Analysis components (2018+ FastF1 data)
        │   ├── RaceSummaryCard.jsx   Winner, events, circuit & conditions
        │   ├── StrategyTimeline.jsx  Horizontal stint bars by compound
        │   ├── SectorAnalysis.jsx    Sector times with purple highlights
        │   ├── TyreDegradation.jsx   Lap time vs tyre life curves
        │   └── RaceConditions.jsx    Weather chart + race control feed
        │
        ├── pages/                    6 route pages
        │   ├── Dashboard.jsx         KPIs, race timeline, standings, progression
        │   ├── History.jsx           Race Analysis with 9 tabbed views
        │   ├── RaceMap.jsx           Telemetry & circuit visualization
        │   ├── LiveTiming.jsx        Real-time session companion
        │   ├── Predictions.jsx       Podium probability forecasts
        │   └── News.jsx              Aggregated F1 news with source tabs
        │
        ├── hooks/
        │   ├── useApi.js             REST API data fetching
        │   └── useWebSocket.js       WebSocket connection management
        └── utils/
            ├── teams.js              Team colors, names, driver mappings
            ├── colors.js             Position, status, tire, sector color maps
            └── format.js             Lap times, positions, driver names formatting
```

## Architecture

```
Browser ──── React SPA (Vite + Tailwind + Recharts + Plotly.js)
               │
               ├── REST (/api/*) ──── FastAPI (26 historical + live + news + predictions)
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
| FastF1 | Telemetry, circuit maps, stints, sectors, weather, race control (2018+) | On-demand, cached locally |
| RSS Feeds | News from Motorsport.com, Autosport, PlanetF1, etc. | Every 15 min |

## New in v2.0: API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/historical/race-summary/{year}/{round}` | Winner, margin, safety cars, weather, DNFs, pit count |
| `GET /api/historical/stints/{year}/{round}` | Per-driver stint list (compound, lap range, tyre age) |
| `GET /api/historical/sectors/{year}/{round}/{session}` | Best sectors, speed traps, theoretical best lap |
| `GET /api/historical/weather/{year}/{round}/{session}` | Temperature, humidity, rainfall time series |
| `GET /api/historical/race-control/{year}/{round}/{session}` | Flags, safety cars, penalties with driver codes |
| `GET /api/historical/tyre-performance/{year}/{round}` | Avg lap time by compound vs tyre life |
| `GET /api/historical/circuit-info/{year}/{round}` | Track metadata + full session schedule |

## First Run

On first startup, the background sync populates historical data from Jolpica API (last 3 seasons). This takes a few minutes due to rate limiting. Subsequent starts use cached data and only sync recent race results.

FastF1 telemetry is fetched on-demand and cached locally. First request for a session takes 10-30 seconds.

## Configuration

Copy `.env.example` to `.env` to customize:

- `FASTF1_CACHE_DIR` — Cache location (default: `./cache/fastf1`)
- `DATABASE_URL` — Database path (default: `sqlite:///./f1_data.db`)

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, APScheduler, httpx
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, Recharts, Radix UI, Plotly.js, Lucide icons
- **UI System**: shadcn/ui pattern (CVA + clsx + tailwind-merge)
- **ML**: scikit-learn (Gradient Boosting Classifier)
- **Database**: SQLite with WAL mode
