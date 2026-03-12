from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.live_data import ConnectionManager

router = APIRouter(prefix="/api/live", tags=["live"])


@router.get("/session")
async def get_session():
    from backend.main import app
    poller = getattr(app.state, "live_poller", None)
    if not poller:
        return {"status": "no_active_session"}
    session = poller.get_current_session()
    if not session:
        return {"status": "no_active_session"}
    return {
        "session_key": session.get("session_key"),
        "session_name": session.get("session_name"),
        "session_type": session.get("session_type"),
        "status": session.get("status"),
        "circuit": session.get("circuit_short_name"),
        "country": session.get("country_name"),
        "date_start": session.get("date_start"),
        "date_end": session.get("date_end"),
    }


@router.get("/timing")
async def get_timing():
    from backend.main import app
    poller = getattr(app.state, "live_poller", None)
    if not poller:
        return {"status": "no_active_session", "timing": []}
    state = poller.get_latest_state()
    return state if state else {"status": "no_active_session", "timing": []}


@router.get("/weather")
async def get_weather():
    from backend.main import app
    poller = getattr(app.state, "live_poller", None)
    if not poller:
        return {}
    state = poller.get_latest_state()
    return state.get("weather", {})


@router.get("/race-control")
async def get_race_control():
    from backend.main import app
    poller = getattr(app.state, "live_poller", None)
    if not poller:
        return {"messages": []}
    state = poller.get_latest_state()
    return {"messages": state.get("race_control", [])}


# WebSocket endpoint (mounted at /ws/live-timing, not under /api/live)
ws_router = APIRouter(tags=["live-ws"])


@ws_router.websocket("/ws/live-timing")
async def live_timing_ws(websocket: WebSocket):
    from backend.main import app
    ws_manager = getattr(app.state, "ws_manager", None)
    if not ws_manager:
        await websocket.close(code=1011, reason="Live data not available")
        return

    await ws_manager.connect(websocket)
    try:
        # Send current state immediately on connect
        poller = getattr(app.state, "live_poller", None)
        if poller:
            state = poller.get_latest_state()
            if state:
                await websocket.send_json(state)
            else:
                await websocket.send_json({"type": "status", "status": "no_active_session"})

        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception:
        await ws_manager.disconnect(websocket)
