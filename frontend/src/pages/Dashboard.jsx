import { useState, useMemo } from 'react'
import { useApiQuery } from '../hooks/useApiQuery'
import { useScrollReveal } from '@/hooks/useScrollReveal'
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

function RevealSection({ children }) {
  const { ref, visible } = useScrollReveal()
  return (
    <div ref={ref} className={`scroll-reveal ${visible ? 'visible' : ''}`}>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [selectedDriver, setSelectedDriver] = useState(null)

  const { data: seasonsData } = useApiQuery('/api/historical/seasons')
  const { data: driverData, loading: loadingD } = useApiQuery(`/api/historical/standings/drivers/${year}`)
  const { data: constructorData, loading: loadingC } = useApiQuery(`/api/historical/standings/constructors/${year}`)
  const { data: racesData, loading: loadingR } = useApiQuery(`/api/historical/races/${year}`)

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
    <div className="space-y-8">
      {/* Header + year selector */}
      <PageHeader title={`${year} Season`}>
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
            <div key={i} className="glass rounded-2xl p-5 space-y-3">
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
      {!loadingR && <RaceTimeline races={races} year={year} />}

      {/* Recent Race + Upcoming Race side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentRaceSummary year={year} round={lastCompletedRound} />
        <UpcomingRace year={year} round={nextRaceRound} />
      </div>

      {/* Standings side-by-side */}
      <RevealSection>
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
      </RevealSection>

      {/* Championship Progression */}
      <RevealSection>
        <DataCard title="Championship Progression" icon={TrendingUp}>
          <PointsProgression year={year} />
        </DataCard>
      </RevealSection>

      {/* Driver Season Stats */}
      {driverStandings.length > 0 && (
        <RevealSection>
          <DataCard
            title="Driver Season Stats"
            icon={BarChart3}
            action={
              <Select value={selectedDriver || ''} onValueChange={v => setSelectedDriver(v || null)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select driver..." />
                </SelectTrigger>
                <SelectContent>
                  {driverStandings.map(s => (
                    <SelectItem key={s.driver.id} value={s.driver.id}>
                      {s.driver.code} — {s.driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          >
            {selectedDriver ? (
              <DriverStatsCard year={year} driverId={selectedDriver} />
            ) : (
              <p className="text-footnote text-center py-3">Select a driver to view season statistics</p>
            )}
          </DataCard>
        </RevealSection>
      )}

      {/* Teammate Comparison */}
      <RevealSection>
        <DataCard title="Teammate Comparison" icon={GitCompare}>
          <TeammateComparison year={year} />
        </DataCard>
      </RevealSection>
    </div>
  )
}
