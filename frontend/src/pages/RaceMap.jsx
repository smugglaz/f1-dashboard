import { useState, useEffect } from 'react'
import { useApi, fetchApi } from '../hooks/useApi'
import TrackMap from '../components/TrackMap'
import TelemetryChart from '../components/TelemetryChart'
import LapComparison from '../components/LapComparison'
import LoadingSpinner from '../components/LoadingSpinner'
import { getTeamColor } from '../utils/teams'

const SESSIONS = ['R', 'Q', 'FP3', 'FP2', 'FP1']

export default function RaceMap() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [round, setRound] = useState(1)
  const [session, setSession] = useState('R')
  const [colorMode, setColorMode] = useState('speed')
  const [selectedDrivers, setSelectedDrivers] = useState([])
  const [driverColors, setDriverColors] = useState([])
  const [telemetryData, setTelemetryData] = useState([])
  const [loadingTel, setLoadingTel] = useState(false)

  const { data: racesData } = useApi(`/api/historical/races/${year}`)
  const races = racesData?.races || []
  const { data: circuit, loading: loadingCircuit } = useApi(`/api/historical/circuit/${year}/${round}`)

  useEffect(() => { setRound(1); setSelectedDrivers([]) }, [year])
  useEffect(() => { setSelectedDrivers([]) }, [round, session])

  useEffect(() => {
    fetchApi(`/api/historical/driver-colors/${year}/${round}/${session}`)
      .then(data => setDriverColors(data?.drivers || (Array.isArray(data) ? data : [])))
      .catch(() => setDriverColors([]))
  }, [year, round, session])

  useEffect(() => {
    if (selectedDrivers.length === 0) { setTelemetryData([]); return }
    setLoadingTel(true)
    const params = `drivers=${selectedDrivers.join(',')}`
    fetchApi(`/api/historical/lap-comparison/${year}/${round}/${session}?${params}`)
      .then(data => setTelemetryData(data?.drivers || (Array.isArray(data) ? data : [])))
      .catch(() => setTelemetryData([]))
      .finally(() => setLoadingTel(false))
  }, [year, round, session, selectedDrivers])

  const toggleDriver = (code) => {
    setSelectedDrivers(prev =>
      prev.includes(code) ? prev.filter(d => d !== code) : [...prev, code]
    )
  }

  const yearList = Array.from({ length: currentYear - 2017 }, (_, i) => currentYear - i)

  // Build title from selected race
  const selectedRace = races.find(r => r.round === round)
  const circuitTitle = selectedRace
    ? `${selectedRace.circuit?.name || selectedRace.name} — ${year} ${session}`
    : ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Track Map & Telemetry</h1>
        <div className="flex gap-2">
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="bg-f1-card border border-f1-border rounded px-3 py-1.5 text-sm">
            {yearList.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={round} onChange={e => setRound(Number(e.target.value))}
            className="bg-f1-card border border-f1-border rounded px-3 py-1.5 text-sm">
            {races.map(r => (
              <option key={r.round} value={r.round}>R{r.round} — {r.name}</option>
            ))}
          </select>
          <select value={session} onChange={e => setSession(e.target.value)}
            className="bg-f1-card border border-f1-border rounded px-3 py-1.5 text-sm">
            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Driver selector — team color dots + abbreviation */}
      <div className="flex flex-wrap gap-2">
        {driverColors.map(d => {
          const isSelected = selectedDrivers.includes(d.abbreviation)
          const teamColor = d.color || getTeamColor(d.team || '')
          return (
            <button
              key={d.abbreviation}
              onClick={() => toggleDriver(d.abbreviation)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-colors ${
                isSelected
                  ? 'border-transparent text-white'
                  : 'border-f1-border text-f1-muted hover:text-f1-text'
              }`}
              style={isSelected ? { backgroundColor: teamColor } : {}}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.6)' : teamColor }}
              />
              {d.abbreviation}
            </button>
          )
        })}
        {driverColors.length === 0 && (
          <div className="text-f1-muted text-sm">Select a session to see available drivers</div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Circuit Map</h2>
            <select value={colorMode} onChange={e => setColorMode(e.target.value)}
              className="bg-f1-dark border border-f1-border rounded px-2 py-1 text-xs">
              <option value="speed">🏎 Speed</option>
              <option value="throttle">⚡ Throttle</option>
              <option value="brake">🔴 Brake</option>
              <option value="gear">⚙ Gear</option>
            </select>
          </div>
          {loadingCircuit ? <LoadingSpinner /> : (
            <TrackMap
              trackData={circuit?.track}
              telemetryData={telemetryData}
              colorMode={colorMode}
              corners={circuit?.corners || []}
              title={circuitTitle}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
            <h2 className="text-lg font-semibold mb-2">Speed Trace</h2>
            {loadingTel ? <LoadingSpinner /> : <TelemetryChart drivers={telemetryData} />}
          </div>
          <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
            <h2 className="text-lg font-semibold mb-2">Lap Delta</h2>
            {loadingTel ? <LoadingSpinner /> : <LapComparison drivers={telemetryData} />}
          </div>
        </div>
      </div>

      <div className="text-f1-muted text-xs text-center">
        Telemetry data provided by FastF1. Data availability depends on session type and year.
      </div>
    </div>
  )
}
