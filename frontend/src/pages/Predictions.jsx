import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import Plot from 'react-plotly.js'
import LoadingSpinner from '../components/LoadingSpinner'
import { getTeamColor } from '../utils/teams'
import { getPositionColor } from '../utils/colors'
import { formatDriverName } from '../utils/format'

export default function Predictions() {
  const { data: prediction, loading, error } = useApi('/api/predictions/next-race')
  const { data: modelInfo } = useApi('/api/predictions/model-info')
  const [showInfo, setShowInfo] = useState(false)

  if (loading) return <LoadingSpinner />

  if (error || !prediction) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Race Predictions</h1>
        <div className="bg-f1-card rounded-lg p-12 border border-f1-border text-center">
          <div className="text-4xl mb-4">🔮</div>
          <div className="text-xl font-semibold mb-2">Predictions Unavailable</div>
          <div className="text-f1-muted">
            {error || 'The prediction model needs historical data to generate forecasts. Check back after data sync completes.'}
          </div>
        </div>
      </div>
    )
  }

  const drivers = prediction.predictions || []
  const sorted = [...drivers].sort((a, b) => (b.podium_probability || 0) - (a.podium_probability || 0))
  const top10 = sorted.slice(0, 10)

  // Use team colors for bars, falling back to teams.js lookup
  const barColors = top10.map(d => {
    if (d.team_color) return d.team_color
    return getTeamColor(d.constructor || '')
  }).reverse()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Race Predictions</h1>
          {prediction.race_name && (
            <div className="text-f1-muted text-sm mt-1">
              {prediction.race_name} — {prediction.year} Round {prediction.round}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="px-3 py-1.5 text-xs bg-f1-card border border-f1-border rounded hover:bg-white/5"
        >
          {showInfo ? 'Hide' : 'Show'} Model Info
        </button>
      </div>

      {showInfo && modelInfo && (
        <div className="bg-f1-card rounded-lg p-4 border border-f1-border animate-fade-in">
          <h2 className="text-sm font-semibold text-f1-muted mb-3">MODEL INFORMATION</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-f1-muted text-xs">Algorithm</div>
              <div>{modelInfo.algorithm || 'Gradient Boosting'}</div>
            </div>
            <div>
              <div className="text-f1-muted text-xs">Training Samples</div>
              <div>{modelInfo.training_samples?.toLocaleString() || '-'}</div>
            </div>
            <div>
              <div className="text-f1-muted text-xs">Accuracy</div>
              <div>{modelInfo.accuracy ? `${(modelInfo.accuracy * 100).toFixed(1)}%` : '-'}</div>
            </div>
            <div>
              <div className="text-f1-muted text-xs">Last Trained</div>
              <div>{modelInfo.last_trained ? new Date(modelInfo.last_trained).toLocaleDateString() : '-'}</div>
            </div>
          </div>
          {modelInfo.feature_importance && (
            <div className="mt-4">
              <div className="text-f1-muted text-xs mb-2">Feature Importance</div>
              <div className="space-y-1">
                {Object.entries(modelInfo.feature_importance)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([feat, imp]) => (
                    <div key={feat} className="flex items-center gap-2 text-xs">
                      <span className="w-40 text-f1-muted">{feat.replace(/_/g, ' ')}</span>
                      <div className="flex-1 bg-f1-dark rounded-full h-2">
                        <div className="bg-f1-red h-2 rounded-full" style={{ width: `${imp * 100}%` }} />
                      </div>
                      <span className="w-12 text-right">{(imp * 100).toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Podium probability chart — team-colored bars */}
      <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
        <h2 className="text-sm font-semibold text-f1-muted mb-3">PODIUM PROBABILITY</h2>
        <Plot
          data={[{
            type: 'bar',
            orientation: 'h',
            y: top10.map(d => d.driver_code || d.driver).reverse(),
            x: top10.map(d => (d.podium_probability || 0) * 100).reverse(),
            marker: { color: barColors },
            text: top10.map(d => `${((d.podium_probability || 0) * 100).toFixed(1)}%`).reverse(),
            textposition: 'outside',
            textfont: { color: '#E0E0E0', size: 11, family: '-apple-system, BlinkMacSystemFont, sans-serif' },
            hovertemplate: '%{y}: %{x:.1f}%<extra></extra>',
          }]}
          layout={{
            paper_bgcolor: '#1E1E2E',
            plot_bgcolor: '#1E1E2E',
            font: { color: '#E0E0E0', size: 11, family: '-apple-system, BlinkMacSystemFont, sans-serif' },
            margin: { l: 60, r: 60, t: 10, b: 40 },
            xaxis: {
              title: { text: 'Probability (%)', font: { size: 10 } },
              gridcolor: '#2A2A3E',
              range: [0, 80],
            },
            yaxis: { gridcolor: '#2A2A3E' },
            height: 350,
          }}
          config={{ responsive: true, displayModeBar: false }}
          style={{ width: '100%' }}
        />
      </div>

      {/* Full predictions table — team stripes, full names */}
      <div className="bg-f1-card rounded-lg p-4 border border-f1-border">
        <h2 className="text-sm font-semibold text-f1-muted mb-3">ALL PREDICTIONS</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-f1-border text-f1-muted text-[10px] tracking-wider uppercase">
                <th className="py-2 px-3 text-left w-10">#</th>
                <th className="py-2 px-3 text-left">DRIVER</th>
                <th className="py-2 px-3 text-left">TEAM</th>
                <th className="py-2 px-3 text-right">PODIUM %</th>
                <th className="py-2 px-3 text-right">GRID</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((d, i) => {
                const rank = i + 1
                const posColor = getPositionColor(rank)
                const teamColor = d.team_color || getTeamColor(d.constructor || '')
                const code = d.driver_code || d.driver || ''
                const fullName = d.driver_name || ''

                return (
                  <tr
                    key={i}
                    className="border-b border-f1-border/20 hover:bg-white/5 transition-colors team-stripe"
                    style={{ '--stripe-color': teamColor }}
                  >
                    <td className="py-2 px-3">
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono"
                        style={posColor ? { color: posColor } : { color: rank <= 10 ? '#e0e0e0' : '#8888AA' }}
                      >
                        {rank}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs font-mono">{code}</span>
                        {fullName && (
                          <span className="text-f1-muted text-xs hidden sm:inline">
                            {formatDriverName(code, fullName)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                        <span className="text-xs text-f1-muted">{d.constructor || '-'}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold">
                      {d.podium_probability ? `${(d.podium_probability * 100).toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-f1-muted">
                      {d.grid_position || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-200">
        <strong>Disclaimer:</strong> Predictions are generated by a machine learning model trained on historical data.
        They are for entertainment purposes only and should not be used for betting or other financial decisions.
        Confidence is capped at 70%. Actual race outcomes depend on many unpredictable factors.
      </div>
    </div>
  )
}
