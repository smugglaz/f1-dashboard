import { Link } from 'react-router-dom'
import { ChevronRight, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'

export default function RaceBreadcrumb({ year, round, raceName, totalRounds }) {
  const prevRound = round > 1 ? round - 1 : null
  const nextRound = round < totalRounds ? round + 1 : null

  return (
    <div className="flex items-center justify-between">
      <nav className="flex items-center gap-1.5 text-footnote">
        <Link to="/" className="text-label-tertiary hover:text-label-primary transition-colors">
          {year}
        </Link>
        <ChevronRight className="h-3 w-3 text-label-quaternary" />
        <span className="text-label-tertiary">Round {round}</span>
        <ChevronRight className="h-3 w-3 text-label-quaternary" />
        <span className="text-label-primary font-medium">
          {raceName?.replace(' Grand Prix', ' GP') || `Round ${round}`}
        </span>
      </nav>

      <div className="flex items-center gap-1">
        {prevRound ? (
          <Link
            to={`/race-story/${year}/${prevRound}`}
            className="p-1.5 rounded-lg hover:bg-black/[0.04] transition-colors text-label-tertiary hover:text-label-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <div className="p-1.5 text-label-quaternary"><ChevronLeft className="h-4 w-4" /></div>
        )}
        {nextRound ? (
          <Link
            to={`/race-story/${year}/${nextRound}`}
            className="p-1.5 rounded-lg hover:bg-black/[0.04] transition-colors text-label-tertiary hover:text-label-primary"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        ) : (
          <div className="p-1.5 text-label-quaternary"><ChevronRightIcon className="h-4 w-4" /></div>
        )}
      </div>
    </div>
  )
}
