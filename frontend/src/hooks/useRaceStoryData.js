import { useQueries } from '@tanstack/react-query'
import { fetchApi } from './useApi'
import { cacheConfig } from '@/lib/queryClient'

/**
 * Fires ~11 API calls in parallel via TanStack useQueries with caching.
 * Historical race data is cached indefinitely — revisits are instant.
 * Returns { data, loading, error } where data contains all sections.
 */
export function useRaceStoryData(year, round) {
  const enabled = !!(year && round)

  const endpointMap = {
    race: `/api/historical/races/${year}/${round}`,
    summary: `/api/historical/race-summary/${year}/${round}`,
    qualifying: `/api/historical/qualifying/${year}/${round}`,
    circuit: `/api/historical/circuit-info/${year}/${round}`,
    stints: `/api/historical/stints/${year}/${round}`,
    lapPositions: `/api/historical/lap-positions/${year}/${round}`,
    pitStops: `/api/historical/pitstops/${year}/${round}`,
    sectors: `/api/historical/sectors/${year}/${round}/Race`,
    tyrePerf: `/api/historical/tyre-performance/${year}/${round}`,
    weather: `/api/historical/weather/${year}/${round}/Race`,
    raceControl: `/api/historical/race-control/${year}/${round}/Race`,
  }

  const keys = Object.keys(endpointMap)

  const results = useQueries({
    queries: keys.map((key) => ({
      queryKey: ['historical', key, String(year), String(round)],
      queryFn: ({ signal }) => fetchApi(endpointMap[key], { signal }),
      enabled,
      ...cacheConfig.historical,
    })),
  })

  const loading = results.some((r) => r.isLoading)
  const error = results.find((r) => r.error)?.error?.message || null

  const data =
    loading
      ? null
      : Object.fromEntries(keys.map((key, i) => [key, results[i].data ?? null]))

  return { data, loading, error }
}
