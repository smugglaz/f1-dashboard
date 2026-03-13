import { useState, useEffect, useMemo } from 'react'
import { useApi } from '../hooks/useApi'
import StandingsTable from '../components/StandingsTable'
import PointsProgression from '../components/PointsProgression'
import TeammateComparison from '../components/TeammateComparison'
import DriverStatsCard from '../components/DriverStatsCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatCountdown } from '../utils/format'
import { getTeamColor } from '../utils/teams'

export default function Dashboard() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const { data: seasonsData } = useApi('/api/historical/seasons')
  const { data: driverData, loading: loadingD } = useApi(`/api/historical/standings/drivers/${year}`)
  const { data: constructorData, loading: loadingC } = useApi(`/api/historical/standings/constructors/${year}`)
  const { data: racesData, loading: loadingR } = useApi(`/api/historical/races/${year}`)

  const seasons = seasonsData?.seasons || []
  const driverStandings = driverData?.standings || []
  const constructorStandings = constructorData?.standings || []
  const races = racesData?.races || []

  const nextRace = useMemo(() => {
    if (!races.length) return null
    const now = new Date()
    return races.find(r => new Date(r.date) > now) || null
  }, [races])

  const lastCompletedRace = useMemo(() => {
    if (!races.length) return null
    const now = new Date()
    const past = races.filter(r => new Date(r.date) <= now && r.winner)
    return past.length ? past[past.length - 1] : null
  }, [races])

  const [countdown, setCountdown] = useState('')
  useEffect(() => {
    if (!nextRace) return
    const update = () => setCountdown(formatCountdown(nextRace.date))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [nextRace])

  // Always show full year range
  const yearList = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i)
  const now = new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">F1 Dashboard</h1>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="bg-f1-card border border-f1-border rounded px-3 py-1.5 text-sm"
        >
          {yearList.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Hero cards: Next Race + Last Winner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {nextRace && (
          <div className="bg-f1-card rounded-lg p-5 border border-f1-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-f1-muted text-xs uppercase tracking-wider">Next Race</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-f1-red/20 text-f1-red rounded">
                ROUND {nextRace.round}
              </span>
            </div>
            <div className="text-xl font-bold">{nextRace.name}</div>
            <div className="text-f1-muted text-sm mt-1">
              {nextRace.circuit?.name} &middot; {new Date(nextRace.date).toLocaleDateString()}
            </div>
            <div className="text-f1-red font-mono text-lg mt-2">{countdown}</div>
          </div>
        )}
        {lastCompletedRace && lastCompletedRace.winner && (
          <div className="bg-f1-card rounded-lg p-5 border border-f1-border">
            <div className="text-f1-muted text-xs uppercase tracking-wider mb-1">Last Race Winner</div>
            <div className="flex items-center gap-3">
              <div
                className="w-1.5 h-10 rounded-full"
                style={{ backgroundColor: getTeamColor(lastCompletedRace.winner.constructor || '') }}
              />
              <div>
                <div className="text-xl font-bold">
                  {lastCompletedRace.winner.name || lastCompletedRace.winner.code}
                </div>
                <div className="text-f1-muted text-sm">
                  {lastCompletedRace.winner.constructor} &middot; {lastCompletedRace.name}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* If no next race, show single-column last winner or nothing */}
        {!nextRace && !lastCompletedRace && null}
      </div>

      {/* Standings side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
          <h2 className="text-lg font-semibold mb-3">Driver Standings — {year}</h2>
          {loadingD ? <LoadingSpinner /> : (
            <StandingsTable data={driverStandings} type="driver" />
          )}
        </div>
        <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
          <h2 className="text-lg font-semibold mb-3">Constructor Standings — {year}</h2>
          {loadingC ? <LoadingSpinner /> : (
            <StandingsTable data={constructorStandings} type="constructor" />
          )}
        </div>
      </div>

      {/* Championship Points Progression */}
      <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
        <h2 className="text-lg font-semibold mb-3">Championship Progression — {year}</h2>
        <PointsProgression year={year} />
      </div>

      {/* Driver Season Stats */}
      {driverStandings.length > 0 && (
        <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Driver Season Stats</h2>
            <select
              value={selectedDriver || ''}
              onChange={e => setSelectedDriver(e.target.value || null)}
              className="bg-f1-dark border border-f1-border rounded px-2 py-1 text-xs"
            >
              <option value="">Select driver...</option>
              {driverStandings.map(s => (
                <option key={s.driver.id} value={s.driver.id}>
                  {s.driver.code} — {s.driver.name}
                </option>
              ))}
            </select>
          </div>
          {selectedDriver ? (
            <DriverStatsCard year={year} driverId={selectedDriver} />
          ) : (
            <p className="text-sm text-f1-muted text-center py-3">Select a driver to view season statistics</p>
          )}
        </div>
      )}

      {/* Teammate Comparison */}
      <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
        <h2 className="text-lg font-semibold mb-3">Teammate Comparison — {year}</h2>
        <TeammateComparison year={year} />
      </div>

      {/* Race Calendar with winners */}
      <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
        <h2 className="text-lg font-semibold mb-3">Race Calendar — {year}</h2>
        {loadingR ? <LoadingSpinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-f1-border text-f1-muted text-[10px] tracking-wider uppercase">
                  <th className="py-2 px-3 text-left">RND</th>
                  <th className="py-2 px-3 text-left">RACE</th>
                  <th className="py-2 px-3 text-left">CIRCUIT</th>
                  <th className="py-2 px-3 text-left">DATE</th>
                  <th className="py-2 px-3 text-left">WINNER</th>
                </tr>
              </thead>
              <tbody>
                {races.map(r => {
                  const raceDate = new Date(r.date)
                  const isPast = raceDate < now
                  const isNext = nextRace && r.round === nextRace.round
                  const winner = r.winner
                  const teamColor = winner ? getTeamColor(winner.constructor || '') : null

                  return (
                    <tr
                      key={r.round}
                      className={`border-b border-f1-border/30 hover:bg-white/5 transition-colors ${
                        isPast && !isNext ? 'opacity-60' : ''
                      } ${isNext ? 'bg-f1-red/5' : ''}`}
                    >
                      <td className="py-2 px-3 font-mono">
                        <div className="flex items-center gap-2">
                          {r.round}
                          {isNext && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-f1-red text-white rounded">NEXT</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-medium">{r.name}</td>
                      <td className="py-2 px-3 text-f1-muted">{r.circuit?.name}</td>
                      <td className="py-2 px-3 text-f1-muted">
                        {r.date ? new Date(r.date).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-2 px-3">
                        {winner ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-1 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: teamColor || '#555' }}
                            />
                            <span className="font-mono text-xs font-bold">{winner.code}</span>
                            <span className="text-f1-muted text-xs hidden sm:inline">
                              {winner.name ? winner.name.split(' ').slice(-1)[0] : ''}
                            </span>
                          </div>
                        ) : (
                          isPast ? <span className="text-f1-muted text-xs">—</span> : ''
                        )}
                      </td>
                    </tr>
                  )
                })}
                {races.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-f1-muted">No race data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
