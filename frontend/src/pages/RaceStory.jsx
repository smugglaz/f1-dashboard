import { useParams } from 'react-router-dom'
import { useRaceStoryData } from '@/hooks/useRaceStoryData'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { Skeleton } from '@/components/ui/skeleton'

import RaceBreadcrumb from '@/components/race-story/RaceBreadcrumb'
import StoryNav from '@/components/race-story/StoryNav'
import StageSection from '@/components/race-story/StageSection'
import StrategySection from '@/components/race-story/StrategySection'
import UnfoldsSection from '@/components/race-story/UnfoldsSection'
import WinningPackageSection from '@/components/race-story/WinningPackageSection'
import NumbersSection from '@/components/race-story/NumbersSection'

function RevealSection({ children, delay = 0 }) {
  const { ref, visible } = useScrollReveal()
  return (
    <div
      ref={ref}
      className={`scroll-reveal ${visible ? 'visible' : ''}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  )
}

export default function RaceStory() {
  const { year, round } = useParams()
  const { data, loading, error } = useRaceStoryData(year, round)

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <RaceBreadcrumb year={year} round={Number(round)} raceName="" totalRounds={24} />
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-label-secondary">
            {error ? `Failed to load race data: ${error}` : 'No data available for this race.'}
          </p>
        </div>
      </div>
    )
  }

  const raceName = data.summary?.race?.name || data.race?.race?.name || data.circuit?.race?.name || ''
  const raceInfo = data.summary?.race || data.race?.race || data.circuit?.race || {}
  const totalRounds = 24 // reasonable default

  return (
    <div className="space-y-12 relative">
      {/* Floating scroll nav (desktop only) */}
      <StoryNav />

      {/* Breadcrumb */}
      <RaceBreadcrumb
        year={year}
        round={Number(round)}
        raceName={raceName}
        totalRounds={totalRounds}
      />

      {/* Race title */}
      <div>
        <h1 className="text-large-title font-bold">{raceName || `Round ${round}`}</h1>
        <p className="text-footnote text-label-secondary mt-1">
          {year} FIA Formula One World Championship — Round {round}
        </p>
      </div>

      {/* Section 1: The Stage */}
      <RevealSection>
        <StageSection
          circuit={data.circuit}
          qualifying={data.qualifying}
          weather={data.weather}
          race={raceInfo}
        />
      </RevealSection>

      {/* Section 2: The Strategy */}
      <RevealSection>
        <StrategySection stints={data.stints} />
      </RevealSection>

      {/* Section 3: The Race Unfolds */}
      <RevealSection>
        <UnfoldsSection
          lapPositions={data.lapPositions}
          raceControl={data.raceControl}
          weather={data.weather}
          raceResults={data.race}
        />
      </RevealSection>

      {/* Section 4: The Winning Package */}
      <RevealSection>
        <WinningPackageSection
          summary={data.summary}
          sectors={data.sectors}
          tyrePerf={data.tyrePerf}
          pitStops={data.pitStops}
          stints={data.stints}
        />
      </RevealSection>

      {/* Section 5: The Numbers (collapsed by default) */}
      <RevealSection>
        <NumbersSection
          race={data.race}
          qualifying={data.qualifying}
          pitStops={data.pitStops}
        />
      </RevealSection>
    </div>
  )
}
