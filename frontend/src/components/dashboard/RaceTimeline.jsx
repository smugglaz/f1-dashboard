import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTeamColor } from '@/utils/teams'
import { ChevronRight } from 'lucide-react'

export default function RaceTimeline({ races }) {
  const { lastRace, nextRace, afterNext } = useMemo(() => {
    if (!races?.length) return {}
    const now = new Date()
    const past = races.filter(r => new Date(r.date) <= now && r.winner)
    const future = races.filter(r => new Date(r.date) > now)
    return {
      lastRace: past[past.length - 1] || null,
      nextRace: future[0] || null,
      afterNext: future[1] || null,
    }
  }, [races])

  if (!lastRace && !nextRace) return null

  const items = [
    lastRace && { type: 'past', label: 'Last Race', race: lastRace },
    nextRace && { type: 'next', label: 'Next Race', race: nextRace },
    afterNext && { type: 'future', label: 'Coming Up', race: afterNext },
  ].filter(Boolean)

  return (
    <div className="flex items-stretch gap-2">
      {items.map((item, i) => {
        const r = item.race
        const teamColor = r.winner ? getTeamColor(r.winner.constructor || '') : null
        const isNext = item.type === 'next'

        return (
          <div key={i} className="flex items-stretch gap-2 flex-1">
            <Card className={`flex-1 ${isNext ? 'ring-1 ring-f1-red/50' : ''}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-f1-muted uppercase tracking-wider">{item.label}</span>
                  <Badge variant={isNext ? 'default' : 'outline'} className="text-[9px] px-1.5 py-0">
                    R{r.round}
                  </Badge>
                  {r.has_sprint && (
                    <Badge variant="warning" className="text-[9px] px-1.5 py-0">Sprint</Badge>
                  )}
                </div>
                <p className="text-sm font-semibold truncate">{r.name?.replace(' Grand Prix', ' GP')}</p>
                <p className="text-xs text-f1-muted truncate">{r.circuit?.name}</p>
                {r.winner ? (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: teamColor || '#555' }} />
                    <span className="text-xs font-mono font-bold">{r.winner.code}</span>
                  </div>
                ) : (
                  <p className="text-xs text-f1-muted mt-1.5 font-mono">
                    {r.date ? new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
                  </p>
                )}
              </CardContent>
            </Card>
            {i < items.length - 1 && (
              <div className="flex items-center text-f1-border">
                <ChevronRight className="h-4 w-4" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
