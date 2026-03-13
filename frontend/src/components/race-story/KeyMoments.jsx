import { AlertTriangle, ShieldAlert, CloudRain, Flag as FlagIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const FLAG_CONFIG = {
  RED: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-500/10', label: 'Red Flag' },
  YELLOW: { icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'Yellow' },
  DOUBLE_YELLOW: { icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'Double Yellow' },
  GREEN: { icon: FlagIcon, color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'Green' },
  SC: { icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'Safety Car' },
  VSC: { icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-500/10', label: 'VSC' },
}

export default function KeyMoments({ raceControl, weather }) {
  if (!raceControl?.messages?.length) return null

  // Filter to race-defining moments only: SC, VSC, red flags, rain
  const significant = raceControl.messages.filter(m => {
    const flag = m.flag?.toUpperCase() || ''
    const cat = m.category?.toUpperCase() || ''
    const msg = m.message?.toUpperCase() || ''
    // Safety Car deployments
    if (cat === 'SAFETYCAR' || flag === 'SC') return true
    // Virtual Safety Car
    if (cat === 'VSC' || flag === 'VSC') return true
    // Red flags
    if (flag === 'RED') return true
    // Race start only (not pit exit open)
    if ((msg.includes('GREEN LIGHT') || msg.includes('RACE START')) && !msg.includes('PIT EXIT')) return true
    // Rain onset (exclude 0% risk)
    if ((msg.includes('RAIN') || msg.includes('WET')) && !msg.includes('0%')) return true
    // DRS enabled/disabled (strategy impact)
    if (msg.includes('DRS ENABLED') || msg.includes('DRS DISABLED')) return true
    // Ignore everything else (sector yellows, green flags, double yellows, clears)
    return false
  })

  if (!significant.length) {
    return (
      <p className="text-footnote text-label-tertiary text-center py-4">
        Clean race — no major incidents
      </p>
    )
  }

  // Dedupe nearby events (within 2 laps)
  const events = []
  for (const msg of significant) {
    const last = events[events.length - 1]
    if (last && Math.abs((msg.lap || 0) - (last.lap || 0)) < 2 &&
        msg.flag === last.flag && msg.category === last.category) continue
    events.push(msg)
  }

  return (
    <div className="relative pl-6">
      {/* Vertical timeline line */}
      <div className="absolute left-2 top-0 bottom-0 w-px bg-glass-border" />

      <div className="space-y-4">
        {events.slice(0, 12).map((evt, i) => {
          const flagKey = evt.flag?.toUpperCase() || evt.category?.toUpperCase() || ''
          const config = FLAG_CONFIG[flagKey] || FLAG_CONFIG[evt.category?.toUpperCase()] || {
            icon: FlagIcon, color: 'text-label-secondary', bg: 'bg-black/[0.04]', label: flagKey
          }
          const Icon = config.icon

          return (
            <div key={i} className="relative flex items-start gap-3">
              {/* Dot on timeline */}
              <div className={`absolute -left-4 top-1 w-2.5 h-2.5 rounded-full ${config.bg} ring-2 ring-white`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {evt.lap && (
                    <span className="text-caption-2 font-mono text-label-tertiary">Lap {evt.lap}</span>
                  )}
                  <Badge variant="outline" className="text-[9px] gap-1">
                    <Icon className={`h-2.5 w-2.5 ${config.color}`} />
                    {config.label}
                  </Badge>
                </div>
                {evt.message && (
                  <p className="text-caption-1 text-label-secondary mt-0.5 truncate">{evt.message}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
