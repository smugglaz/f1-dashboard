import { useState, useEffect } from 'react'
import { useApi, fetchApi } from '../hooks/useApi'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  formatLapTime, parseLapTime, formatDriverName,
  formatPositionChange, formatStatus, formatPitDuration,
} from '../utils/format'
import { getPositionColor } from '../utils/colors'
import { getTeamColor } from '../utils/teams'

export default function History() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [round, setRound] = useState(1)
  const [tab, setTab] = useState('results')
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)

  const { data: racesData, loading: loadingRaces, refetch: refetchRaces } = useApi(`/api/historical/races/${year}`)
  const { data: raceDetailData, loading: loadingDetail } = useApi(`/api/historical/races/${year}/${round}`)
  const { data: qualData, loading: loadingQual } = useApi(
    tab === 'qualifying' ? `/api/historical/qualifying/${year}/${round}` : null
  )
  const { data: pitData, loading: loadingPits } = useApi(
    tab === 'pitstops' ? `/api/historical/pitstops/${year}/${round}` : null
  )

  const races = racesData?.races || []
  const selectedRace = races.find(r => r.round === round)
  const hasSprint = selectedRace?.has_sprint ?? false
  const qualFormat = selectedRace?.qualifying_format || 'KNOCKOUT'

  const { data: sprintData, loading: loadingSprint } = useApi(
    tab === 'sprint' && hasSprint ? `/api/historical/sprint/${year}/${round}` : null
  )
  const { data: sprintQualData, loading: loadingSprintQual } = useApi(
    tab === 'sprint-qualifying' && hasSprint ? `/api/historical/sprint-qualifying/${year}/${round}` : null
  )

  const raceInfo = raceDetailData?.race
  const results = raceDetailData?.results || []
  const qualResults = qualData?.results || []
  const pitStops = pitData?.stops || []
  const sprintResults = sprintData?.results || []
  const sprintQualResults = sprintQualData?.results || []

  useEffect(() => { setRound(1); setSyncError(null) }, [year])

  // Always show every season from 1950 to current year
  const yearList = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i)

  const handleSyncYear = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      // Trigger background sync — returns immediately
      await fetchApi(`/api/historical/sync/${year}`, { method: 'POST' })
    } catch (e) {
      setSyncError(`Failed to start sync for ${year}. Is the server running?`)
      setSyncing(false)
      return
    }
    // Poll /races/{year} every 5s until data appears
    const poll = setInterval(async () => {
      try {
        await refetchRaces()
      } catch (_) { /* keep polling */ }
    }, 5000)
    // Stop polling once races appear (useEffect watches racesData)
    const stopPoll = () => { clearInterval(poll); setSyncing(false) }
    // Safety timeout: stop after 10 minutes
    const timeout = setTimeout(stopPoll, 10 * 60 * 1000)
    // Store cleanup refs so the useEffect below can stop polling
    window._f1SyncPoll = poll
    window._f1SyncTimeout = timeout
  }

  // Stop polling when races appear
  useEffect(() => {
    if (racesData?.races?.length > 0 && syncing) {
      clearInterval(window._f1SyncPoll)
      clearTimeout(window._f1SyncTimeout)
      setSyncing(false)
    }
  }, [racesData, syncing])

  const tabs = [
    { id: 'results', label: 'Race Results' },
    { id: 'qualifying', label: 'Qualifying' },
    { id: 'pitstops', label: 'Pit Stops' },
    ...(hasSprint ? [
      { id: 'sprint', label: 'Sprint Race' },
      { id: 'sprint-qualifying', label: 'Sprint Qualifying' },
    ] : []),
  ]

  // If we switch round and the new round has no sprint, reset sprint tabs
  useEffect(() => {
    if (!hasSprint && (tab === 'sprint' || tab === 'sprint-qualifying')) {
      setTab('results')
    }
  }, [hasSprint, tab])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Race History</h1>
        <div className="flex gap-2">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="bg-f1-card border border-f1-border rounded px-3 py-1.5 text-sm"
          >
            {yearList.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={round}
            onChange={e => setRound(Number(e.target.value))}
            disabled={races.length === 0}
            className="bg-f1-card border border-f1-border rounded px-3 py-1.5 text-sm disabled:opacity-40"
          >
            {races.map(r => (
              <option key={r.round} value={r.round}>R{r.round} — {r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* No data for this year — offer to load it */}
      {!loadingRaces && races.length === 0 && (
        <div className="bg-f1-card rounded-lg p-10 border border-f1-border text-center animate-fade-in">
          <div className="text-3xl mb-3">📦</div>
          <div className="text-lg font-semibold mb-1">{year} season not loaded</div>
          <div className="text-f1-muted text-sm mb-4">
            Data for this season hasn't been synced yet. It will be fetched from the Jolpica/Ergast API.
          </div>
          {syncError && (
            <div className="text-red-400 text-xs mb-3">{syncError}</div>
          )}
          <button
            onClick={handleSyncYear}
            disabled={syncing}
            className="px-5 py-2 bg-f1-red text-white rounded hover:bg-red-700 text-sm disabled:opacity-50 disabled:cursor-wait"
          >
            {syncing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a8 8 0 00-8 8h4z" />
                </svg>
                Syncing {year}... checking every 5s
              </span>
            ) : `Load ${year} season data`}
          </button>
          <div className="text-f1-muted text-xs mt-3">
            Sync runs in the background — the page updates automatically when data is ready (2–5 min).
          </div>
        </div>
      )}

      {races.length > 0 && (
        <>
          {raceInfo && (
            <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
              <div className="text-xl font-bold">{raceInfo.name || `Round ${round}`}</div>
              <div className="text-f1-muted text-sm mt-1">
                {raceInfo.circuit} &middot; {raceInfo.date ? new Date(raceInfo.date).toLocaleDateString() : ''}
              </div>
            </div>
          )}

          <div className="flex gap-1 bg-f1-card rounded-lg p-1 border border-f1-border w-fit">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  tab === t.id ? 'bg-f1-red text-white' : 'text-f1-muted hover:text-f1-text'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Sprint weekend badge */}
          {hasSprint && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-semibold">
                Sprint Weekend
              </span>
              {selectedRace?.sprint_date && (
                <span className="text-f1-muted">
                  Sprint: {new Date(selectedRace.sprint_date).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          <div className="bg-f1-card rounded-lg p-4 border border-f1-border animate-fade-in">
            {tab === 'results' && (
              loadingDetail ? <LoadingSpinner /> : <ResultsTable results={results} />
            )}
            {tab === 'qualifying' && (
              loadingQual ? <LoadingSpinner /> : (
                <QualifyingTable results={qualResults} qualFormat={qualFormat} />
              )
            )}
            {tab === 'pitstops' && (
              loadingPits ? <LoadingSpinner /> : <PitStopsTable stops={pitStops} />
            )}
            {tab === 'sprint' && hasSprint && (
              loadingSprint ? <LoadingSpinner /> : <SprintResultsTable results={sprintResults} />
            )}
            {tab === 'sprint-qualifying' && hasSprint && (
              loadingSprintQual ? <LoadingSpinner /> : <SprintShootoutTable results={sprintQualResults} />
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Race Results ─────────────────────────────────────────── */

function ResultsTable({ results }) {
  const sorted = [...results].sort((a, b) => (a.position || 99) - (b.position || 99))

  if (!sorted.length) {
    return <div className="text-f1-muted text-center py-8">No results data</div>
  }

  // Find fastest lap for purple highlight
  let fastestTime = Infinity
  let fastestDriver = null
  for (const r of sorted) {
    if (!r.fastest_lap_time) continue
    const parsed = parseLapTime(r.fastest_lap_time)
    if (!parsed) continue
    // Simple string comparison works for M:SS.mmm format
    if (parsed < (fastestDriver ? parseLapTime(fastestDriver.fastest_lap_time) : '\uffff')) {
      fastestDriver = r
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-f1-border text-f1-muted text-[10px] tracking-wider uppercase">
            <th className="py-2 px-2 text-left w-10">POS</th>
            <th className="py-2 px-2 text-left">DRIVER</th>
            <th className="py-2 px-2 text-left">TEAM</th>
            <th className="py-2 px-2 text-center w-12">+/−</th>
            <th className="py-2 px-2 text-right">GRID</th>
            <th className="py-2 px-2 text-right">PTS</th>
            <th className="py-2 px-2 text-right">FASTEST</th>
            <th className="py-2 px-2 text-left">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const pos = r.position || 99
            const posColor = getPositionColor(pos)
            const code = r.driver?.code || '-'
            const fullName = r.driver?.name || ''
            const constructor = r.constructor || '-'
            const teamColor = getTeamColor(constructor)
            const posChange = formatPositionChange(r.grid, pos)
            const status = formatStatus(r.status, pos)
            const fl = r.fastest_lap_time ? formatLapTime(r.fastest_lap_time) : null
            const isFastestLap = fastestDriver && r === fastestDriver
            const isDNF = status.label === 'DNF' || status.label === 'DSQ' || status.label === 'DNS'

            return (
              <tr
                key={pos}
                className={`border-b border-f1-border/20 hover:bg-white/5 transition-colors team-stripe ${
                  isDNF ? 'opacity-50' : ''
                }`}
                style={{ '--stripe-color': teamColor }}
              >
                {/* Position */}
                <td className="py-1.5 px-2">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono"
                    style={posColor ? { color: posColor } : { color: pos <= 10 ? '#e0e0e0' : '#8888AA' }}
                  >
                    {pos <= 98 ? pos : '-'}
                  </span>
                </td>

                {/* Driver */}
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs font-mono">{code}</span>
                    <span className="text-f1-muted text-xs hidden sm:inline">
                      {formatDriverName(code, fullName)}
                    </span>
                  </div>
                </td>

                {/* Team */}
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                    <span className="text-xs text-f1-muted">{constructor}</span>
                  </div>
                </td>

                {/* Position change */}
                <td className="py-1.5 px-2 text-center">
                  {posChange.text && (
                    <span className="text-xs font-mono font-bold" style={{ color: posChange.color }}>
                      {posChange.text}
                    </span>
                  )}
                </td>

                {/* Grid */}
                <td className="py-1.5 px-2 text-right font-mono text-xs text-f1-muted">
                  {r.grid || '-'}
                </td>

                {/* Points */}
                <td className="py-1.5 px-2 text-right font-mono font-semibold">
                  {r.points ?? '-'}
                </td>

                {/* Fastest lap */}
                <td className="py-1.5 px-2 text-right font-mono text-xs">
                  {fl ? (
                    <span className={isFastestLap ? 'text-f1-purple font-semibold' : ''}>
                      {fl}{isFastestLap && ' ●'}
                    </span>
                  ) : '-'}
                </td>

                {/* Status */}
                <td className="py-1.5 px-2">
                  <span className="text-xs font-medium" style={{ color: status.color }}>
                    {status.label}
                  </span>
                  {status.reason && (
                    <span className="text-[10px] text-f1-muted ml-1">{status.reason}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Qualifying ───────────────────────────────────────────── */

const QUAL_FORMAT_INFO = {
  LEGACY: {
    label: 'Legacy Qualifying',
    note: 'Pre-2003 format: aggregate or single-lap sessions — Q1/Q2/Q3 structure did not exist. Data may be sparse.',
    color: '#8888AA',
  },
  ONE_LAP: {
    label: 'One-Lap Qualifying (2003–2005)',
    note: 'Each driver set a single timed lap. Only one session time recorded. No knockout rounds.',
    color: '#a78bfa',
  },
  KNOCKOUT: null,
}

function QualifyingTable({ results, qualFormat = 'KNOCKOUT' }) {
  const sorted = [...results].sort((a, b) => (a.position || 99) - (b.position || 99))
  const fmtInfo = QUAL_FORMAT_INFO[qualFormat] || null

  if (!sorted.length) {
    return (
      <div className="space-y-3">
        {fmtInfo && (
          <div className="flex items-start gap-2 px-3 py-2 rounded bg-white/5 border border-f1-border text-xs">
            <span style={{ color: fmtInfo.color }} className="font-semibold shrink-0">{fmtInfo.label}:</span>
            <span className="text-f1-muted">{fmtInfo.note}</span>
          </div>
        )}
        <div className="text-f1-muted text-center py-8">No qualifying data</div>
      </div>
    )
  }

  // For ONE_LAP: only Q1 is populated — suppress Q2/Q3 columns
  const showQ2Q3 = qualFormat !== 'ONE_LAP' && qualFormat !== 'LEGACY'

  return (
    <div className="overflow-x-auto">
      {/* Format context banner */}
      {fmtInfo && (
        <div className="flex items-start gap-2 px-3 py-2 mb-2 rounded bg-white/5 border border-f1-border text-xs">
          <span style={{ color: fmtInfo.color }} className="font-semibold shrink-0">{fmtInfo.label}:</span>
          <span className="text-f1-muted">{fmtInfo.note}</span>
        </div>
      )}
      {/* Q-session elimination legend (knockout only) */}
      {qualFormat === 'KNOCKOUT' && (
      <div className="flex items-center gap-4 px-2 pb-2 text-[10px] text-f1-muted">
        <span>Eliminated:</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-red-500/30" />Q1 (P16-20)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-yellow-500/20" />Q2 (P11-15)
        </span>
      </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-f1-border text-f1-muted text-[10px] tracking-wider uppercase">
            <th className="py-2 px-2 text-left w-10">POS</th>
            <th className="py-2 px-2 text-left">DRIVER</th>
            <th className="py-2 px-2 text-left">TEAM</th>
            <th className="py-2 px-2 text-right">Q1</th>
            {showQ2Q3 && <th className="py-2 px-2 text-right">Q2</th>}
            {showQ2Q3 && <th className="py-2 px-2 text-right">Q3</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const pos = r.position || 99
            const posColor = getPositionColor(pos)
            const code = r.driver?.code || '-'
            const fullName = r.driver?.name || ''
            const constructor = r.constructor || '-'
            const teamColor = getTeamColor(constructor)
            const eliminatedQ1 = showQ2Q3 && pos >= 16
            const eliminatedQ2 = showQ2Q3 && pos >= 11 && pos <= 15
            const rowTint = eliminatedQ1 ? 'bg-red-500/5' : eliminatedQ2 ? 'bg-yellow-500/5' : ''

            return (
              <tr
                key={pos}
                className={`border-b border-f1-border/20 hover:bg-white/5 transition-colors team-stripe ${rowTint}`}
                style={{ '--stripe-color': teamColor }}
              >
                <td className="py-1.5 px-2">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono"
                    style={posColor ? { color: posColor } : { color: pos <= 10 ? '#e0e0e0' : '#8888AA' }}
                  >
                    {pos}
                  </span>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs font-mono">{code}</span>
                    <span className="text-f1-muted text-xs hidden sm:inline">
                      {formatDriverName(code, fullName)}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                    <span className="text-xs text-f1-muted">{constructor}</span>
                  </div>
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-xs">
                  {r.q1 ? formatLapTime(r.q1) : '-'}
                </td>
                {showQ2Q3 && (
                  <td className="py-1.5 px-2 text-right font-mono text-xs">
                    {r.q2 ? formatLapTime(r.q2) : (
                      <span className={eliminatedQ1 ? 'text-f1-muted/40' : ''}>-</span>
                    )}
                  </td>
                )}
                {showQ2Q3 && (
                  <td className="py-1.5 px-2 text-right font-mono text-xs">
                    {r.q3 ? formatLapTime(r.q3) : (
                      <span className={eliminatedQ1 || eliminatedQ2 ? 'text-f1-muted/40' : ''}>-</span>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Sprint Race Results ──────────────────────────────────── */

function SprintResultsTable({ results }) {
  const sorted = [...results].sort((a, b) => (a.position || 99) - (b.position || 99))

  if (!sorted.length) {
    return (
      <div className="text-f1-muted text-center py-8">
        No sprint race data — Jolpica may not have synced this yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 px-2 pb-2 text-[10px] text-f1-muted">
        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-semibold">SPRINT</span>
        <span>Points awarded to top 8 (8-7-6-5-4-3-2-1)</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-f1-border text-f1-muted text-[10px] tracking-wider uppercase">
            <th className="py-2 px-2 text-left w-10">POS</th>
            <th className="py-2 px-2 text-left">DRIVER</th>
            <th className="py-2 px-2 text-left">TEAM</th>
            <th className="py-2 px-2 text-right">GRID</th>
            <th className="py-2 px-2 text-right">PTS</th>
            <th className="py-2 px-2 text-left">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const pos = r.position || 99
            const posColor = getPositionColor(pos)
            const code = r.driver?.code || '-'
            const fullName = r.driver?.name || ''
            const constructor = r.constructor || '-'
            const teamColor = getTeamColor(constructor)
            const status = formatStatus(r.status, pos)
            const isDNF = status.label === 'DNF' || status.label === 'DSQ' || status.label === 'DNS'

            return (
              <tr
                key={pos}
                className={`border-b border-f1-border/20 hover:bg-white/5 transition-colors team-stripe ${
                  isDNF ? 'opacity-50' : ''
                }`}
                style={{ '--stripe-color': teamColor }}
              >
                <td className="py-1.5 px-2">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono"
                    style={posColor ? { color: posColor } : { color: pos <= 8 ? '#e0e0e0' : '#8888AA' }}
                  >
                    {pos <= 98 ? pos : '-'}
                  </span>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs font-mono">{code}</span>
                    <span className="text-f1-muted text-xs hidden sm:inline">
                      {formatDriverName(code, fullName)}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                    <span className="text-xs text-f1-muted">{constructor}</span>
                  </div>
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-xs text-f1-muted">
                  {r.grid || '-'}
                </td>
                <td className="py-1.5 px-2 text-right font-mono font-semibold">
                  {r.points ?? '-'}
                </td>
                <td className="py-1.5 px-2">
                  <span className="text-xs font-medium" style={{ color: status.color }}>
                    {status.label}
                  </span>
                  {status.reason && (
                    <span className="text-[10px] text-f1-muted ml-1">{status.reason}</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Sprint Shootout / Sprint Qualifying ──────────────────── */

function SprintShootoutTable({ results }) {
  const sorted = [...results].sort((a, b) => (a.position || 99) - (b.position || 99))

  if (!sorted.length) {
    return (
      <div className="text-f1-muted text-center py-8">
        No sprint qualifying data available — Jolpica does not expose a dedicated sprint qualifying
        endpoint. This data will be populated via FastF1 in a future update.
      </div>
    )
  }

  const hasSQ3 = sorted.some(r => r.sq3)
  const hasSQ2 = sorted.some(r => r.sq2)

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 px-2 pb-2 text-[10px] text-f1-muted">
        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-semibold">SPRINT QUALIFYING</span>
        <span>{hasSQ3 ? 'SQ1 / SQ2 / SQ3 knockout format (2023+)' : 'Single-phase sprint qualifying (2021–2022)'}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-f1-border text-f1-muted text-[10px] tracking-wider uppercase">
            <th className="py-2 px-2 text-left w-10">POS</th>
            <th className="py-2 px-2 text-left">DRIVER</th>
            <th className="py-2 px-2 text-left">TEAM</th>
            <th className="py-2 px-2 text-right">SQ1</th>
            {hasSQ2 && <th className="py-2 px-2 text-right">SQ2</th>}
            {hasSQ3 && <th className="py-2 px-2 text-right">SQ3</th>}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const pos = r.position || 99
            const posColor = getPositionColor(pos)
            const code = r.driver?.code || '-'
            const fullName = r.driver?.name || ''
            const constructor = r.constructor || '-'
            const teamColor = getTeamColor(constructor)
            // SQ1 eliminates P14-20 (7 cars, since only top 3 of 20 get pole from SQ3)
            // SQ2 eliminates P9-14
            const eliminatedSQ1 = hasSQ3 && pos >= 13
            const eliminatedSQ2 = hasSQ3 && pos >= 9 && pos <= 12
            const rowTint = eliminatedSQ1 ? 'bg-red-500/5' : eliminatedSQ2 ? 'bg-yellow-500/5' : ''

            return (
              <tr
                key={pos}
                className={`border-b border-f1-border/20 hover:bg-white/5 transition-colors team-stripe ${rowTint}`}
                style={{ '--stripe-color': teamColor }}
              >
                <td className="py-1.5 px-2">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono"
                    style={posColor ? { color: posColor } : { color: pos <= 8 ? '#e0e0e0' : '#8888AA' }}
                  >
                    {pos}
                  </span>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs font-mono">{code}</span>
                    <span className="text-f1-muted text-xs hidden sm:inline">
                      {formatDriverName(code, fullName)}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                    <span className="text-xs text-f1-muted">{constructor}</span>
                  </div>
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-xs">
                  {r.sq1 ? formatLapTime(r.sq1) : '-'}
                </td>
                {hasSQ2 && (
                  <td className="py-1.5 px-2 text-right font-mono text-xs">
                    {r.sq2 ? formatLapTime(r.sq2) : (
                      <span className={eliminatedSQ1 ? 'text-f1-muted/40' : ''}>-</span>
                    )}
                  </td>
                )}
                {hasSQ3 && (
                  <td className="py-1.5 px-2 text-right font-mono text-xs">
                    {r.sq3 ? formatLapTime(r.sq3) : (
                      <span className={eliminatedSQ1 || eliminatedSQ2 ? 'text-f1-muted/40' : ''}>-</span>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Pit Stops ────────────────────────────────────────────── */

function PitStopsTable({ stops }) {
  if (!stops.length) {
    return <div className="text-f1-muted text-center py-8">No pit stop data</div>
  }

  const sorted = [...stops].sort((a, b) => (a.lap || 0) - (b.lap || 0))

  // Find max duration for bar scaling
  const maxDuration = sorted.reduce((max, s) => {
    const d = parseFloat(s.duration)
    return !isNaN(d) && d > max ? d : max
  }, 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-f1-border text-f1-muted text-[10px] tracking-wider uppercase">
            <th className="py-2 px-2 text-left">DRIVER</th>
            <th className="py-2 px-2 text-right w-14">STOP</th>
            <th className="py-2 px-2 text-right w-14">LAP</th>
            <th className="py-2 px-2 text-right w-20">TIME</th>
            <th className="py-2 px-2 text-left" style={{ minWidth: '140px' }}>DURATION</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => {
            const code = s.driver?.code || s._driver_code || '-'
            const fullName = s.driver?.name || ''
            const constructor = s.constructor || s._constructor || '-'
            const teamColor = getTeamColor(constructor)
            const pit = formatPitDuration(s.duration)
            const barWidth = maxDuration > 0 ? (parseFloat(s.duration) / maxDuration) * 100 : 0

            return (
              <tr
                key={i}
                className="border-b border-f1-border/20 hover:bg-white/5 transition-colors team-stripe"
                style={{ '--stripe-color': teamColor }}
              >
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs font-mono">{code}</span>
                    {fullName && (
                      <span className="text-f1-muted text-xs hidden sm:inline">
                        {formatDriverName(code, fullName)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-xs">{s.stop || '-'}</td>
                <td className="py-1.5 px-2 text-right font-mono text-xs">{s.lap || '-'}</td>
                <td className="py-1.5 px-2 text-right font-mono text-xs" style={{ color: pit.color }}>
                  {pit.text}
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex-1 bg-f1-dark rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(barWidth, 100)}%`,
                        backgroundColor: pit.color,
                      }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
