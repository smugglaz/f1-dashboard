/**
 * Unified chart theming for Plotly and Recharts.
 * Glass-palette colors matching macOS Tahoe Liquid Glass design.
 */

// Shared constants
const FONT_FAMILY = 'Inter, system-ui, sans-serif'
const LABEL_PRIMARY = '#1d1d1f'
const LABEL_SECONDARY = '#86868b'
const LABEL_TERTIARY = '#aeaeb2'
const GRID_COLOR = 'rgba(0,0,0,0.06)'
const GLASS_BG = 'rgba(255,255,255,0.92)'
const GLASS_BORDER = 'rgba(0,0,0,0.08)'

/**
 * Returns a Plotly layout object with glass-palette styling.
 * Merge with your specific layout overrides.
 */
export function getPlotlyGlassLayout(overrides = {}) {
  return {
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: LABEL_PRIMARY, family: FONT_FAMILY, size: 11 },
    xaxis: {
      gridcolor: GRID_COLOR,
      linecolor: GRID_COLOR,
      zerolinecolor: GRID_COLOR,
      tickfont: { color: LABEL_TERTIARY, size: 10 },
      title: { font: { size: 11, color: LABEL_SECONDARY } },
      ...overrides.xaxis,
    },
    yaxis: {
      gridcolor: GRID_COLOR,
      linecolor: GRID_COLOR,
      zerolinecolor: GRID_COLOR,
      tickfont: { color: LABEL_TERTIARY, size: 10 },
      title: { font: { size: 11, color: LABEL_SECONDARY } },
      ...overrides.yaxis,
    },
    hoverlabel: {
      bgcolor: GLASS_BG,
      bordercolor: GLASS_BORDER,
      font: { family: FONT_FAMILY, size: 11, color: LABEL_PRIMARY },
    },
    legend: {
      font: { size: 10, color: LABEL_SECONDARY },
      ...overrides.legend,
    },
    margin: { t: 10, r: 10, b: 50, l: 50, ...overrides.margin },
    ...overrides,
    // Re-apply nested objects that got overwritten
    ...(overrides.xaxis ? { xaxis: { ...getPlotlyGlassLayout().xaxis, ...overrides.xaxis } } : {}),
  }
}

/**
 * Recharts theme values for CartesianGrid, Tooltip, and axis props.
 */
export const rechartsGlassTheme = {
  grid: {
    strokeDasharray: '3 3',
    stroke: GRID_COLOR,
  },
  tooltip: {
    contentStyle: {
      background: GLASS_BG,
      border: `1px solid ${GLASS_BORDER}`,
      borderRadius: '12px',
      fontFamily: FONT_FAMILY,
      fontSize: '11px',
      color: LABEL_PRIMARY,
      backdropFilter: 'blur(20px)',
    },
    labelStyle: {
      color: LABEL_SECONDARY,
      fontWeight: 500,
    },
  },
  axis: {
    tick: { fill: LABEL_TERTIARY, fontSize: 10 },
    axisLine: { stroke: GRID_COLOR },
    tickLine: { stroke: GRID_COLOR },
  },
  label: {
    fill: LABEL_SECONDARY,
    fontSize: 11,
  },
}

/**
 * Color constants for chart components.
 */
export const chartColors = {
  primary: LABEL_PRIMARY,
  secondary: LABEL_SECONDARY,
  tertiary: LABEL_TERTIARY,
  grid: GRID_COLOR,
  glassBg: GLASS_BG,
  glassBorder: GLASS_BORDER,
}
