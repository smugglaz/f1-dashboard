import Plot from 'react-plotly.js'
import { getPlotlyGlassLayout, chartColors } from '@/utils/chartTheme'

const COLOR_MODES = {
  speed: { label: 'Speed (km/h)', colorscale: 'Plasma' },
  throttle: { label: 'Throttle (%)', colorscale: 'YlOrRd' },
  brake: { label: 'Brake', colorscale: [[0, 'transparent'], [1, '#ef4444']] },
  gear: { label: 'Gear', colorscale: 'Viridis' },
}

export default function TrackMap({ trackData, telemetryData = [], colorMode = 'speed', corners = [], title = '' }) {
  const traces = []

  if (trackData) {
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: trackData.x,
      y: trackData.y,
      line: { color: '#333', width: 10 },
      showlegend: false,
      hoverinfo: 'skip',
    })
  }

  for (const drv of telemetryData) {
    const tel = drv.telemetry
    const cm = COLOR_MODES[colorMode] || COLOR_MODES.speed
    const colorValues = tel[colorMode] || tel.speed

    traces.push({
      type: 'scatter',
      mode: 'markers',
      x: tel.x,
      y: tel.y,
      marker: {
        color: colorValues,
        colorscale: cm.colorscale,
        size: 3.5,
        colorbar: telemetryData.length === 1 ? {
          title: { text: cm.label, font: { size: 10 } },
          thickness: 12,
          len: 0.6,
          tickfont: { size: 9 },
        } : undefined,
      },
      name: drv.abbreviation || drv.driver,
      hovertemplate: `${cm.label}: %{marker.color:.0f}<extra>${drv.abbreviation || ''}</extra>`,
    })
  }

  const annotations = corners.map(c => ({
    x: c.x,
    y: c.y,
    text: `T${c.number}`,
    showarrow: false,
    font: { color: '#E10600', size: 9, family: 'monospace' },
    bgcolor: 'rgba(30,30,46,0.8)',
    borderpad: 2,
  }))

  if (trackData && trackData.x.length > 0) {
    annotations.push({
      x: trackData.x[0],
      y: trackData.y[0],
      text: 'S/F',
      showarrow: true,
      arrowhead: 0,
      arrowcolor: '#E10600',
      font: { color: '#E10600', size: 8, family: 'monospace' },
      bgcolor: 'rgba(30,30,46,0.9)',
      borderpad: 2,
    })
  }

  return (
    <Plot
      data={traces}
      layout={getPlotlyGlassLayout({
        margin: { l: 10, r: 10, t: 30, b: 10 },
        xaxis: { visible: false, scaleanchor: 'y' },
        yaxis: { visible: false },
        showlegend: true,
        legend: { bgcolor: 'rgba(0,0,0,0)' },
        annotations,
        title: title ? { text: title, font: { size: 13, color: chartColors.primary }, x: 0.02, xanchor: 'left' } : '',
      })}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%', height: '500px' }}
    />
  )
}
