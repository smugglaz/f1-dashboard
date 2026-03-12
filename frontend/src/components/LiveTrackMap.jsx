import Plot from 'react-plotly.js'

export default function LiveTrackMap({ trackData, positions = [] }) {
  const traces = []

  if (trackData) {
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: trackData.x,
      y: trackData.y,
      line: { color: '#333', width: 6 },
      showlegend: false,
      hoverinfo: 'skip',
    })
  }

  if (positions.length) {
    traces.push({
      type: 'scatter',
      mode: 'markers+text',
      x: positions.map(p => p.x),
      y: positions.map(p => p.y),
      text: positions.map(p => p.abbreviation || p.driver_number || ''),
      textposition: 'top center',
      textfont: { color: '#E0E0E0', size: 9, family: 'monospace' },
      marker: {
        size: 10,
        color: positions.map(p => {
          // Use team color: OpenF1 sends hex without #
          if (p.team_colour) return `#${p.team_colour}`
          return p.color || '#fff'
        }),
        line: { color: '#000', width: 1 },
      },
      showlegend: false,
      hovertemplate: '%{text}<extra></extra>',
    })
  }

  return (
    <div>
      <Plot
        data={traces}
        layout={{
          paper_bgcolor: '#1E1E2E',
          plot_bgcolor: '#1E1E2E',
          margin: { l: 5, r: 5, t: 5, b: 5 },
          xaxis: { visible: false, scaleanchor: 'y' },
          yaxis: { visible: false },
          showlegend: false,
        }}
        config={{ responsive: true, displayModeBar: false }}
        style={{ width: '100%', height: '300px' }}
      />
      <div className="text-f1-muted text-[10px] text-center mt-1">
        Positions approximate — interpolated from sector data
      </div>
    </div>
  )
}
