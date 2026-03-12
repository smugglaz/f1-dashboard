import Plot from 'react-plotly.js'

const DARK_LAYOUT = {
  paper_bgcolor: '#1E1E2E',
  plot_bgcolor: '#1E1E2E',
  font: { color: '#E0E0E0', size: 11, family: '-apple-system, BlinkMacSystemFont, sans-serif' },
  margin: { l: 55, r: 20, t: 10, b: 40 },
  legend: { bgcolor: 'rgba(0,0,0,0)', font: { size: 11 } },
  xaxis: {
    title: { text: 'Distance (m)', font: { size: 10, color: '#8888AA' } },
    gridcolor: '#1E1E2E',
    color: '#8888AA',
    zeroline: false,
  },
}

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
      layout={{
        ...DARK_LAYOUT,
        yaxis: {
          title: { text: 'Speed (km/h)', font: { size: 10, color: '#8888AA' } },
          gridcolor: '#2A2A3E',
          color: '#8888AA',
          zeroline: false,
        },
        height: 300,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%' }}
    />
  )
}
