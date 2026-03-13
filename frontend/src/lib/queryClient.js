import { QueryClient } from '@tanstack/react-query'

// Cache tier configurations
export const cacheConfig = {
  historical: {
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000, // 30 min
  },
  semiStable: {
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000, // 10 min
  },
  live: {
    staleTime: 0,
    gcTime: 60 * 1000, // 1 min
  },
  news: {
    staleTime: 60 * 1000, // 60s
    gcTime: 5 * 60 * 1000, // 5 min
  },
}

// Auto-detect cache tier from URL prefix (most specific first)
export function getTierConfig(endpoint) {
  if (!endpoint) return {}
  if (endpoint.startsWith('/api/historical/circuit/')) return cacheConfig.semiStable
  if (endpoint.startsWith('/api/historical/')) return cacheConfig.historical
  if (endpoint.startsWith('/api/live/')) return cacheConfig.live
  if (endpoint.startsWith('/api/news')) return cacheConfig.news
  if (endpoint.startsWith('/api/predictions/')) return cacheConfig.semiStable
  return {}
}

// Derive query key from endpoint URL
export function endpointToKey(endpoint) {
  if (!endpoint) return ['__disabled__']
  // Strip /api/ prefix and split into segments
  // e.g. /api/historical/races/2026 → ['historical', 'races', '2026']
  return endpoint.replace(/^\/api\//, '').split('/').filter(Boolean)
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min default
      gcTime: 10 * 60 * 1000, // 10 min default
      retry: false, // match existing useApi behavior
      refetchOnWindowFocus: false,
    },
  },
})
