import os
import sys
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("f1-dashboard")

# Add project root to path so imports work
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.database import engine, SessionLocal
from backend.models import Base
from backend.routers import historical as historical_router


FRONTEND_DIR = PROJECT_ROOT / "frontend" / "dist"


class SPAStaticFiles(StaticFiles):
    """Serves static files and falls back to index.html for SPA routing."""

    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as ex:
            if ex.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    # Migrate existing databases: add new columns if they don't exist yet.
    # SQLite raises an error on duplicate ADD COLUMN — we catch and ignore those.
    from sqlalchemy import text as _text
    _migration_stmts = [
        "ALTER TABLE races ADD COLUMN has_sprint BOOLEAN DEFAULT 0",
        "ALTER TABLE races ADD COLUMN sprint_date VARCHAR(20)",
        "ALTER TABLE races ADD COLUMN sprint_time VARCHAR(20)",
        "ALTER TABLE races ADD COLUMN qualifying_format VARCHAR(20) DEFAULT 'KNOCKOUT'",
    ]
    with engine.connect() as _conn:
        for _stmt in _migration_stmts:
            try:
                _conn.execute(_text(_stmt))
                _conn.commit()
            except Exception:
                pass  # Column already exists
    logger.info("Database migration complete")

    # Enable FastF1 cache
    cache_dir = os.getenv("FASTF1_CACHE_DIR", "./cache/fastf1")
    os.makedirs(cache_dir, exist_ok=True)
    try:
        import fastf1
        fastf1.Cache.enable_cache(cache_dir)
        logger.info(f"FastF1 cache enabled at {cache_dir}")
    except Exception as e:
        logger.warning(f"Could not enable FastF1 cache: {e}")

    # Start APScheduler
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    scheduler = AsyncIOScheduler()
    app.state.scheduler = scheduler
    app.state.session_factory = SessionLocal

    # Import and start data sync
    try:
        from backend.data_sync import DataSyncManager
        sync_manager = DataSyncManager(SessionLocal)
        app.state.sync_manager = sync_manager
        sync_manager.register_jobs(scheduler)
        logger.info("Data sync manager initialized")
    except ImportError:
        logger.info("Data sync module not yet available, skipping")

    # Import and start live data poller
    try:
        from backend.live_data import LiveTimingPoller, ConnectionManager
        ws_manager = ConnectionManager()
        app.state.ws_manager = ws_manager
        live_poller = LiveTimingPoller(ws_manager, SessionLocal)
        app.state.live_poller = live_poller
        live_poller.register_jobs(scheduler)
        logger.info("Live data poller initialized")
    except ImportError:
        logger.info("Live data module not yet available, skipping")

    # Import and start news fetcher
    try:
        from backend.news_fetcher import NewsFetcher
        news_fetcher = NewsFetcher(SessionLocal)
        app.state.news_fetcher = news_fetcher
        news_fetcher.register_jobs(scheduler)
        logger.info("News fetcher initialized")
    except ImportError:
        logger.info("News fetcher module not yet available, skipping")

    # Import and initialize predictor
    try:
        from backend.predictor import F1Predictor
        predictor = F1Predictor(SessionLocal)
        app.state.predictor = predictor
        logger.info("Predictor initialized")
    except ImportError:
        logger.info("Predictor module not yet available, skipping")

    scheduler.start()
    logger.info("APScheduler started")

    yield

    # --- Shutdown ---
    scheduler.shutdown(wait=False)
    engine.dispose()
    logger.info("Shutdown complete")


app = FastAPI(
    title="F1 Dashboard API",
    description="Formula 1 Analytics & Live Companion Dashboard",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers (BEFORE static files so /api/* takes precedence)
app.include_router(historical_router.router)

# Late-bind optional routers
try:
    from backend.routers import live as live_router
    app.include_router(live_router.router)
    app.include_router(live_router.ws_router)
except ImportError:
    pass

try:
    from backend.routers import predictions as predictions_router
    app.include_router(predictions_router.router)
except ImportError:
    pass

try:
    from backend.routers import news as news_router
    app.include_router(news_router.router)
except ImportError:
    pass


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "database": "connected",
        "frontend": FRONTEND_DIR.exists(),
    }


# Mount frontend static files (must be LAST)
if FRONTEND_DIR.exists():
    app.mount("/", SPAStaticFiles(directory=str(FRONTEND_DIR), html=True), name="spa")
    logger.info(f"Serving frontend from {FRONTEND_DIR}")
else:
    logger.warning(
        f"Frontend build not found at {FRONTEND_DIR}. "
        "Run 'cd frontend && npm install && npm run build' to build the frontend."
    )

    @app.get("/")
    def no_frontend():
        return {
            "message": "F1 Dashboard API is running. Frontend not built yet.",
            "instructions": "Run 'cd frontend && npm install && npm run build' then restart.",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
