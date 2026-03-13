export const SECTOR_COLORS = {
  2048: '#FDD835', // Yellow — slower than personal best
  2049: '#4CAF50', // Green — personal best
  2051: '#AB47BC', // Purple — session best
  2064: '#78909C', // Gray — no data / pitlane
}

export const SECTOR_LABELS = {
  2048: 'Slower',
  2049: 'Personal Best',
  2051: 'Session Best',
  2064: 'No Data',
}

export function getSectorColor(code) {
  return SECTOR_COLORS[code] || '#555555'
}

export function getSectorLabel(code) {
  return SECTOR_LABELS[code] || 'Unknown'
}

// Position podium hierarchy — universally understood
export const POSITION_COLORS = {
  1: '#FFD700', // Gold
  2: '#C0C0C0', // Silver
  3: '#CD7F32', // Bronze
}

export function getPositionColor(pos) {
  return POSITION_COLORS[pos] || null
}

// Race result status colors
export const STATUS_COLORS = {
  Finished: '#4ade80',
  '+1 Lap': '#a3e635',
  '+2 Laps': '#a3e635',
  DNF: '#ef4444',
  DSQ: '#a855f7',
  DNS: '#6b7280',
  Retired: '#ef4444',
  Disqualified: '#a855f7',
}

export function getStatusColor(status) {
  if (!status) return '#6B7280'
  // Direct match
  if (STATUS_COLORS[status]) return STATUS_COLORS[status]
  // Partial match for statuses like "Engine", "Collision", "Gearbox"
  const s = status.toLowerCase()
  if (s.includes('lap')) return '#a3e635'
  if (s === 'finished' || s === '+1 lap' || s === '+2 laps') return '#4ade80'
  // Anything else that's not "Finished" is likely a DNF reason
  return '#ef4444'
}

// Tire compound colors — match F1 TV broadcast standard
export const TIRE_COLORS = {
  SOFT: '#ef4444',
  MEDIUM: '#eab308',
  HARD: '#9CA3AF',
  INTERMEDIATE: '#22c55e',
  WET: '#3b82f6',
}

export function getTireColor(compound) {
  if (!compound) return '#78909C'
  return TIRE_COLORS[compound.toUpperCase()] || '#78909C'
}

export const F1_COLORS = {
  red: '#E10600',
  dark: '#faf9f6',
  card: 'rgba(255, 255, 255, 0.72)',
  border: 'rgba(0, 0, 0, 0.06)',
  text: '#1d1d1f',
  muted: '#86868b',
  green: '#059669',
  yellow: '#D97706',
  purple: '#7C3AED',
}

// Liquid Glass palette for Plotly/Recharts (they need JS values, not CSS vars)
export const GLASS_COLORS = {
  // Canvas
  canvasStart: '#faf9f6',
  canvasEnd: '#ecedf0',
  // Glass surfaces
  glassBg: 'rgba(255, 255, 255, 0.72)',
  glassBgHeavy: 'rgba(255, 255, 255, 0.88)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',
  glassHighlight: 'rgba(255, 255, 255, 0.5)',
  // Apple label hierarchy
  labelPrimary: '#1d1d1f',
  labelSecondary: '#86868b',
  labelTertiary: '#aeaeb2',
  labelQuaternary: '#c7c7cc',
  // Chart grid & axes
  gridLine: 'rgba(0, 0, 0, 0.06)',
  axisLine: '#aeaeb2',
  axisText: '#86868b',
  // Chart-friendly accent series
  series: [
    '#E10600', // F1 red
    '#007AFF', // Apple blue
    '#34C759', // Apple green
    '#FF9500', // Apple orange
    '#AF52DE', // Apple purple
    '#FF2D55', // Apple pink
    '#5AC8FA', // Apple cyan
    '#FFCC00', // Apple yellow
  ],
  // Transparent bg for chart containers
  transparent: 'rgba(0,0,0,0)',
  paperBg: 'rgba(0,0,0,0)',
  plotBg: 'rgba(0,0,0,0)',
}
