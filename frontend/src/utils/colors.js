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
  dark: '#F4F5F7',
  card: '#FFFFFF',
  border: '#E2E5EA',
  text: '#1A1A2E',
  muted: '#6B7280',
  green: '#059669',
  yellow: '#D97706',
  purple: '#7C3AED',
}
