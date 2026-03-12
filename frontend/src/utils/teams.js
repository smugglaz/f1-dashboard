/**
 * F1 Team Identity System — Single source of truth for team colors, names, and driver mappings.
 * Updated for 2024-2025 seasons. Historical aliases included for Jolpica/Ergast data.
 */

export const TEAMS = {
  'Red Bull Racing': { color: '#3671C6', accent: '#FFD700', short: 'RBR' },
  'Red Bull': { color: '#3671C6', accent: '#FFD700', short: 'RBR' },
  'Mercedes': { color: '#27F4D2', accent: '#000000', short: 'MER' },
  'Ferrari': { color: '#E8002D', accent: '#FFF200', short: 'FER' },
  'McLaren': { color: '#FF8000', accent: '#000000', short: 'MCL' },
  'Aston Martin': { color: '#229971', accent: '#CEDC00', short: 'AMR' },
  'Alpine F1 Team': { color: '#FF87BC', accent: '#0093CC', short: 'ALP' },
  'Alpine': { color: '#FF87BC', accent: '#0093CC', short: 'ALP' },
  'RB F1 Team': { color: '#6692FF', accent: '#FFFFFF', short: 'RB' },
  'AlphaTauri': { color: '#6692FF', accent: '#FFFFFF', short: 'RB' },
  'Haas F1 Team': { color: '#B6BABD', accent: '#E10600', short: 'HAA' },
  'Haas': { color: '#B6BABD', accent: '#E10600', short: 'HAA' },
  'Williams': { color: '#64C4FF', accent: '#005AFF', short: 'WIL' },
  'Sauber': { color: '#52E252', accent: '#000000', short: 'SAU' },
  'Kick Sauber': { color: '#52E252', accent: '#000000', short: 'SAU' },
  'Alfa Romeo': { color: '#C92D4B', accent: '#000000', short: 'ALF' },
  'Racing Point': { color: '#F596C8', accent: '#FFFFFF', short: 'RP' },
  'Renault': { color: '#FFF500', accent: '#000000', short: 'REN' },
  'Toro Rosso': { color: '#469BFF', accent: '#FFFFFF', short: 'TR' },
  'Force India': { color: '#F596C8', accent: '#FF8C00', short: 'FI' },
}

// Driver code → team name mapping (2024-2025)
const DRIVER_TEAM_MAP = {
  'VER': 'Red Bull Racing', 'PER': 'Red Bull Racing',
  'HAM': 'Ferrari', 'LEC': 'Ferrari',
  'NOR': 'McLaren', 'PIA': 'McLaren',
  'RUS': 'Mercedes', 'ANT': 'Mercedes',
  'ALO': 'Aston Martin', 'STR': 'Aston Martin',
  'GAS': 'Alpine F1 Team', 'DOO': 'Alpine F1 Team',
  'TSU': 'RB F1 Team', 'LAW': 'RB F1 Team', 'HAD': 'RB F1 Team',
  'HUL': 'Sauber', 'BOR': 'Sauber',
  'MAG': 'Haas F1 Team', 'OCO': 'Haas F1 Team', 'BEA': 'Haas F1 Team',
  'ALB': 'Williams', 'SAI': 'Williams', 'COL': 'Williams',
  // 2024 extras
  'SAR': 'Williams', 'RIC': 'RB F1 Team', 'BOT': 'Sauber', 'ZHO': 'Sauber',
}

/**
 * Get team color for a team name (fuzzy matched).
 * Returns the hex color or a neutral gray fallback.
 */
export function getTeamColor(teamName) {
  if (!teamName) return '#555555'
  // Direct match
  if (TEAMS[teamName]) return TEAMS[teamName].color
  // Case-insensitive partial match
  const lower = teamName.toLowerCase()
  for (const [name, info] of Object.entries(TEAMS)) {
    if (name.toLowerCase().includes(lower) || lower.includes(name.toLowerCase())) {
      return info.color
    }
  }
  return '#555555'
}

/**
 * Get team info for a driver abbreviation.
 * Returns { color, accent, short, teamName } or defaults.
 */
export function getTeamByDriver(driverCode) {
  if (!driverCode) return { color: '#555555', accent: '#ffffff', short: '???', teamName: '' }
  const teamName = DRIVER_TEAM_MAP[driverCode.toUpperCase()]
  if (!teamName || !TEAMS[teamName]) {
    return { color: '#555555', accent: '#ffffff', short: '???', teamName: '' }
  }
  return { ...TEAMS[teamName], teamName }
}

/**
 * Get team color directly from a driver code.
 */
export function getDriverColor(driverCode) {
  return getTeamByDriver(driverCode).color
}

/**
 * Get all driver codes for a given team name.
 */
export function getDriversForTeam(teamName) {
  return Object.entries(DRIVER_TEAM_MAP)
    .filter(([, team]) => team === teamName)
    .map(([code]) => code)
}
