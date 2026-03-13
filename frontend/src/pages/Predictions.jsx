import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import Plot from 'react-plotly.js'
import { getTeamColor, getTeamName } from '../utils/teams'
import { getPositionColor } from '../utils/colors'
import { formatDriverName } from '../utils/format'

import { getPlotlyGlassLayout } from '@/utils/chartTheme'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Sparkles, Brain, BarChart3, AlertTriangle } from 'lucide-react'

export default function Predictions() {
  const { data: prediction, loading, error } = useApi('/api/predictions/next-race')
  const { data: modelInfo } = useApi('/api/predictions/model-info')
  const [showInfo, setShowInfo] = useState(false)

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !prediction) {
    return (
      <div className="space-y-6">
        <PageHeader title="Race Predictions" />
        <EmptyState
          icon={Sparkles}
          title="Predictions Unavailable"
          description={error || 'The ML model requires synced historical data (race results, qualifying, and driver performance) to generate predictions. Go to Race Story and sync at least 1 recent season, then predictions will appear for the next upcoming race.'}
        />
      </div>
    )
  }

  const drivers = prediction.predictions || []
  const sorted = [...drivers].sort((a, b) => (b.podium_probability || 0) - (a.podium_probability || 0))
  const top10 = sorted.slice(0, 10)

  const barColors = top10.map(d => {
    if (d.team_color) return d.team_color
    return getTeamColor(getTeamName(d))
  }).reverse()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Race Predictions"
        subtitle={prediction.race_name ? `${prediction.race_name} — ${prediction.year} Round ${prediction.round}` : undefined}
      >
        <Button variant="outline" size="sm" onClick={() => setShowInfo(!showInfo)}>
          <Brain className="h-3.5 w-3.5 mr-1.5" />
          {showInfo ? 'Hide' : 'Show'} Model Info
        </Button>
      </PageHeader>

      {showInfo && modelInfo && (
        <Card className="animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-label-tertiary" />
              Model Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-label-tertiary text-xs">Algorithm</div>
                <div>{modelInfo.algorithm || 'Gradient Boosting'}</div>
              </div>
              <div>
                <div className="text-label-tertiary text-xs">Training Samples</div>
                <div>{modelInfo.training_samples?.toLocaleString() || '-'}</div>
              </div>
              <div>
                <div className="text-label-tertiary text-xs">Accuracy</div>
                <div>{modelInfo.accuracy ? `${(modelInfo.accuracy * 100).toFixed(1)}%` : '-'}</div>
              </div>
              <div>
                <div className="text-label-tertiary text-xs">Last Trained</div>
                <div>{modelInfo.last_trained ? new Date(modelInfo.last_trained).toLocaleDateString() : '-'}</div>
              </div>
            </div>
            {modelInfo.feature_importance && (
              <div className="mt-4">
                <div className="text-label-tertiary text-xs mb-2">Feature Importance</div>
                <div className="space-y-1">
                  {Object.entries(modelInfo.feature_importance)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([feat, imp]) => (
                      <div key={feat} className="flex items-center gap-2 text-xs">
                        <span className="w-40 text-label-tertiary">{feat.replace(/_/g, ' ')}</span>
                        <div className="flex-1 bg-glass-border rounded-full h-2">
                          <div className="bg-f1-red/80 h-2 rounded-full" style={{ width: `${imp * 100}%` }} />
                        </div>
                        <span className="w-12 text-right">{(imp * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Podium probability chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-label-tertiary" />
            Podium Probability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Plot
            data={[{
              type: 'bar',
              orientation: 'h',
              y: top10.map(d => d.driver_code || d.driver).reverse(),
              x: top10.map(d => (d.podium_probability || 0) * 100).reverse(),
              marker: { color: barColors },
              text: top10.map(d => `${((d.podium_probability || 0) * 100).toFixed(1)}%`).reverse(),
              textposition: 'outside',
              textfont: { color: '#1d1d1f', size: 11, family: 'Inter, system-ui, sans-serif' },
              hovertemplate: '%{y}: %{x:.1f}%<extra></extra>',
            }]}
            layout={getPlotlyGlassLayout({
              margin: { l: 60, r: 60, t: 10, b: 40 },
              xaxis: {
                title: { text: 'Probability (%)' },
                range: [0, 80],
              },
              height: 350,
            })}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%' }}
          />
        </CardContent>
      </Card>

      {/* Full predictions table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">All Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-glass-border text-label-tertiary text-[10px] tracking-wider uppercase">
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
                  const teamColor = d.team_color || getTeamColor(getTeamName(d))
                  const code = d.driver_code || d.driver || ''
                  const fullName = d.driver_name || ''

                  return (
                    <tr
                      key={i}
                      className="border-b border-glass-border/50 hover:bg-black/[0.04] transition-colors team-stripe"
                      style={{ '--stripe-color': teamColor }}
                    >
                      <td className="py-2 px-3">
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold font-mono"
                          style={posColor ? { color: posColor } : { color: rank <= 10 ? '#1A1A2E' : '#9CA3AF' }}
                        >
                          {rank}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs font-mono">{code}</span>
                          {fullName && (
                            <span className="text-label-tertiary text-xs hidden sm:inline">
                              {formatDriverName(code, fullName)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
                          <span className="text-xs text-label-tertiary">{getTeamName(d) || '-'}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {d.podium_probability ? `${(d.podium_probability * 100).toFixed(1)}%` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-xs text-label-tertiary">
                        {d.grid_position || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3 text-sm text-yellow-700">
            <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <strong>Disclaimer:</strong> Predictions are generated by a machine learning model trained on historical data.
              They are for entertainment purposes only and should not be used for betting or other financial decisions.
              Confidence is capped at 70%. Actual race outcomes depend on many unpredictable factors.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
