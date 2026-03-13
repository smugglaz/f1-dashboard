import { useState, useMemo } from 'react'
import { getPositionColor } from '../utils/colors'
import { getTeamColor } from '../utils/teams'
import { formatDriverName } from '../utils/format'
import { GapBar } from '@/components/ui/gap-bar'

function getVal(row, key) {
  return key.split('.').reduce((obj, k) => obj?.[k], row)
}

export default function StandingsTable({ data = [], type = 'driver' }) {
  const [sortCol, setSortCol] = useState('points')
  const [sortAsc, setSortAsc] = useState(false)

  const handleSort = (col) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
  }

  const sorted = [...data].sort((a, b) => {
    const va = getVal(a, sortCol), vb = getVal(b, sortCol)
    if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va
    return sortAsc ? String(va ?? '').localeCompare(String(vb ?? '')) : String(vb ?? '').localeCompare(String(va ?? ''))
  })

  const maxPoints = useMemo(() => {
    return Math.max(1, ...data.map(r => getVal(r, 'points') || 0))
  }, [data])

  const cols = type === 'driver'
    ? [
        { key: 'position', label: 'POS', align: 'left' },
        { key: 'driver.code', label: 'DRIVER', align: 'left' },
        { key: 'constructor', label: 'TEAM', align: 'left' },
        { key: 'points', label: 'PTS', align: 'right' },
        { key: 'gap', label: 'GAP', align: 'left' },
        { key: 'wins', label: 'WINS', align: 'right' },
      ]
    : [
        { key: 'position', label: 'POS', align: 'left' },
        { key: 'constructor.name', label: 'CONSTRUCTOR', align: 'left' },
        { key: 'points', label: 'PTS', align: 'right' },
        { key: 'gap', label: 'GAP', align: 'left' },
        { key: 'wins', label: 'WINS', align: 'right' },
      ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-glass-border text-label-tertiary">
            {cols.map(c => (
              <th
                key={c.key}
                onClick={() => handleSort(c.key)}
                className={`py-3 px-3 cursor-pointer hover:text-label-primary select-none text-caption-2 uppercase tracking-wider ${
                  c.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {c.label} {sortCol === c.key ? (sortAsc ? '▲' : '▼') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            const pos = getVal(row, 'position')
            const posColor = getPositionColor(pos)
            const teamName = type === 'driver' ? (row.constructor || '') : (getVal(row, 'constructor.name') || '')
            const teamColor = getTeamColor(teamName)

            return (
              <tr
                key={i}
                className="border-b border-glass-border/50 hover:bg-black/[0.03] transition-colors team-stripe"
                style={{ '--stripe-color': teamColor }}
              >
                {cols.map(c => {
                  const val = getVal(row, c.key)

                  if (c.key === 'position') {
                    return (
                      <td key={c.key} className="py-3 px-3">
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold font-mono"
                          style={posColor ? { backgroundColor: `${posColor}22`, color: posColor } : {}}
                        >
                          {val ?? '-'}
                        </span>
                      </td>
                    )
                  }

                  if (c.key === 'driver.code') {
                    const code = val || ''
                    const fullName = getVal(row, 'driver.name') || ''
                    return (
                      <td key={c.key} className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs font-mono w-8">{code}</span>
                          <span className="text-label-secondary text-xs">{formatDriverName(code, fullName)}</span>
                        </div>
                      </td>
                    )
                  }

                  if (c.key === 'constructor' || c.key === 'constructor.name') {
                    const name = type === 'driver' ? row.constructor : getVal(row, 'constructor.name')
                    return (
                      <td key={c.key} className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getTeamColor(name) }} />
                          <span className="text-xs">{name || '-'}</span>
                        </div>
                      </td>
                    )
                  }

                  if (c.key === 'points') {
                    return <td key={c.key} className="py-3 px-3 text-right font-mono font-bold text-label-primary">{val ?? '-'}</td>
                  }

                  if (c.key === 'gap') {
                    const pts = getVal(row, 'points') || 0
                    return (
                      <td key={c.key} className="py-3 px-3 w-28">
                        <GapBar value={pts} maxValue={maxPoints} color={teamColor} />
                      </td>
                    )
                  }

                  if (c.key === 'wins') {
                    return (
                      <td key={c.key} className="py-3 px-3 text-right">
                        {val > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-amber-500/15 text-amber-700 text-xs font-bold font-mono px-1.5">{val}</span>
                        ) : <span className="text-label-quaternary text-xs">-</span>}
                      </td>
                    )
                  }

                  return <td key={c.key} className={`py-3 px-3 ${c.align === 'right' ? 'text-right' : ''}`}>{val ?? '-'}</td>
                })}
              </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr><td colSpan={cols.length} className="py-8 text-center text-label-tertiary text-footnote">No standings data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
