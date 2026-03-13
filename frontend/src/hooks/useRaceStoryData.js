import { useState, useEffect, useRef } from 'react'
import { fetchApi } from './useApi'

/**
 * Fires ~11 API calls in parallel to gather all data for a race story.
 * Returns { data, loading, error } where data contains all sections.
 */
export function useRaceStoryData(year, round) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const abortRef = useRef(null)

  useEffect(() => {
    if (!year || !round) {
      setState({ data: null, loading: false, error: null })
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState(s => ({ ...s, loading: true, error: null }))

    const endpoints = {
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

    const fetches = Object.entries(endpoints).map(async ([key, url]) => {
      try {
        const json = await fetchApi(url)
        return [key, json]
      } catch {
        return [key, null]
      }
    })

    Promise.all(fetches).then(results => {
      if (controller.signal.aborted) return
      const data = Object.fromEntries(results)
      setState({ data, loading: false, error: null })
    }).catch(err => {
      if (controller.signal.aborted) return
      setState({ data: null, loading: false, error: err.message })
    })

    return () => controller.abort()
  }, [year, round])

  return state
}
