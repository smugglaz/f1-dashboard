import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getTeamColor, getTeamName } from '@/utils/teams'
import { getPositionColor } from '@/utils/colors'
import { formatDriverName } from '@/utils/format'

export default function NumbersSection({ race, qualifying, pitStops }) {
  const [open, setOpen] = useState(false)

  const results = race?.results || race?.race?.results || []
  const qualResults = qualifying?.results || qualifying || []
  const pits = pitStops?.pit_stops || pitStops?.stops || []

  const hasData = results.length > 0 || qualResults.length > 0 || pits.length > 0

  if (!hasData) return null

  return (
    <section id="numbers" className="scroll-mt-8 space-y-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full group"
      >
        <h2 className="text-title-1 font-semibold">The Numbers</h2>
        <div className="flex items-center gap-1 text-label-tertiary group-hover:text-label-primary transition-colors">
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          <span className="text-caption-1">{open ? 'Collapse' : 'Full results, qualifying, pit stops'}</span>
        </div>
      </button>

      {open && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Race Results */}
          {results.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="text-caption-2 uppercase tracking-wider text-label-tertiary mb-3">Race Classification</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-glass-border text-label-tertiary">
                        <th className="py-2 px-2 text-left text-caption-2 uppercase">Pos</th>
                        <th className="py-2 px-2 text-left text-caption-2 uppercase">Driver</th>
                        <th className="py-2 px-2 text-left text-caption-2 uppercase">Team</th>
                        <th className="py-2 px-2 text-left text-caption-2 uppercase">Grid</th>
                        <th className="py-2 px-2 text-right text-caption-2 uppercase">Time/Status</th>
                        <th className="py-2 px-2 text-right text-caption-2 uppercase">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => {
                        const teamColor = getTeamColor(getTeamName(r))
                        const posColor = getPositionColor(r.position)
                        return (
                          <tr key={i} className="border-b border-glass-border/50 hover:bg-black/[0.03]">
                            <td className="py-2 px-2">
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-bold font-mono"
                                style={posColor ? { backgroundColor: `${posColor}22`, color: posColor } : {}}
                              >
                                {r.position || '-'}
                              </span>
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: teamColor }} />
                                <span className="font-bold font-mono">{r.code || r.driver?.code || '-'}</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-label-secondary">{getTeamName(r) || '-'}</td>
                            <td className="py-2 px-2 font-mono text-label-secondary">{r.grid || '-'}</td>
                            <td className="py-2 px-2 text-right font-mono">
                              {r.time || r.status || '-'}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold">{r.points || ''}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Qualifying */}
          {qualResults.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="text-caption-2 uppercase tracking-wider text-label-tertiary mb-3">Qualifying</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-glass-border text-label-tertiary">
                        <th className="py-2 px-2 text-left text-caption-2 uppercase">Pos</th>
                        <th className="py-2 px-2 text-left text-caption-2 uppercase">Driver</th>
                        <th className="py-2 px-2 text-right text-caption-2 uppercase">Q1</th>
                        <th className="py-2 px-2 text-right text-caption-2 uppercase">Q2</th>
                        <th className="py-2 px-2 text-right text-caption-2 uppercase">Q3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qualResults.map((q, i) => {
                        const teamColor = getTeamColor(getTeamName(q))
                        return (
                          <tr key={i} className="border-b border-glass-border/50 hover:bg-black/[0.03]">
                            <td className="py-2 px-2 font-mono font-bold">{q.position || i + 1}</td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-1.5">
                                <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: teamColor }} />
                                <span className="font-bold font-mono">{q.code || q.driver?.code || '-'}</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-label-secondary">{q.q1 || '-'}</td>
                            <td className="py-2 px-2 text-right font-mono text-label-secondary">{q.q2 || '-'}</td>
                            <td className="py-2 px-2 text-right font-mono font-semibold">{q.q3 || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pit Stops */}
          {pits.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <p className="text-caption-2 uppercase tracking-wider text-label-tertiary mb-3">Pit Stops</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-glass-border text-label-tertiary">
                        <th className="py-2 px-2 text-left text-caption-2 uppercase">Driver</th>
                        <th className="py-2 px-2 text-right text-caption-2 uppercase">Stop</th>
                        <th className="py-2 px-2 text-right text-caption-2 uppercase">Lap</th>
                        <th className="py-2 px-2 text-right text-caption-2 uppercase">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pits.slice(0, 40).map((p, i) => (
                        <tr key={i} className="border-b border-glass-border/50 hover:bg-black/[0.03]">
                          <td className="py-2 px-2 font-mono font-bold">{p.driver_code || p.driver?.code || '-'}</td>
                          <td className="py-2 px-2 text-right font-mono text-label-secondary">{p.stop || '-'}</td>
                          <td className="py-2 px-2 text-right font-mono">{p.lap || '-'}</td>
                          <td className="py-2 px-2 text-right font-mono font-semibold">{p.duration || '-'}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  )
}
