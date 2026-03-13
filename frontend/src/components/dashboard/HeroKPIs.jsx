import { useMemo } from 'react'
import { Trophy, Flag, Users, Calendar } from 'lucide-react'
import { KpiCard } from '@/components/ui/kpi-card'
import { getTeamColor } from '@/utils/teams'
import { formatCountdown } from '@/utils/format'

export default function HeroKPIs({ driverStandings, constructorStandings, races, year }) {
  const stats = useMemo(() => {
    const leader = driverStandings?.[0]
    const second = driverStandings?.[1]
    const gap = leader && second ? leader.points - second.points : null

    // Most wins
    let winsLeader = null
    if (driverStandings?.length) {
      const sorted = [...driverStandings].sort((a, b) => (b.wins || 0) - (a.wins || 0))
      if (sorted[0]?.wins > 0) winsLeader = sorted[0]
    }

    // Constructor battle
    const topTeam = constructorStandings?.[0]
    const secondTeam = constructorStandings?.[1]
    const constructorGap = topTeam && secondTeam ? topTeam.points - secondTeam.points : null

    // Next race
    const now = new Date()
    const nextRace = races?.find(r => new Date(r.date) > now) || null

    // Completed races count
    const completedRaces = races?.filter(r => new Date(r.date) <= now && r.winner)?.length || 0
    const totalRaces = races?.length || 0

    return { leader, second, gap, winsLeader, topTeam, secondTeam, constructorGap, nextRace, completedRaces, totalRaces }
  }, [driverStandings, constructorStandings, races])

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Championship Leader"
        value={stats.leader?.driver?.code || '---'}
        delta={stats.gap != null ? `+${stats.gap} pts` : null}
        deltaLabel={stats.second ? `over ${stats.second.driver?.code}` : null}
        trend={stats.gap > 0 ? 'up' : 'neutral'}
        icon={Trophy}
      >
        <p className="text-caption-1 mt-1">
          {stats.leader?.points || 0} points &middot; {stats.leader?.wins || 0} wins
        </p>
      </KpiCard>

      <KpiCard
        title="Most Wins"
        value={stats.winsLeader ? `${stats.winsLeader.wins}` : '0'}
        delta={stats.winsLeader?.driver?.code}
        deltaLabel={stats.winsLeader?.constructor || ''}
        trend="up"
        icon={Flag}
      />

      <KpiCard
        title="Constructor Battle"
        value={stats.topTeam?.constructor?.name || '---'}
        delta={stats.constructorGap != null ? `+${stats.constructorGap} pts` : null}
        deltaLabel={stats.secondTeam ? `over ${stats.secondTeam.constructor?.name}` : null}
        trend={stats.constructorGap > 0 ? 'up' : 'neutral'}
        icon={Users}
      >
        <p className="text-caption-1 mt-1">
          {stats.topTeam?.points || 0} points
        </p>
      </KpiCard>

      <KpiCard
        title="Season Progress"
        value={stats.nextRace ? formatCountdown(stats.nextRace.date) : `${stats.completedRaces} races`}
        delta={stats.nextRace ? `Round ${stats.nextRace.round}` : null}
        deltaLabel={stats.nextRace?.name?.replace(' Grand Prix', ' GP') || `of ${stats.totalRaces}`}
        trend="neutral"
        icon={Calendar}
      >
        {stats.nextRace && (
          <p className="text-caption-1 mt-1">
            {stats.nextRace.circuit?.name}
          </p>
        )}
      </KpiCard>
    </div>
  )
}
