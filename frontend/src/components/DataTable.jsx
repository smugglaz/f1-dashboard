import { useState } from 'react'

export default function DataTable({ columns, data, onRowClick }) {
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sorted = [...(data || [])].sort((a, b) => {
    if (!sortCol) return 0
    const av = a[sortCol], bv = b[sortCol]
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-f1-border">
            {columns.map(col => (
              <th
                key={col.key}
                className="px-3 py-2 text-left text-f1-muted font-medium cursor-pointer hover:text-f1-text"
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                {sortCol === col.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              className="border-b border-f1-border/50 hover:bg-f1-border/20 transition-colors"
              onClick={() => onRowClick?.(row)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map(col => (
                <td key={col.key} className="px-3 py-2">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(!data || data.length === 0) && (
        <div className="text-center py-8 text-f1-muted">No data available</div>
      )}
    </div>
  )
}
