import { useApiQuery } from '@/hooks/useApiQuery'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getTeamColor } from '@/utils/teams'
import { Timer } from 'lucide-react'

function msToTime(ms) {
  if (!ms) return '-'
  const totalSecs = ms / 1000
  const mins = Math.floor(totalSecs / 60)
  const secs = (totalSecs % 60).toFixed(3)
  if (mins > 0) return `${mins}:${secs.padStart(6, '0')}`
  return `${secs}`
}

export default function SectorAnalysis({ year, round, session = 'Qualifying' }) {
  const { data, loading } = useApiQuery(
    year && round ? `/api/historical/sectors/${year}/${round}/${session}` : null
  )

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Sector Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-6 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  if (!data?.drivers?.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Timer className="h-4 w-4" />Sector Analysis</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-label-tertiary text-center py-4">
            No sector data available. Requires FastF1 data (2018+ races).
          </p>
        </CardContent>
      </Card>
    )
  }

  const { drivers, session_bests } = data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-label-tertiary" />
          Sector Analysis — {session}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Session theoretical best */}
        {session_bests?.theoretical_best_ms && (
          <div className="mb-3 px-3 py-2 rounded bg-purple-500/10 border border-purple-500/20 text-xs">
            <span className="text-purple-400 font-semibold">Theoretical Best: </span>
            <span className="font-mono font-bold text-purple-300">{msToTime(session_bests.theoretical_best_ms)}</span>
            <span className="text-label-tertiary ml-2">
              ({msToTime(session_bests.s1_ms)} + {msToTime(session_bests.s2_ms)} + {msToTime(session_bests.s3_ms)})
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border text-label-tertiary text-[10px] tracking-wider uppercase">
                <th className="py-2 px-2 text-left w-10">#</th>
                <th className="py-2 px-2 text-left">DRIVER</th>
                <th className="py-2 px-2 text-right">S1</th>
                <th className="py-2 px-2 text-right">S2</th>
                <th className="py-2 px-2 text-right">S3</th>
                <th className="py-2 px-2 text-right">BEST LAP</th>
                <th className="py-2 px-2 text-right">THEORETICAL</th>
                <th className="py-2 px-2 text-right">SPEED TRAP</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d, i) => (
                <tr key={d.code} className="border-b border-glass-border/50 hover:bg-black/[0.04] transition-colors">
                  <td className="py-1.5 px-2 text-xs text-label-tertiary font-mono">{i + 1}</td>
                  <td className="py-1.5 px-2">
                    <span className="text-xs font-mono font-bold">{d.code}</span>
                  </td>
                  <td className={`py-1.5 px-2 text-right font-mono text-xs ${d.is_session_best_s1 ? 'text-purple-400 font-bold' : ''}`}>
                    {msToTime(d.best_s1_ms)}
                  </td>
                  <td className={`py-1.5 px-2 text-right font-mono text-xs ${d.is_session_best_s2 ? 'text-purple-400 font-bold' : ''}`}>
                    {msToTime(d.best_s2_ms)}
                  </td>
                  <td className={`py-1.5 px-2 text-right font-mono text-xs ${d.is_session_best_s3 ? 'text-purple-400 font-bold' : ''}`}>
                    {msToTime(d.best_s3_ms)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-xs font-semibold">
                    {msToTime(d.best_lap_ms)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-xs text-label-tertiary">
                    {msToTime(d.theoretical_best_ms)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-xs">
                    {d.max_speed_trap ? `${d.max_speed_trap.toFixed(0)} km/h` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
