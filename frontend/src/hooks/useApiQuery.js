import { useQuery } from '@tanstack/react-query'
import { getTierConfig, endpointToKey } from '@/lib/queryClient'

const BASE = ''

async function fetchEndpoint({ queryKey, signal, meta }) {
  const endpoint = meta?.endpoint
  if (!endpoint) throw new Error('No endpoint')
  const res = await fetch(`${BASE}${endpoint}`, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * Drop-in replacement for useApi with TanStack Query caching.
 * Same return shape: { data, loading, error, refetch }
 *
 * @param {string|null|undefined} endpoint - API endpoint URL
 * @param {object} [queryOptions] - TanStack Query options (refetchInterval, enabled, etc.)
 */
export function useApiQuery(endpoint, queryOptions = {}) {
  const tierConfig = getTierConfig(endpoint)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: endpointToKey(endpoint),
    queryFn: fetchEndpoint,
    enabled: !!endpoint,
    meta: { endpoint },
    ...tierConfig,
    ...queryOptions,
  })

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  }
}
