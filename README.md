# F1 Analytics & Live Companion Dashboard v3.0

A full-stack Formula 1 analytics platform — historical research tool (1950-present), real-time race companion, and narrative race storytelling with strategy, sector, and tyre insights. Redesigned with macOS Tahoe-inspired Liquid Glass aesthetics.

## Quick Start

**Windows (recommended):** Double-click `launch.bat` in the parent folder. It starts both backend and frontend dev servers, waits for health checks, and opens your browser automatically.

**Manual:**

```bash
# Terminal 1 — Backend
cd f1-dashboard
pip install -r requirements.txt
python main.py

# Terminal 2 — Frontend (dev mode with hot reload)
cd f1-dashboard/frontend
npm install
npm run dev
```

Open http://localhost:5173 (dev) or http://localhost:8000 (production build)

## Features

| Page | What it does |
|------|-------------|
| **Dashboard** | Hero KPIs, horizontal race timeline strip, championship standings with gap bars, points progression, teammate H2H comparison |
| **Season Overview** | Grid of race cards per season with "View Race Story" links, toggle to detailed 9-tab analysis (results, qualifying, pit stops, strategy, sectors, tyres, weather) |
| **Race Story** | Scrollable 5-section narrative: The Stage, The Strategy, The Race Unfolds, The Winning Package, The Numbers |
| **Track Map** | Circuit visualization with speed/throttle/brake/gear overlays, multi-driver lap comparison (2018+) |
| **Live Timing** | Real-time timing tower, weather, race control messages during active F1 sessions |
| **Predictions** | ML-powered podium probability forecasts with model transparency |
| **News** | Aggregated RSS feeds from major F1 outlets with source filtering |

### v3.0 — The Liquid Glass Redesign

- **macOS Tahoe Liquid Glass design system** — Frosted translucent panels (`backdrop-filter: blur(20px) saturate(1.8)`), layered depth, Inter typography, warm gradient canvas
- **Race Story page** — Single scrollable narrative replacing tab-based analysis: circuit/weather setup, strategy overview, position chart with key moments, winning driver analysis, full results on demand
- **Season Overview** — Grid of clickable race cards with dual-view toggle (overview grid / detailed analysis)
- **Unified chart theming** — All Plotly and Recharts visualizations share a single glass-compatible theme
- **Scroll reveal animations** — IntersectionObserver-powered fade-in sections with `prefers-reduced-motion` support
- **Apple HIG typography scale** — 34px large title down to 11px caption, Inter font throughout
- **One-click launch** — Updated `launch.bat` starts both backend + Vite dev server with health polling

### v2.0 Highlights

- **shadcn/ui component system** — Card, Badge, Button, Tabs, Select, Skeleton, Tooltip, and 9 F1-specific compound components
- **7 API endpoints** — race-summary, stints, sectors, weather, race-control, tyre-performance, circuit-info
- **Race Analysis deep-dive** — Strategy stints timeline, sector dominance table, tyre degradation curves, weather + race control feed
- **Responsive layout** — Mobile hamburger menu with slide-out sidebar
- **Skeleton loading states** — Contextual loading placeholders instead of generic spinners

## Project Structure

