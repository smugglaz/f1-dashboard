/**
 * Parse raw lap time strings from APIs into clean "M:SS.mmm" format.
 * Handles: "0 days 00:01:32.123000", "0:01:32.123", timedelta objects, etc.
 */
export function parseLapTime(raw) {
  if (!raw) return null
  const s = String(raw)
  // Match HH:MM:SS.microseconds (from pandas Timedelta)
  const tdMatch = s.match(/(\d+):(\d{2}):(\d{2})\.(\d+)/)
  if (tdMatch) {
    const hours = parseInt(tdMatch[1])
    const mins = parseInt(tdMatch[2]) + hours * 60
    const secs = parseInt(tdMatch[3])
    const ms = tdMatch[4].substring(0, 3).padEnd(3, '0')
    return mins > 0 ? `${mins}:${String(secs).padStart(2, '0')}.${ms}` : `${secs}.${ms}`
  }
  // Match M:SS.mmm or SS.mmm
  const lapMatch = s.match(/^(\d+:)?\d{1,2}\.\d{3}$/)
  if (lapMatch) return s
  return s
}

export function formatLapTime(time) {
  if (!time) return '--:--.---'
  const parsed = parseLapTime(time)
  return parsed || String(time)
}

export function formatInterval(interval) {
  if (!interval && interval !== 0) return ''
  if (typeof interval === 'number') {
    return interval > 0 ? `+${interval.toFixed(3)}` : interval.toFixed(3)
  }
  return String(interval)
}

/**
 * Format driver display name: "VER M. Verstappen"
 * Falls back to code if no full name available.
 */
export function formatDriverName(code, fullName) {
  if (!fullName) return code || '???'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return `${code || ''} ${fullName}`.trim()
  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')
  return `${firstName.charAt(0)}. ${lastName}`
}

/**
 * Format position change from grid to finish.
 * Returns { text: '▲3', color: '#4ade80', delta: 3 } or similar.
 */
export function formatPositionChange(grid, finish) {
  if (!grid || !finish || grid === 0) return { text: '', color: '#8888AA', delta: 0 }
  const g = parseInt(grid)
  const f = parseInt(finish)
  if (isNaN(g) || isNaN(f)) return { text: '', color: '#8888AA', delta: 0 }
  const delta = g - f // positive = gained positions
  if (delta > 0) return { text: `▲${delta}`, color: '#4ade80', delta }
  if (delta < 0) return { text: `▼${Math.abs(delta)}`, color: '#ef4444', delta }
  return { text: '—', color: '#8888AA', delta: 0 }
}

/**
 * Format race result status with semantic color.
 */
export function formatStatus(status, position) {
  if (!status) return { label: '-', color: '#8888AA' }
  const s = String(status)
  if (s === 'Finished' || s.startsWith('+')) {
    if (position === 1) return { label: 'P1', color: '#FFD700' }
    if (position === 2) return { label: 'P2', color: '#C0C0C0' }
    if (position === 3) return { label: 'P3', color: '#CD7F32' }
    return { label: s === 'Finished' ? `P${position || ''}` : s, color: '#4ade80' }
  }
  if (s === 'Disqualified') return { label: 'DSQ', color: '#a855f7' }
  if (s === 'Did not start' || s === 'DNS') return { label: 'DNS', color: '#6b7280' }
  // Everything else is a DNF reason
  return { label: `DNF`, color: '#ef4444', reason: s }
}

/**
 * Format pit stop duration with performance color.
 * Green: <25s, Yellow: 25-30s, Red: >30s
 */
export function formatPitDuration(seconds) {
  if (!seconds && seconds !== 0) return { text: '-', color: '#8888AA' }
  const s = parseFloat(seconds)
  if (isNaN(s)) return { text: String(seconds), color: '#8888AA' }
  const color = s < 25 ? '#4ade80' : s < 30 ? '#eab308' : '#ef4444'
  return { text: `${s.toFixed(1)}s`, color }
}

/**
 * Estimate reading time for an article summary.
 */
export function estimateReadingTime(text) {
  if (!text) return '1 min'
  const words = text.split(/\s+/).length
  const mins = Math.max(1, Math.ceil(words / 200))
  return `${mins} min read`
}

export function timeAgo(date) {
  if (!date) return ''
  const now = new Date()
  const then = new Date(date)
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function formatCountdown(targetDate) {
  const now = new Date()
  const target = new Date(targetDate)
  const diff = target - now
  if (diff <= 0) return 'NOW'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

/**
 * Parse a qualifying time string ("1:23.456") into milliseconds.
 * Handles "M:SS.mmm", "SS.mmm", and pandas Timedelta formats.
 * Returns null if unparseable or empty.
 */
export function qualTimeToMs(timeStr) {
  if (!timeStr) return null
  const s = String(timeStr).trim()
  if (!s) return null
  // Match M:SS.mmm
  const mssMatch = s.match(/^(\d+):(\d{1,2})\.(\d{1,3})$/)
  if (mssMatch) {
    const mins = parseInt(mssMatch[1])
    const secs = parseInt(mssMatch[2])
    const ms = mssMatch[3].padEnd(3, '0')
    return mins * 60000 + secs * 1000 + parseInt(ms)
  }
  // Match SS.mmm (no minutes)
  const ssMatch = s.match(/^(\d{1,2})\.(\d{1,3})$/)
  if (ssMatch) {
    const secs = parseInt(ssMatch[1])
    const ms = ssMatch[2].padEnd(3, '0')
    return secs * 1000 + parseInt(ms)
  }
  // Match HH:MM:SS.microseconds (pandas Timedelta)
  const tdMatch = s.match(/(\d+):(\d{2}):(\d{2})\.(\d+)/)
  if (tdMatch) {
    const hours = parseInt(tdMatch[1])
    const mins = parseInt(tdMatch[2])
    const secs = parseInt(tdMatch[3])
    const ms = tdMatch[4].substring(0, 3).padEnd(3, '0')
    return (hours * 3600 + mins * 60 + secs) * 1000 + parseInt(ms)
  }
  return null
}

/**
 * Format a percentage delta with sign and semantic color.
 * Returns { text: '+0.35%', color: '#4ade80' }
 * Green: <0.3%, Yellow: 0.3-1.0%, Red: >1.0%
 */
export function formatPercentDelta(pct) {
  if (pct === null || pct === undefined || isNaN(pct)) return { text: '-', color: '#8888AA' }
  const abs = Math.abs(pct)
  const color = abs < 0.3 ? '#4ade80' : abs < 1.0 ? '#eab308' : '#ef4444'
  const sign = pct > 0 ? '+' : ''
  return { text: `${sign}${pct.toFixed(3)}%`, color }
}
