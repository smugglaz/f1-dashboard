import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApi, fetchApi } from '../hooks/useApi'
import {
  formatLapTime, parseLapTime, formatDriverName,
  formatPositionChange, formatStatus, formatPitDuration,
  qualTimeToMs, formatPercentDelta,
} from '../utils/format'
import { getPositionColor } from '../utils/colors'
import { getTeamColor } from '../utils/teams'
import Plot from 'react-plotly.js'
import { getPlotlyGlassLayout } from '@/utils/chartTheme'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Database, LayoutGrid, Table2, ArrowRight, Trophy, Flag, Calendar } from 'lucide-react'

import RaceSummaryCard from '@/components/race/RaceSummaryCard'
import StrategyTimeline from '@/components/race/StrategyTimeline'
import SectorAnalysis from '@/components/race/SectorAnalysis'
import TyreDegradation from '@/components/race/TyreDegradation'
import RaceConditions from '@/components/race/RaceConditions'

export default function History() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [round, setRound] = useState(1)
  const [tab, setTab] = useState('results')
  const [view, setView] = useState('overview') // 'overview' | 'detail'
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
  const { data: lapPosData, loading: loadingLapPos } = useApi(
    tab === 'positions' ? `/api/historical/lap-positions/${year}/${round}` : null
  )

  const raceInfo = raceDetailData?.race
  const results = raceDetailData?.results || []
  const qualResults = qualData?.results || []
  const pitStops = pitData?.stops || []
  const sprintResults = sprintData?.results || []
  const sprintQualResults = sprintQualData?.results || []
  const lapPositions = lapPosData?.laps || []

  useEffect(() => { setRound(1); setSyncError(null) }, [year])

  const yearList = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i)

  // Whether this race likely has FastF1 data (2018+)
  const hasFastF1 = year >= 2018

  const handleSyncYear = async () => {
    setSyncing(true)
    setSyncError(null)
    try {
      await fetchApi(`/api/historical/sync/${year}`, { method: 'POST' })
    } catch (e) {
      setSyncError(`Failed to start sync for ${year}. Is the server running?`)
      setSyncing(false)
      return
    }
    const poll = setInterval(async () => {
      try { await refetchRaces() } catch (_) {}
    }, 5000)
    const stopPoll = () => { clearInterval(poll); setSyncing(false) }
    const timeout = setTimeout(stopPoll, 10 * 60 * 1000)
    window._f1SyncPoll = poll
    window._f1SyncTimeout = timeout
  }

  useEffect(() => {
    if (racesData?.races?.length > 0 && syncing) {
      clearInterval(window._f1SyncPoll)
      clearTimeout(window._f1SyncTimeout)
      setSyncing(false)
    }
  }, [racesData, syncing])

  // Reset sprint tabs when switching to non-sprint round
  useEffect(() => {
    if (!hasSprint && (tab === 'sprint' || tab === 'sprint-qualifying')) {
      setTab('results')
    }
  }, [hasSprint, tab])

  return (
    <div className="space-y-6">
      <PageHeader
        title={view === 'overview' ? `${year} Season` : 'Race Analysis'}
        subtitle={view === 'detail' && raceInfo ? `${raceInfo.name} — ${raceInfo.circuit}` : view === 'overview' ? `${races.length} rounds` : `${year} Season`}
      >
        <div className="flex gap-2 items-center">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="bg-glass-bg border border-glass-border rounded-lg px-3 py-1.5 text-sm"
          >
            {yearList.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {view === 'detail' && (
            <select
              value={round}
              onChange={e => setRound(Number(e.target.value))}
              disabled={races.length === 0}
              className="bg-glass-bg border border-glass-border rounded-lg px-3 py-1.5 text-sm disabled:opacity-40"
            >
              {races.map(r => (
                <option key={r.round} value={r.round}>R{r.round} — {r.name}</option>
              ))}
            </select>
          )}
          <div className="flex border border-glass-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('overview')}
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                view === 'overview' ? 'bg-label-primary text-white' : 'text-label-secondary hover:bg-black/[0.04]'
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
            </button>
            <button
              onClick={() => setView('detail')}
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                view === 'detail' ? 'bg-label-primary text-white' : 'text-label-secondary hover:bg-black/[0.04]'
              }`}
            >
              <Table2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </PageHeader>

      {/* No data — sync prompt */}
      {!loadingRaces && races.length === 0 && (
        <EmptyState
          icon={Database}
          title={`${year} season not loaded`}
          description="Data for this season hasn't been synced yet. It will be fetched from the Jolpica/Ergast API."
          action={syncing ? `Syncing ${year}...` : `Load ${year} season data`}
          onAction={syncing ? undefined : handleSyncYear}
        />
      )}
      {syncError && (
        <p className="text-red-400 text-xs text-center">{syncError}</p>
      )}

      {/* Season Overview Grid */}
      {races.length > 0 && view === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {races.map(r => {
            const isPast = r.date && new Date(r.date) < new Date()
            const raceDate = r.date ? new Date(r.date) : null
            return (
              <Card key={r.round} className="group relative overflow-hidden">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-caption-2 uppercase tracking-wider text-label-tertiary">
                      Round {r.round}
                    </span>
                    {r.has_sprint && (
                      <Badge variant="outline" className="text-[9px] border-orange-500/30 text-orange-500">
                        Sprint
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-headline font-semibold leading-tight">{r.name}</h3>
                  {r.circuit?.name && (
                    <p className="text-caption-1 text-label-secondary">{r.circuit.name}</p>
                  )}
                  {raceDate && (
                    <div className="flex items-center gap-1.5 text-caption-1 text-label-tertiary">
                      <Calendar className="h-3 w-3" />
                      {raceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    {isPast ? (
                      <Link
                        to={`/race-story/${year}/${r.round}`}
                        className="inline-flex items-center gap-1 text-caption-1 font-medium text-label-primary hover:text-f1-red transition-colors"
                      >
                        View Race Story
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ) : (
                      <span className="text-caption-1 text-label-quaternary">Upcoming</span>
                    )}
                    {isPast && (
                      <button
                        onClick={() => { setRound(r.round); setView('detail') }}
                        className="text-caption-1 text-label-tertiary hover:text-label-primary transition-colors ml-auto"
                      >
                        Detailed Analysis
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detailed Race Analysis */}
      {races.length > 0 && view === 'detail' && (
        <>
          {/* Race summary card — always visible */}
          <RaceSummaryCard year={year} round={round} />

          {/* Sprint badge */}
          {hasSprint && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="border-orange-500/40 text-orange-400">
                Sprint Weekend
              </Badge>
              {selectedRace?.sprint_date && (
                <span className="text-label-tertiary">
                  Sprint: {new Date(selectedRace.sprint_date).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* Tabbed content */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-fit flex-wrap">
              <TabsTrigger value="results">Race</TabsTrigger>
              <TabsTrigger value="qualifying">Qualifying</TabsTrigger>
              {hasFastF1 && (
                <TabsTrigger value="strategy">
                  Strategy
                </TabsTrigger>
              )}
              {hasFastF1 && (
                <TabsTrigger value="sectors">
                  Sectors
                </TabsTrigger>
              )}
              {hasFastF1 && (
                <TabsTrigger value="tyres">
                  Tyres
                </TabsTrigger>
              )}
              <TabsTrigger value="positions">Positions</TabsTrigger>
              {hasFastF1 && (
                <TabsTrigger value="conditions">
                  Conditions
                </TabsTrigger>
              )}
              <TabsTrigger value="pitstops">Pit Stops</TabsTrigger>
              {hasSprint && <TabsTrigger value="sprint">Sprint</TabsTrigger>}
              {hasSprint && <TabsTrigger value="sprint-qualifying">Sprint Qual</TabsTrigger>}
            </TabsList>

            <TabsContent value="results">
              <Card>
                <CardContent className="pt-4">
                  {loadingDetail ? <Skeleton className="h-64 w-full" /> : <ResultsTable results={results} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="qualifying">
              <Card>
                <CardContent className="pt-4">
                  {loadingQual ? <Skeleton className="h-64 w-full" /> : (
                    <QualifyingTable results={qualResults} qualFormat={qualFormat} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strategy">
              <StrategyTimeline year={year} round={round} />
            </TabsContent>

            <TabsContent value="sectors">
              <SectorAnalysis year={year} round={round} />
            </TabsContent>

            <TabsContent value="tyres">
              <TyreDegradation year={year} round={round} />
            </TabsContent>

            <TabsContent value="positions">
              <Card>
                <CardContent className="pt-4">
                  {loadingLapPos ? <Skeleton className="h-96 w-full" /> : <PositionChart laps={lapPositions} />}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conditions">
              <RaceConditions year={year} round={round} />
            </TabsContent>

            <TabsContent value="pitstops">
              <Card>
                <CardContent className="pt-4">
                  {loadingPits ? <Skeleton className="h-64 w-full" /> : <PitStopsTable stops={pitStops} />}
                </CardContent>
              </Card>
            </TabsContent>

            {hasSprint && (
              <TabsContent value="sprint">
                <Card>
                  <CardContent className="pt-4">
                    {loadingSprint ? <Skeleton className="h-64 w-full" /> : <SprintResultsTable results={sprintResults} />}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {hasSprint && (
              <TabsContent value="sprint-qualifying">
                <Card>
                  <CardContent className="pt-4">
                    {loadingSprintQual ? <Skeleton className="h-64 w-full" /> : <SprintShootoutTable results={sprintQualResults} />}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  )
}

/* ─── Race Results ─────────────────────────────────────────── */

function ResultsTable({ results }) {
  const sorted = [...results].sort((a, b) => (a.position || 99) - (b.position || 99))

  if (!sorted.length) {
    return <div className="text-label-tertiary text-center py-8">No results data</div>
  }

  const winner = sorted[0]
  const winnerMs = winner?.time_millis ? parseFloat(winner.time_millis) : null

  let fastestDriver = null
  for (const r of sorted) {
    if (!r.fastest_lap_time) continue
    const parsed = parseLapTime(r.fastest_lap_time)
    if (!parsed) continue
    if (parsed < (fastestDriver ? parseLapTime(fastestDriver.fastest_lap_time) : '\uffff')) {
      fastestDriver = r
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-glass-border text-label-tertiary text-[10px] tracking-wider uppercase">
            <th className="py-2 px-2 text-left w-10">POS</th>
            <th className="py-2 px-2 text-left">DRIVER</th>
            <th className="py-2 px-2 text-left">TEAM</th>
            <th className="py-2 px-2 text-center w-12">+/−</th>
            <th className="py-2 px-2 text-right">GRID</th>
            <th className="py-2 px-2 text-right">PTS</th>
            {winnerMs && <th className="py-2 px-2 text-right">GAP %</th>}
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

            const driverMs = r.time_millis ? parseFloat(r.time_millis) : null
            const raceGapPct = (winnerMs && driverMs && pos > 1) ? ((driverMs - winnerMs) / winnerMs) * 100 : null
            const raceGapFmt = pos === 1 ? { text: 'WINNER', color: '#FFD700' } : formatPercentDelta(raceGapPct)

            return (
              <tr
                key={pos}
                className={`border-b border-glass-border/50 hover:bg-black/[0.04] transition-colors team-stripe ${
                  isDNF ? 'opacity-50' : ''
                }`}
                style={{ '--stripe-color': teamColor }}
              >
                <td className="py-1.5 px-2">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono"
                    style={posColor ? { color: posColor } : { color: pos <= 10 ? '#1A1A2E' : '#9CA3AF' }}
                  >
                    {pos <= 98 ? pos : '-'}
                  </span>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs font-mono">{code}</span>
                    <span className="text-label-tertiary text-xs hidden sm:inline">
                      {formatDriverName(code, fullName)}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                    <span className="text-xs text-label-tertiary">{constructor}</span>
                  </div>
                </td>
                <td className="py-1.5 px-2 text-center">
                  {posChange.text && (
                    <span className="text-xs font-mono font-bold" style={{ color: posChange.color }}>
                      {posChange.text}
                    </span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-xs text-label-tertiary">
                  {r.grid || '-'}
                </td>
                <td className="py-1.5 px-2 text-right font-mono font-semibold">
                  {r.points ?? '-'}
                </td>
                {winnerMs && (
                  <td className="py-1.5 px-2 text-right font-mono text-xs font-semibold" style={{ color: raceGapFmt.color }}>
                    {raceGapFmt.text}
                  </td>
                )}
                <td className="py-1.5 px-2 text-right font-mono text-xs">
                  {fl ? (
                    <span className={isFastestLap ? 'text-f1-purple font-semibold' : ''}>
                      {fl}{isFastestLap && ' ●'}
                    </span>
                  ) : '-'}
                </td>
                <td className="py-1.5 px-2">
                  <span className="text-xs font-medium" style={{ color: status.color }}>
                    {status.label}
                  </span>
                  {status.reason && (
                    <span className="text-[10px] text-label-tertiary ml-1">{status.reason}</span>
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
    color: '#9CA3AF',
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

  const poleDriver = sorted[0]
  const poleMs = poleDriver
    ? qualTimeToMs(poleDriver.q3) || qualTimeToMs(poleDriver.q2) || qualTimeToMs(poleDriver.q1)
    : null

  if (!sorted.length) {
    return (
      <div className="space-y-3">
        {fmtInfo && (
          <div className="flex items-start gap-2 px-3 py-2 rounded bg-black/[0.03] border border-glass-border text-xs">
            <span style={{ color: fmtInfo.color }} className="font-semibold shrink-0">{fmtInfo.label}:</span>
            <span className="text-label-tertiary">{fmtInfo.note}</span>
          </div>
        )}
        <div className="text-label-tertiary text-center py-8">No qualifying data</div>
      </div>
    )
  }

  const showQ2Q3 = qualFormat !== 'ONE_LAP' && qualFormat !== 'LEGACY'

  return (
    <div className="overflow-x-auto">
      {fmtInfo && (
        <div className="flex items-start gap-2 px-3 py-2 mb-2 rounded bg-black/[0.03] border border-glass-border text-xs">
          <span style={{ color: fmtInfo.color }} className="font-semibold shrink-0">{fmtInfo.label}:</span>
          <span className="text-label-tertiary">{fmtInfo.note}</span>
        </div>
      )}
      {qualFormat === 'KNOCKOUT' && (
      <div className="flex items-center gap-4 px-2 pb-2 text-[10px] text-label-tertiary">
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
          <tr className="border-b border-glass-border text-label-tertiary text-[10px] tracking-wider uppercase">
            <th className="py-2 px-2 text-left w-10">POS</th>
            <th className="py-2 px-2 text-left">DRIVER</th>
            <th className="py-2 px-2 text-left">TEAM</th>
            <th className="py-2 px-2 text-right">Q1</th>
            {showQ2Q3 && <th className="py-2 px-2 text-right">Q2</th>}
            {showQ2Q3 && <th className="py-2 px-2 text-right">Q3</th>}
            {poleMs && <th className="py-2 px-2 text-right">GAP %</th>}
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

            const driverMs = qualTimeToMs(r.q3) || qualTimeToMs(r.q2) || qualTimeToMs(r.q1)
            const gapPct = (poleMs && driverMs) ? ((driverMs - poleMs) / poleMs) * 100 : null
            const gapFmt = pos === 1 ? { text: 'POLE', color: '#FFD700' } : formatPercentDelta(gapPct)

            return (
              <tr
                key={pos}
                className={`border-b border-glass-border/50 hover:bg-black/[0.04] transition-colors team-stripe ${rowTint}`}
                style={{ '--stripe-color': teamColor }}
              >
                <td className="py-1.5 px-2">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono"
                    style={posColor ? { color: posColor } : { color: pos <= 10 ? '#1A1A2E' : '#9CA3AF' }}
                  >
                    {pos}
                  </span>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs font-mono">{code}</span>
                    <span className="text-label-tertiary text-xs hidden sm:inline">
                      {formatDriverName(code, fullName)}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                    <span className="text-xs text-label-tertiary">{constructor}</span>
                  </div>
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-xs">
                  {r.q1 ? formatLapTime(r.q1) : '-'}
                </td>
                {showQ2Q3 && (
                  <td className="py-1.5 px-2 text-right font-mono text-xs">
                    {r.q2 ? formatLapTime(r.q2) : (
                      <span className={eliminatedQ1 ? 'text-label-tertiary/40' : ''}>-</span>
                    )}
                  </td>
                )}
                {showQ2Q3 && (
                  <td className="py-1.5 px-2 text-right font-mono text-xs">
                    {r.q3 ? formatLapTime(r.q3) : (
                      <span className={eliminatedQ1 || eliminatedQ2 ? 'text-label-tertiary/40' : ''}>-</span>
                    )}
                  </td>
                )}
                {poleMs && (
                  <td className="py-1.5 px-2 text-right font-mono text-xs font-semibold" style={{ color: gapFmt.color }}>
                    {gapFmt.text}
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
      <div className="text-label-tertiary text-center py-8">
        No sprint race data — Jolpica may not have synced this yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 px-2 pb-2 text-[10px] text-label-tertiary">
        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-semibold">SPRINT</span>
        <span>Points awarded to top 8 (8-7-6-5-4-3-2-1)</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-glass-border text-label-tertiary text-[10px] tracking-wider uppercase">
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
                className={`border-b border-glass-border/50 hover:bg-black/[0.04] transition-colors team-stripe ${
                  isDNF ? 'opacity-50' : ''
                }`}
                style={{ '--stripe-color': teamColor }}
              >
                <td className="py-1.5 px-2">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono"
                    style={posColor ? { color: posColor } : { color: pos <= 8 ? '#1A1A2E' : '#9CA3AF' }}
                  >
                    {pos <= 98 ? pos : '-'}
                  </span>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs font-mono">{code}</span>
                    <span className="text-label-tertiary text-xs hidden sm:inline">
                      {formatDriverName(code, fullName)}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                    <span className="text-xs text-label-tertiary">{constructor}</span>
                  </div>
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-xs text-label-tertiary">
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
                    <span className="text-[10px] text-label-tertiary ml-1">{status.reason}</span>
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
      <div className="text-label-tertiary text-center py-8">
        No sprint qualifying data available — Jolpica does not expose a dedicated sprint qualifying
        endpoint. This data will be populated via FastF1 in a future update.
      </div>
    )
  }

  const hasSQ3 = sorted.some(r => r.sq3)
  const hasSQ2 = sorted.some(r => r.sq2)

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 px-2 pb-2 text-[10px] text-label-tertiary">
        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-semibold">SPRINT QUALIFYING</span>
        <span>{hasSQ3 ? 'SQ1 / SQ2 / SQ3 knockout format (2023+)' : 'Single-phase sprint qualifying (2021–2022)'}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-glass-border text-label-tertiary text-[10px] tracking-wider uppercase">
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
            const eliminatedSQ1 = hasSQ3 && pos >= 13
            const eliminatedSQ2 = hasSQ3 && pos >= 9 && pos <= 12
            const rowTint = eliminatedSQ1 ? 'bg-red-500/5' : eliminatedSQ2 ? 'bg-yellow-500/5' : ''

            return (
              <tr
                key={pos}
                className={`border-b border-glass-border/50 hover:bg-black/[0.04] transition-colors team-stripe ${rowTint}`}
                style={{ '--stripe-color': teamColor }}
              >
                <td className="py-1.5 px-2">
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono"
                    style={posColor ? { color: posColor } : { color: pos <= 8 ? '#1A1A2E' : '#9CA3AF' }}
                  >
                    {pos}
                  </span>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs font-mono">{code}</span>
                    <span className="text-label-tertiary text-xs hidden sm:inline">
                      {formatDriverName(code, fullName)}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                    <span className="text-xs text-label-tertiary">{constructor}</span>
                  </div>
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-xs">
                  {r.sq1 ? formatLapTime(r.sq1) : '-'}
                </td>
                {hasSQ2 && (
                  <td className="py-1.5 px-2 text-right font-mono text-xs">
                    {r.sq2 ? formatLapTime(r.sq2) : (
                      <span className={eliminatedSQ1 ? 'text-label-tertiary/40' : ''}>-</span>
                    )}
                  </td>
                )}
                {hasSQ3 && (
                  <td className="py-1.5 px-2 text-right font-mono text-xs">
                    {r.sq3 ? formatLapTime(r.sq3) : (
                      <span className={eliminatedSQ1 || eliminatedSQ2 ? 'text-label-tertiary/40' : ''}>-</span>
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
    return <div className="text-label-tertiary text-center py-8">No pit stop data</div>
  }

  const sorted = [...stops].sort((a, b) => (a.lap || 0) - (b.lap || 0))

  const maxDuration = sorted.reduce((max, s) => {
    const d = parseFloat(s.duration)
    return !isNaN(d) && d > max ? d : max
  }, 0)

  const durations = sorted.map(s => parseFloat(s.duration)).filter(d => !isNaN(d) && d > 0)
  const fastest = durations.length ? Math.min(...durations) : null
  const slowest = durations.length ? Math.max(...durations) : null
  const average = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null
  const fastestStop = fastest !== null ? sorted.find(s => parseFloat(s.duration) === fastest) : null
  const slowestStop = slowest !== null ? sorted.find(s => parseFloat(s.duration) === slowest) : null

  return (
    <div className="overflow-x-auto">
      {durations.length > 0 && (
        <div className="flex flex-wrap gap-4 px-3 py-2 mb-3 rounded bg-black/[0.03] border border-glass-border text-xs">
          <div className="flex items-center gap-2">
            <span className="text-label-tertiary uppercase tracking-wider text-[10px]">Fastest</span>
            <span className="font-mono font-bold text-[#4ade80]">{fastest.toFixed(1)}s</span>
            {fastestStop && (
              <span className="font-mono text-label-tertiary">{fastestStop.driver?.code || fastestStop._driver_code || ''}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-label-tertiary uppercase tracking-wider text-[10px]">Average</span>
            <span className="font-mono font-bold text-[#eab308]">{average.toFixed(1)}s</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-label-tertiary uppercase tracking-wider text-[10px]">Slowest</span>
            <span className="font-mono font-bold text-[#ef4444]">{slowest.toFixed(1)}s</span>
            {slowestStop && (
              <span className="font-mono text-label-tertiary">{slowestStop.driver?.code || slowestStop._driver_code || ''}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-label-tertiary uppercase tracking-wider text-[10px]">Total Stops</span>
            <span className="font-mono font-bold">{durations.length}</span>
          </div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-glass-border text-label-tertiary text-[10px] tracking-wider uppercase">
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
                className="border-b border-glass-border/50 hover:bg-black/[0.04] transition-colors team-stripe"
                style={{ '--stripe-color': teamColor }}
              >
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs font-mono">{code}</span>
                    {fullName && (
                      <span className="text-label-tertiary text-xs hidden sm:inline">
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
                  <div className="flex-1 bg-glass-border rounded-full h-2 overflow-hidden">
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

/* ─── Position Chart ──────────────────────────────────────── */

function PositionChart({ laps }) {
  const traces = useMemo(() => {
    if (!laps || !laps.length) return []

    const drivers = {}
    for (const lap of laps) {
      for (const d of (lap.drivers || [])) {
        if (!drivers[d.code]) {
          drivers[d.code] = { code: d.code, constructor: d.constructor || '', x: [], y: [] }
        }
        drivers[d.code].x.push(lap.lap)
        drivers[d.code].y.push(d.position)
      }
    }

    return Object.values(drivers).map(d => ({
      x: d.x,
      y: d.y,
      name: d.code,
      type: 'scatter',
      mode: 'lines',
      line: { color: getTeamColor(d.constructor), width: 2 },
      hovertemplate: `Lap %{x}: ${d.code} P%{y}<extra></extra>`,
    }))
  }, [laps])

  if (!laps || !laps.length) {
    return <div className="text-label-tertiary text-center py-8">No lap position data</div>
  }

  const maxLap = laps[laps.length - 1]?.lap || 1
  const maxPos = Math.max(20, ...traces.flatMap(t => t.y))

  return (
    <Plot
      data={traces}
      layout={getPlotlyGlassLayout({
        height: 500,
        margin: { t: 30, r: 20, b: 50, l: 50 },
        xaxis: {
          title: { text: 'Lap' },
          range: [1, maxLap],
          dtick: Math.ceil(maxLap / 15),
        },
        yaxis: {
          title: { text: 'Position' },
          autorange: 'reversed',
          range: [0.5, maxPos + 0.5],
          dtick: 1,
        },
        hovermode: 'x unified',
        showlegend: true,
        legend: {
          orientation: 'h',
          y: -0.15,
          font: { size: 9 },
        },
      })}
      config={{ displayModeBar: false, responsive: true }}
      useResizeHandler
      className="w-full"
    />
  )
}
