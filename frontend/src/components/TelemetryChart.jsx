import Plot from 'react-plotly.js'
import { getPlotlyGlassLayout } from '@/utils/chartTheme'

export default function TelemetryChart({ drivers = [] }) {
  const traces = []

  for (const drv of drivers) {
    const tel = drv.telemetry
    const color = drv.color || '#ffffff'

    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: tel.distance,
      y: tel.speed,
      name: drv.abbreviation || drv.driver,
      line: { color, width: 1.5 },
      yaxis: 'y',
      hovertemplate: `%{y:.0f} km/h<extra>${drv.abbreviation || ''}</extra>`,
    })
  }

  return (
    <Plot
      data={traces}
      layout={getPlotlyGlassLayout({
        margin: { l: 55, r: 20, t: 10, b: 40 },
        xaxis: {
          title: { text: 'Distance (m)' },
          zeroline: false,
        },
        yaxis: {
          title: { text: 'Speed (km/h)' },
          zeroline: false,
        },
        legend: { bgcolor: 'rgba(0,0,0,0)' },
        height: 300,
      })}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />
  )
}