```
f1-dashboard/
├── main.py                  Entry point (starts uvicorn on port 8000)
├── requirements.txt         Python dependencies
├── f1_data.db               SQLite database (~91 MB, auto-created on first run)
│
├── backend/
│   ├── main.py              FastAPI app, lifespan, middleware, route mounting
│   ├── models.py            SQLAlchemy ORM models
│   ├── database.py          SQLite connection (WAL mode)
│   ├── data_sync.py         Background sync: Jolpica API → database
│   ├── live_data.py         OpenF1 live polling → WebSocket broadcast
│   ├── fastf1_service.py    Telemetry & circuit data service
│   ├── news_fetcher.py      RSS feed aggregator
│   ├── predictor.py         Gradient Boosting podium predictor
│   └── routers/
│       ├── historical.py    26 routes: standings, results, telemetry, stints, etc.
│       ├── live.py          /api/live/*, /ws/timing (WebSocket)
│       ├── news.py          /api/news
│       └── predictions.py   /api/predictions
│
└── frontend/
    ├── package.json         React 19, Vite 7, Tailwind 4, Recharts, Plotly.js
    ├── vite.config.js       Dev server proxy + build config + @ alias
    ├── index.html           HTML shell (Inter font via Google Fonts CDN)
    └── src/
        ├── App.jsx          Router: 7 pages + legacy redirects
        ├── index.css        Liquid Glass design system (@theme tokens, glass utilities, animations)
        │
        ├── hooks/
        │   ├── useApi.js             REST API data fetching
        │   ├── useWebSocket.js       WebSocket connection management
        │   ├── useRaceStoryData.js   Parallel API fetcher for Race Story (11 endpoints)
        │   └── useScrollReveal.js    IntersectionObserver scroll reveal hook
        │
        ├── utils/
        │   ├── teams.js              Team colors, names, driver mappings
        │   ├── colors.js             Position, status, tire, sector color maps + GLASS_COLORS
        │   ├── format.js             Lap times, positions, driver names formatting
        │   └── chartTheme.js         Unified Plotly + Recharts glass theme
        │
        ├── components/
        │   ├── Layout.jsx            Fixed glass sidebar, responsive mobile overlay
        │   ├── StandingsTable.jsx    Standings with gap bars
        │   ├── PointsProgression.jsx Cumulative points chart
        │   ├── TeammateComparison.jsx H2H comparison cards
        │   ├── TrackMap.jsx          Circuit map with telemetry overlay
        │   ├── TelemetryChart.jsx    Speed/throttle/brake charts
        │   ├── LapComparison.jsx     Delta time comparison
        │   ├── TimingTower.jsx       Live timing tower
        │   ├── LiveTrackMap.jsx      Live driver positions on track
        │   ├── WeatherWidget.jsx     Track conditions display
        │   ├── RaceControlFeed.jsx   Race control messages
        │   ├── NewsCard.jsx          Glass news article card
        │   └── LoadingSpinner.jsx    Loading indicator
        │
        ├── components/ui/            shadcn/ui primitives (glass-themed)
        │   ├── card.jsx, badge.jsx, button.jsx, tabs.jsx, select.jsx
        │   ├── skeleton.jsx, tooltip.jsx, separator.jsx, scroll-area.jsx
        │   ├── kpi-card.jsx, data-card.jsx, stat-row.jsx, sparkline.jsx
        │   ├── tyre-badge.jsx, flag-badge.jsx, gap-bar.jsx
        │   ├── empty-state.jsx, page-header.jsx
        │   └── ...
        │
        ├── components/dashboard/     Dashboard-specific
        │   ├── HeroKPIs.jsx, RecentRaceSummary.jsx
        │   ├── UpcomingRace.jsx, RaceTimeline.jsx
        │   └── ...
        │
        ├── components/race/          Race Analysis (2018+ FastF1 data)
        │   ├── RaceSummaryCard.jsx, StrategyTimeline.jsx
        │   ├── SectorAnalysis.jsx, TyreDegradation.jsx
        │   ├── RaceConditions.jsx
        │   └── ...
        │
        ├── components/race-story/    Race Story narrative sections
        │   ├── StageSection.jsx      Circuit, weather, starting grid
        │   ├── StrategySection.jsx   Stint overview + summary
        │   ├── UnfoldsSection.jsx    Position chart + key moments
        │   ├── WinningPackageSection.jsx  Pace, tyres, pit analysis
        │   ├── NumbersSection.jsx    Full results (collapsed by default)
        │   ├── StoryNav.jsx          Floating scroll progress dots
        │   ├── RaceBreadcrumb.jsx    Breadcrumb with prev/next nav
        │   ├── KeyMoments.jsx        Safety car/flag timeline
        │   ├── StartingGrid.jsx      Visual 2-wide grid formation
        │   └── WinnerInsight.jsx     Auto-generated narrative
        │
        └── pages/
            ├── Dashboard.jsx         KPIs, timeline, standings, progression
            ├── History.jsx           Season Overview grid + detailed analysis toggle
            ├── RaceStory.jsx         5-section scrollable race narrative
            ├── RaceMap.jsx           Telemetry & circuit visualization
            ├── LiveTiming.jsx        Real-time session companion
            ├── Predictions.jsx       Podium probability forecasts
            └── News.jsx              Aggregated F1 news
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

## Design System

The v3.0 UI follows macOS Tahoe Liquid Glass principles:

- **Glass panels**: `backdrop-filter: blur(20px) saturate(1.8)` with translucent white backgrounds
- **Warm canvas**: Fixed gradient from `#faf9f6` to `#ecedf0`
- **Typography**: Inter font, Apple HIG scale (34px large title → 11px caption)
- **Label hierarchy**: `#1d1d1f` primary, `#86868b` secondary, `#aeaeb2` tertiary
- **Animations**: Spring-in transitions, scroll reveal, card hover lift
- **Accessibility**: `prefers-reduced-motion` disables animations, `prefers-contrast: more` increases glass opacity

## Data Sources

| Source | Purpose | Polling |
|--------|---------|---------|
| Jolpica API | Historical results, standings, pit stops (1950-present) | On startup + every 60 min |
| OpenF1 API | Live timing, positions, intervals, weather | Every 10s during active sessions |
| FastF1 | Telemetry, circuit maps, stints, sectors, weather, race control (2018+) | On-demand, cached locally |
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
- **Frontend**: React 19, Vite 7, Tailwind CSS 4, Recharts, Radix UI, Plotly.js, Lucide icons
- **UI System**: shadcn/ui pattern (CVA + clsx + tailwind-merge) + Liquid Glass design tokens
- **ML**: scikit-learn (Gradient Boosting Classifier)
- **Database**: SQLite with WAL mode
