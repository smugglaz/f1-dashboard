import { useMemo } from 'react'
import Plot from 'react-plotly.js'
import { Card, CardContent } from '@/components/ui/card'
import { getTeamColor, getTeamName } from '@/utils/teams'
import KeyMoments from './KeyMoments'

export default function UnfoldsSection({ lapPositions, raceControl, weather, raceResults }) {
  const { traces, layout } = useMemo(() => {
    if (!lapPositions?.drivers?.length) return { traces: [], layout: {} }

    const drivers = lapPositions.drivers
    const totalLaps = lapPositions.total_laps || 1

    // Show top 10 by finishing position
    const sorted = [...drivers]
      .sort((a, b) => (a.finish_position || 99) - (b.finish_position || 99))
      .slice(0, 10)

    const t = sorted.map(d => ({
      x: d.laps?.map(l => l.lap) || [],
      y: d.laps?.map(l => l.position) || [],
      name: d.code,
      mode: 'lines',
      line: { color: getTeamColor(getTeamName(d)), width: 2 },
      hovertemplate: `${d.code}: P%{y}<extra>Lap %{x}</extra>`,
      connectgaps: true,
    }))

    const maxDrivers = Math.min(20, Math.max(...drivers.map(d => d.laps?.length ? Math.max(...d.laps.map(l => l.position)) : 20), 20))

    const l = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: '#1d1d1f', family: 'Inter, system-ui, sans-serif', size: 11 },
      xaxis: {
        title: { text: 'Lap', font: { size: 11, color: '#86868b' } },
        gridcolor: 'rgba(0,0,0,0.06)',
        tickfont: { color: '#aeaeb2', size: 10 },
        linecolor: 'rgba(0,0,0,0.06)',
        range: [0, totalLaps + 1],
      },
      yaxis: {
        title: { text: 'Position', font: { size: 11, color: '#86868b' } },
        gridcolor: 'rgba(0,0,0,0.06)',
        tickfont: { color: '#aeaeb2', size: 10 },
        linecolor: 'rgba(0,0,0,0.06)',
        autorange: 'reversed',
        range: [0.5, maxDrivers + 0.5],
        dtick: 1,
      },
      margin: { t: 10, r: 10, b: 50, l: 50 },
      legend: {
        orientation: 'h',
        y: -0.2,
        font: { size: 10, color: '#86868b' },
      },
      hovermode: 'x unified',
      hoverlabel: {
        bgcolor: 'rgba(255,255,255,0.92)',
        bordercolor: 'rgba(0,0,0,0.08)',
        font: { family: 'Inter, system-ui, sans-serif', size: 11, color: '#1d1d1f' },
      },
      height: 500,
    }

    return { traces: t, layout: l }
  }, [lapPositions])

  return (
    <section id="unfolds" className="scroll-mt-8 space-y-6">
      <div>
        <h2 className="text-title-1 font-semibold">The Race Unfolds</h2>
        <p className="text-footnote text-label-secondary mt-1">
          Lap-by-lap position chart — the movie of the race.
        </p>
      </div>

      {/* Position chart */}
      {traces.length > 0 ? (
        <Card>
          <CardContent className="p-5">
            <Plot
              data={traces}
              layout={layout}
              config={{ responsive: true, displayModeBar: false }}
              className="w-full"
            />
          </CardContent>
        </Card>
      ) : raceResults?.results?.length > 0 ? (
        /* Fallback: grid vs finish position delta when lap data unavailable */
        <Card>
          <CardContent className="p-5">
            <p className="text-caption-2 uppercase tracking-wider text-label-tertiary mb-4">Grid vs Finish</p>
            <div className="space-y-1.5">
              {[...raceResults.results]
                .sort((a, b) => (a.position || 99) - (b.position || 99))
                .slice(0, 15)
                .map((r, i) => {
                  const grid = r.grid || r.position || 0
                  const finish = r.position || 0
                  const delta = grid - finish
                  const code = r.driver?.code || r.code || '-'
                  const teamColor = getTeamColor(getTeamName(r))
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-5 font-mono font-bold text-right" style={{ color: teamColor }}>
                        P{finish}
                      </span>
                      <span className="font-mono font-semibold w-10">{code}</span>
                      <div className="flex-1 flex items-center gap-1">
                        <div className="h-1.5 rounded-full" style={{
                          width: `${Math.min(100, Math.abs(delta) * 8 + 4)}%`,
                          backgroundColor: delta > 0 ? '#34C759' : delta < 0 ? '#FF3B30' : '#aeaeb2',
                        }} />
                      </div>
                      <span className={`font-mono text-[10px] font-semibold w-8 text-right ${
                        delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-500' : 'text-label-tertiary'
                      }`}>
                        {delta > 0 ? `+${delta}` : delta === 0 ? '=' : delta}
                      </span>
                    </div>
                  )
                })}
            </div>
            <p className="text-caption-2 text-label-quaternary mt-3 text-center">
              Lap-by-lap data not available for this race
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-5">
            <p className="text-footnote text-label-tertiary text-center py-4">
              Position data not available for this race.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key moments timeline */}
      {raceControl?.messages?.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-caption-2 uppercase tracking-wider text-label-tertiary mb-4">Key Moments</p>
            <KeyMoments raceControl={raceControl} weather={weather} />
          </CardContent>
        </Card>
      )}
    </section>
  )
}
