export default function LoadingSpinner({ compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-5 h-5 border-2 border-glass-border border-t-f1-red rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-10 h-10 border-4 border-glass-border border-t-f1-red rounded-full animate-spin" />
      <span className="text-label-tertiary text-xs animate-pulse">Loading data...</span>
    </div>
  )
}

/**
 * Skeleton rows for table loading states.
 * Usage: <SkeletonTable rows={5} cols={4} />
 */
export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-2 py-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 px-2">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="skeleton h-4 rounded"
              style={{ width: j === 0 ? '40px' : j === 1 ? '120px' : '80px', opacity: 1 - i * 0.1 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
