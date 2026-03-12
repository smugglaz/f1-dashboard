import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { useWebSocket } from '../hooks/useWebSocket'
import TimingTower from '../components/TimingTower'
import WeatherWidget from '../components/WeatherWidget'
import RaceControlFeed from '../components/RaceControlFeed'
import LiveTrackMap from '../components/LiveTrackMap'
import LoadingSpinner from '../components/LoadingSpinner'

const SESSION_LABELS = {
  'Practice 1': 'FP1', 'Practice 2': 'FP2', 'Practice 3': 'FP3',
  'Qualifying': 'QUALI', 'Sprint Qualifying': 'SQ',
  'Sprint': 'SPRINT', 'Race': 'RACE',
}

export default function LiveTiming() {
  const { data: sessionInfo, loading: loadingSession, refetch: refetchSession } = useApi('/api/live/session')
  const { data: restTiming } = useApi('/api/live/timing')
  const { data: weather, refetch: refetchWeather } = useApi('/api/live/weather')
  const { data: raceControl, refetch: refetchRC } = useApi('/api/live/race-control')

  const [timing, setTiming] = useState([])

  // useWebSocket expects just the path — it prepends protocol+host internally
  const { data: wsData, status: wsStatus } = useWebSocket('/ws/live-timing')
  const wsConnected = wsStatus === 'connected'

  // Merge WebSocket timing updates into state
  useEffect(() => {
    if (wsData?.timing) {
      setTiming(prev => {
        const map = new Map(prev.map(d => [d.driver_number, d]))
        for (const d of wsData.timing) {
          map.set(d.driver_number, { ...map.get(d.driver_number), ...d })
        }
        return Array.from(map.values())
      })
    }
  }, [wsData])

  // Use REST timing as initial data
  useEffect(() => {
    const restArr = restTiming?.timing || (Array.isArray(restTiming) ? restTiming : [])
    if (restArr.length && !timing.length) setTiming(restArr)
  }, [restTiming])

  // Periodically refresh weather + race control via REST
  useEffect(() => {
    const id = setInterval(() => {
      refetchWeather()
      refetchRC()
    }, 15000)
    return () => clearInterval(id)
  }, [])

  const isActive = sessionInfo && sessionInfo.status !== 'no_active_session'

  if (loadingSession) return <LoadingSpinner />

  // Extract nested arrays from API responses
  const rcMessages = raceControl?.messages || (Array.isArray(raceControl) ? raceControl : [])

  // Build position data for LiveTrackMap from timing entries
  const positions = timing
    .filter(d => d.x != null && d.y != null)
    .map(d => ({
      driver_number: d.driver_number,
      abbreviation: d.abbreviation || d.name_acronym || '',
      team_colour: d.team_colour || d.team_color || '',
      x: d.x,
      y: d.y,
    }))

  // Session type badge
  const sessionLabel = sessionInfo?.session_name
    ? SESSION_LABELS[sessionInfo.session_name] || sessionInfo.session_name
    : ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Live Timing</h1>
            {isActive && sessionLabel && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-f1-red/20 text-f1-red rounded uppercase tracking-wider">
                {sessionLabel}
              </span>
            )}
          </div>
          {isActive && (
            <div className="text-f1-muted text-sm mt-1">
              {sessionInfo.session_name} &middot; {sessionInfo.circuit} {sessionInfo.country}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${wsConnected ? 'text-green-400' : 'text-f1-muted'}`}>
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse-dot' : 'bg-gray-500'}`} />
            {wsConnected ? 'LIVE' : wsStatus === 'reconnecting' ? 'RECONNECTING' : 'DISCONNECTED'}
          </div>
          <button
            onClick={refetchSession}
            className="px-3 py-1.5 text-xs bg-f1-card border border-f1-border rounded hover:bg-white/5"
          >
            Refresh
          </button>
        </div>
      </div>

      {!isActive ? (
        <div className="bg-f1-card rounded-lg p-12 border border-f1-border text-center">
          <div className="text-4xl mb-4">🏁</div>
          <div className="text-xl font-semibold mb-2">No Active Session</div>
          <div className="text-f1-muted">
            Live timing will appear here during practice, qualifying, and race sessions.
          </div>
          <button
            onClick={refetchSession}
            className="mt-4 px-4 py-2 bg-f1-red text-white rounded hover:bg-red-700 text-sm"
          >
            Check Again
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
              <h2 className="text-sm font-semibold text-f1-muted mb-3">WEATHER</h2>
              <WeatherWidget weather={weather} />
            </div>
            <div className="lg:col-span-2 bg-f1-card rounded-lg p-4 border border-f1-border">
              <h2 className="text-sm font-semibold text-f1-muted mb-3">RACE CONTROL</h2>
              <RaceControlFeed messages={rcMessages} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
            <div className="xl:col-span-3 bg-f1-card rounded-lg p-4 border border-f1-border">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-f1-muted">TIMING TOWER</h2>
                {timing.length > 0 && (
                  <span className="text-[10px] text-f1-muted font-mono">
                    {timing.length} drivers
                  </span>
                )}
              </div>
              <TimingTower timing={timing} />
            </div>
            <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
              <h2 className="text-sm font-semibold text-f1-muted mb-3">TRACK MAP</h2>
              <LiveTrackMap positions={positions} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
