import { useMemo } from 'react'

function Sparkline({ data = [], width = 80, height = 24, color = '#00D2BE', strokeWidth = 1.5, className }) {
  const path = useMemo(() => {
    if (!data.length) return ''
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const padding = 2

    const points = data.map((val, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2)
      const y = height - padding - ((val - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })

    return `M${points.join('L')}`
  }, [data, width, height])

  if (!data.length) return null

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export { Sparkline }
