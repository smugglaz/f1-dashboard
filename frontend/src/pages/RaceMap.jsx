import { useState, useEffect } from 'react'
import { useApiQuery } from '../hooks/useApiQuery'
import { fetchApi } from '../hooks/useApi'
import TrackMap from '../components/TrackMap'
import TelemetryChart from '../components/TelemetryChart'
import LapComparison from '../components/LapComparison'
import { getTeamColor } from '../utils/teams'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { MapPin, Activity, TrendingDown } from 'lucide-react'

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

  const { data: racesData } = useApiQuery(`/api/historical/races/${year}`)
  const races = racesData?.races || []
  const { data: circuit, loading: loadingCircuit } = useApiQuery(`/api/historical/circuit/${year}/${round}`)

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

  const selectedRace = races.find(r => r.round === round)
  const circuitTitle = selectedRace
    ? `${selectedRace.circuit?.name || selectedRace.name} — ${year} ${session}`
    : ''

  return (
    <div className="space-y-6">
      <PageHeader title="Track Map & Telemetry" subtitle={circuitTitle || undefined}>
        <div className="flex gap-2">
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="bg-glass-bg border border-glass-border rounded-lg px-3 py-1.5 text-sm">
            {yearList.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={round} onChange={e => setRound(Number(e.target.value))}
            className="bg-glass-bg border border-glass-border rounded-lg px-3 py-1.5 text-sm">
            {races.map(r => (
              <option key={r.round} value={r.round}>R{r.round} — {r.name}</option>
            ))}
          </select>
          <select value={session} onChange={e => setSession(e.target.value)}
            className="bg-glass-bg border border-glass-border rounded-lg px-3 py-1.5 text-sm">
            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </PageHeader>

      {/* Driver selector */}
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
                  : 'border-glass-border text-label-tertiary hover:text-label-primary'
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
          <div className="text-label-tertiary text-sm">Select a session to see available drivers</div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-label-tertiary" />
                Circuit Map
              </CardTitle>
              <select value={colorMode} onChange={e => setColorMode(e.target.value)}
                className="bg-glass-bg border border-glass-border rounded-lg px-2 py-1 text-xs">
                <option value="speed">Speed</option>
                <option value="throttle">Throttle</option>
                <option value="brake">Brake</option>
                <option value="gear">Gear</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCircuit ? <Skeleton className="h-80 w-full" /> : (
              <TrackMap
                trackData={circuit?.track}
                telemetryData={telemetryData}
                colorMode={colorMode}
                corners={circuit?.corners || []}
                title={circuitTitle}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-label-tertiary" />
                Speed Trace
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTel ? <Skeleton className="h-48 w-full" /> : <TelemetryChart drivers={telemetryData} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="h-3.5 w-3.5 text-label-tertiary" />
                Lap Delta
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTel ? <Skeleton className="h-48 w-full" /> : <LapComparison drivers={telemetryData} />}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-label-tertiary text-xs text-center">
        Telemetry data provided by FastF1. Data availability depends on session type and year.
      </p>
    </div>
  )
}
