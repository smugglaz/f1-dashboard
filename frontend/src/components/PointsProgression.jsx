import { useMemo } from 'react'
import Plot from 'react-plotly.js'
import { useApi } from '../hooks/useApi'
import { getTeamColor } from '../utils/teams'
import LoadingSpinner from './LoadingSpinner'

export default function PointsProgression({ year }) {
  const { data, loading } = useApi(
    year ? `/api/historical/standings/drivers/${year}/progression` : null
  )

  const { traces, layout } = useMemo(() => {
    if (!data?.rounds?.length) return { traces: [], layout: {} }

    const rounds = data.rounds
    const roundNums = rounds.map(r => r.round)
    const roundNames = rounds.map(r => r.round_name.replace(' Grand Prix', ''))

    // Get top 10 drivers by final standings
    const lastRound = rounds[rounds.length - 1]
    const topDrivers = lastRound.drivers
      .sort((a, b) => a.position - b.position)
      .slice(0, 10)
      .map(d => d.code)

    const driverConstructor = {}
    for (const d of lastRound.drivers) {
      driverConstructor[d.code] = d.constructor
    }

    const t = topDrivers.map(code => {
      const points = rounds.map(r => {
        const d = r.drivers.find(d => d.code === code)
        return d ? d.points : null
      })
      const teamColor = getTeamColor(driverConstructor[code] || '')
      return {
        x: roundNums,
        y: points,
        name: code,
        mode: 'lines+markers',
        line: { color: teamColor, width: 2.5 },
        marker: { size: 4, color: teamColor },
        hovertemplate: `${code}: %{y} pts<extra>Round %{x}</extra>`,
        connectgaps: true,
      }
    })

    const l = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: '#1d1d1f', family: 'Inter, system-ui, sans-serif', size: 11 },
      xaxis: {
        title: { text: 'Round', font: { size: 11, color: '#86868b' } },
        gridcolor: 'rgba(0,0,0,0.06)',
        tickvals: roundNums,
        ticktext: roundNames,
        tickangle: -45,
        tickfont: { size: 9, color: '#aeaeb2' },
        linecolor: 'rgba(0,0,0,0.06)',
        zerolinecolor: 'rgba(0,0,0,0.06)',
      },
      yaxis: {
        title: { text: 'Points', font: { size: 11, color: '#86868b' } },
        gridcolor: 'rgba(0,0,0,0.06)',
        tickfont: { color: '#aeaeb2' },
        linecolor: 'rgba(0,0,0,0.06)',
        zerolinecolor: 'rgba(0,0,0,0.06)',
      },
      margin: { t: 10, r: 10, b: 80, l: 50 },
      legend: {
        orientation: 'h',
        y: -0.35,
        font: { size: 10, color: '#86868b' },
      },
      hovermode: 'x unified',
      hoverlabel: {
        bgcolor: 'rgba(255,255,255,0.92)',
        bordercolor: 'rgba(0,0,0,0.08)',
        font: { family: 'Inter, system-ui, sans-serif', size: 11, color: '#1d1d1f' },
      },
      height: 350,
    }

    return { traces: t, layout: l }
  }, [data])

  if (loading) return <LoadingSpinner />
  if (!data?.rounds?.length) {
    return <p className="text-footnote text-label-tertiary text-center py-4">No standings progression data available</p>
  }

  return (
    <Plot
      data={traces}
      layout={layout}
      config={{ responsive: true, displayModeBar: false }}
      className="w-full"
    />
  )
}
