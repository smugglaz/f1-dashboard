import Plot from 'react-plotly.js'
import { getPlotlyGlassLayout } from '@/utils/chartTheme'

export default function LapComparison({ drivers = [] }) {
  if (drivers.length < 2) {
    return <div className="text-label-tertiary text-center py-8">Select 2+ drivers to compare lap delta</div>
  }

  const refDriver = drivers[0]

  const traces = drivers.slice(1).map((drv) => ({
    type: 'scatter',
    mode: 'lines',
    x: drv.telemetry.distance,
    y: drv.delta || [],
    name: `${drv.abbreviation} vs ${refDriver.abbreviation}`,
    line: { color: drv.color || '#ffffff', width: 2 },
    hovertemplate: `Delta: %{y:.3f}s<extra>${drv.abbreviation}</extra>`,
  }))

  return (
    <div>
      <div className="text-xs text-label-tertiary px-1 mb-1">
        Reference: <span className="font-bold text-label-primary">{refDriver.abbreviation}</span>
        {' — '}positive = behind, negative = ahead
      </div>
      <Plot
        data={traces}
        layout={getPlotlyGlassLayout({
          margin: { l: 55, r: 20, t: 10, b: 40 },
          xaxis: {
            title: { text: 'Distance (m)' },
            zeroline: false,
          },
          yaxis: {
            title: { text: 'Delta (s)' },
            zeroline: true,
            zerolinecolor: '#E10600',
            zerolinewidth: 1.5,
          },
          legend: { bgcolor: 'rgba(0,0,0,0)' },
          height: 250,
          shapes: [{
            type: 'line',
            x0: 0, x1: 1, xref: 'paper',
            y0: 0, y1: 0,
            line: { color: '#E10600', width: 1, dash: 'dot' },
          }],
        })}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%' }}
      />
    </div>
  )
}
