import { useState, useMemo } from 'react'
import { useApi } from '../hooks/useApi'
import { PageHeader } from '@/components/ui/page-header'
import { DataCard } from '@/components/ui/data-card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3, Users, TrendingUp, GitCompare } from 'lucide-react'
import HeroKPIs from '@/components/dashboard/HeroKPIs'
import RecentRaceSummary from '@/components/dashboard/RecentRaceSummary'
import UpcomingRace from '@/components/dashboard/UpcomingRace'
import RaceTimeline from '@/components/dashboard/RaceTimeline'
import StandingsTable from '../components/StandingsTable'
import PointsProgression from '../components/PointsProgression'
import TeammateComparison from '../components/TeammateComparison'
import DriverStatsCard from '../components/DriverStatsCard'

export default function Dashboard() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [selectedDriver, setSelectedDriver] = useState(null)

  const { data: seasonsData } = useApi('/api/historical/seasons')
  const { data: driverData, loading: loadingD } = useApi(`/api/historical/standings/drivers/${year}`)
  const { data: constructorData, loading: loadingC } = useApi(`/api/historical/standings/constructors/${year}`)
  const { data: racesData, loading: loadingR } = useApi(`/api/historical/races/${year}`)

  const driverStandings = driverData?.standings || []
  const constructorStandings = constructorData?.standings || []
  const races = racesData?.races || []

  const { lastCompletedRound, nextRaceRound } = useMemo(() => {
    if (!races.length) return {}
    const now = new Date()
    const past = races.filter(r => new Date(r.date) <= now && r.winner)
    const future = races.filter(r => new Date(r.date) > now)
    return {
      lastCompletedRound: past.length ? past[past.length - 1].round : null,
      nextRaceRound: future.length ? future[0].round : null,
    }
  }, [races])

  const yearList = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      {/* Header + year selector */}
      <PageHeader title="F1 Dashboard" subtitle={`${year} Season`}>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearList.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Hero KPI cards */}
      {loadingD || loadingC || loadingR ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-f1-card rounded-lg border border-f1-border p-4 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ) : (
        <HeroKPIs
          driverStandings={driverStandings}
          constructorStandings={constructorStandings}
          races={races}
          year={year}
        />
      )}

      {/* Race Timeline strip */}
      {!loadingR && <RaceTimeline races={races} />}

      {/* Recent Race + Upcoming Race side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentRaceSummary year={year} round={lastCompletedRound} />
        <UpcomingRace year={year} round={nextRaceRound} />
      </div>

      {/* Standings side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataCard title="Driver Standings" icon={BarChart3}>
          {loadingD ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <StandingsTable data={driverStandings} type="driver" />
          )}
        </DataCard>
        <DataCard title="Constructor Standings" icon={Users}>
          {loadingC ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <StandingsTable data={constructorStandings} type="constructor" />
          )}
        </DataCard>
      </div>

      {/* Championship Progression */}
      <DataCard title="Championship Progression" icon={TrendingUp}>
        <PointsProgression year={year} />
      </DataCard>

      {/* Driver Season Stats */}
      {driverStandings.length > 0 && (
        <DataCard
          title="Driver Season Stats"
          icon={BarChart3}
          action={
            <select
              value={selectedDriver || ''}
              onChange={e => setSelectedDriver(e.target.value || null)}
              className="bg-white border border-f1-border rounded px-2 py-1 text-xs"
            >
              <option value="">Select driver...</option>
              {driverStandings.map(s => (
                <option key={s.driver.id} value={s.driver.id}>
                  {s.driver.code} — {s.driver.name}
                </option>
              ))}
            </select>
          }
        >
          {selectedDriver ? (
            <DriverStatsCard year={year} driverId={selectedDriver} />
          ) : (
            <p className="text-sm text-f1-muted text-center py-3">Select a driver to view season statistics</p>
          )}
        </DataCard>
      )}

      {/* Teammate Comparison */}
      <DataCard title="Teammate Comparison" icon={GitCompare}>
        <TeammateComparison year={year} />
      </DataCard>
    </div>
  )
}
