# TanStack Query Cache Layer — Design Spec

**Date**: 2026-03-14
**Status**: Draft
**Scope**: Full frontend caching layer for F1 Dashboard

---

## Problem

The F1 Dashboard has zero caching at any layer. Every page navigation re-fetches all data from the backend, even for historical race data that will never change. The Race Story page fires 11 parallel API calls on every visit. Navigating between pages causes full re-fetches of shared data (e.g., `/api/historical/races/2026` is called by Dashboard, History, and RaceMap independently).

**Measured latency**: 11 Race Story endpoints take ~170ms total (parallel). Not slow, but unnecessary for immutable data — and the loading flash between mount and data arrival is visible.

## Solution

Install `@tanstack/react-query@^5.62.0` (React 19 compatible). Create a `useApiQuery()` hook as a drop-in replacement for the existing `useApi()` hook. Replace all 32 `useApi()` call sites across 16 files and rewrite the custom `useRaceStoryData` hook. Historical data cached indefinitely in memory; live data uses smart TTLs.

## Architecture

### QueryClient Configuration

```
frontend/src/main.jsx
  └─ <QueryClientProvider client={queryClient}>
       └─ <App />
```

QueryClient defaults:
- `staleTime`: 5 minutes (overridden per-query)
- `gcTime`: 10 minutes (how long unused cache lives in memory)
- `retry`: false (match existing useApi behavior — no retries)
- `refetchOnWindowFocus`: false (don't refetch when user alt-tabs back)

### Cache Tiers

| Tier | staleTime | gcTime | Endpoints |
|------|-----------|--------|-----------|
| **historical** | Infinity | 30 min | `/api/historical/*` (except `/api/historical/circuit/*`) |
| **semi-stable** | 5 min | 10 min | `/api/predictions/*`, `/api/historical/circuit/*` |
| **live** | 0 | 1 min | `/api/live/*` |
| **news** | 60s | 5 min | `/api/news*` |

**Tier auto-detection in `useApiQuery`**: Match URL prefixes in order from most specific to least specific:
1. `/api/historical/circuit/` → semi-stable
2. `/api/historical/` → historical
3. `/api/live/` → live
4. `/api/news` → news
5. `/api/predictions/` → semi-stable
6. Anything else → defaults (5 min staleTime)

### New Files

#### `frontend/src/lib/queryClient.js`

Creates and exports the QueryClient singleton with defaults above. Single source of truth for cache configuration.

Exports:
- `queryClient` — the QueryClient instance
- `queryKeys` — structured key factory for consistent cache keys
- `cacheConfig` — tier configs (historical, semiStable, live, news)

#### `frontend/src/hooks/useApiQuery.js`

Drop-in replacement for `useApi`. Same return shape: `{ data, loading, error, refetch }`.

**Full signature**:
```js
useApiQuery(endpoint, queryOptions?)
```

- `endpoint` — URL string (same as useApi), or `null`/`undefined`/`''` to disable
- `queryOptions` — optional object forwarded to TanStack `useQuery()`. Supports all TanStack options including `refetchInterval`, `enabled`, `select`, etc. These merge with (and override) the auto-detected tier config.

```js
// Current usage:
const { data, loading, error } = useApi('/api/historical/races/2026')

// New usage (identical API):
const { data, loading, error } = useApiQuery('/api/historical/races/2026')

// With options (e.g., polling):
const { data, loading, error } = useApiQuery('/api/news?page=1', { refetchInterval: 60_000 })
```

Implementation:
- Auto-detects cache tier from URL prefix (see ordered matching rules above)
- Uses `useQuery()` internally with appropriate staleTime/gcTime from tier
- Maps TanStack return: `isLoading` → `loading`, `data` → `data`, `error` → `error`
- `enabled: !!endpoint` — falsy endpoint disables the query
- `queryKey`: derived from endpoint URL, split into path segments (e.g., `/api/historical/races/2026` → `['historical', 'races', '2026']`)

#### `frontend/src/hooks/useRaceStoryData.js` (rewrite)

Replace the manual `Promise.all` with TanStack's `useQueries()`.

**v5 syntax** (useQueries takes an object with `queries` array):
```js
import { useQueries } from '@tanstack/react-query'
import { fetchApi } from './useApi'
import { cacheConfig } from '@/lib/queryClient'

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
    queries: keys.map(key => ({
      queryKey: ['historical', key, year, round],
      queryFn: ({ signal }) => fetchApi(endpointMap[key], { signal }),
      enabled,
      ...cacheConfig.historical,
    })),
  })

  const loading = results.some(r => r.isLoading)
  const error = results.find(r => r.error)?.error?.message || null

  const data = loading ? null : Object.fromEntries(
    keys.map((key, i) => [key, results[i].data ?? null])
  )

  return { data, loading, error }
}
```

Key details:
- **Cancellation**: TanStack passes `signal` (AbortSignal) to `queryFn` automatically. We forward it to `fetchApi`. This replaces the manual `AbortController` in the current implementation.
- **Return shape**: Unchanged — `{ data: { race, summary, qualifying, ... }, loading, error }`
- **Cache keys**: `['historical', <section>, year, round]` — each of the 11 queries cached independently
- **Session-specific endpoints** (sectors, weather, raceControl): Include `'Race'` session implicitly via the section key name. If other sessions are needed later, extend the key.

### Query Key Structure

```js
queryKeys = {
  historical: {
    all: (year) => ['historical', { year }],
    races: (year) => ['historical', 'races', year],
    race: (year, round) => ['historical', 'race', year, round],
    summary: (year, round) => ['historical', 'summary', year, round],
    qualifying: (year, round) => ['historical', 'qualifying', year, round],
    pitstops: (year, round) => ['historical', 'pitstops', year, round],
    stints: (year, round) => ['historical', 'stints', year, round],
    lapPositions: (year, round) => ['historical', 'lapPositions', year, round],
    sectors: (year, round) => ['historical', 'sectors', year, round],
    tyrePerf: (year, round) => ['historical', 'tyrePerf', year, round],
    weather: (year, round) => ['historical', 'weather', year, round],
    raceControl: (year, round) => ['historical', 'raceControl', year, round],
    circuitInfo: (year, round) => ['historical', 'circuitInfo', year, round],
    standings: {
      drivers: (year) => ['historical', 'standings', 'drivers', year],
      constructors: (year) => ['historical', 'standings', 'constructors', year],
      progression: (year) => ['historical', 'standings', 'progression', year],
    },
    teammates: (year) => ['historical', 'teammates', year],
    driverStats: (year, driverId) => ['historical', 'driverStats', year, driverId],
    seasons: () => ['historical', 'seasons'],
  },
  live: {
    session: () => ['live', 'session'],
    timing: () => ['live', 'timing'],
    weather: () => ['live', 'weather'],
    raceControl: () => ['live', 'raceControl'],
  },
  news: (page, source) => ['news', page, source],
  predictions: {
    nextRace: () => ['predictions', 'next-race'],
    modelInfo: () => ['predictions', 'model-info'],
  },
}
```

### Migration Strategy

**Mechanical replacement** — the `useApiQuery` hook has the identical API as `useApi`:

1. Search-and-replace `import { useApi }` → `import { useApiQuery }` (or `import { useApi, fetchApi }` → `import { useApiQuery } from ...; import { fetchApi } from ...`)
2. Search-and-replace `useApi(` → `useApiQuery(`
3. **Keep `fetchApi` unchanged** — it is used imperatively (not as a hook) in:
   - `History.jsx` — POST sync call (line ~81) and loop fetch for race summaries (line ~116)
   - `RaceMap.jsx` — driver-colors fetch (line ~34) and lap-comparison fetch (line ~43)
   - `useRaceStoryData.js` — used inside `queryFn` for TanStack
   These remain as direct `fetchApi` imports from `useApi.js`.
4. Rewrite `useRaceStoryData.js` to use `useQueries()` (see implementation above)
5. Deprecate the `useApi` hook export (keep `fetchApi` export permanently)

### Files Modified

| File | Change |
|------|--------|
| `frontend/package.json` | Add `@tanstack/react-query@^5.62.0`, `@tanstack/react-query-devtools@^5.62.0` |
| `frontend/src/main.jsx` | Wrap App in `<QueryClientProvider>`, add DevTools |
| `frontend/src/lib/queryClient.js` | **NEW** — QueryClient, keys, tier configs |
| `frontend/src/hooks/useApiQuery.js` | **NEW** — drop-in replacement hook |
| `frontend/src/hooks/useRaceStoryData.js` | Rewrite with `useQueries()` |
| `frontend/src/hooks/useApi.js` | Keep `fetchApi` export, deprecate `useApi` export |
| `frontend/src/pages/Dashboard.jsx` | `useApi` → `useApiQuery` (4 calls) |
| `frontend/src/pages/History.jsx` | `useApi` → `useApiQuery` (7 calls), keep `fetchApi` import, add `useQueryClient()` for sync invalidation |
| `frontend/src/pages/RaceMap.jsx` | `useApi` → `useApiQuery` (2 calls), keep `fetchApi` import (2 imperative usages) |
| `frontend/src/pages/Predictions.jsx` | `useApi` → `useApiQuery` (2 calls) |
| `frontend/src/pages/News.jsx` | `useApi` → `useApiQuery` (1 call) with `{ refetchInterval: 60_000 }`, **delete** the `useEffect` block containing `setInterval(refetch, 60000)` entirely |
| `frontend/src/pages/LiveTiming.jsx` | `useApi` → `useApiQuery` (4 calls) |
| `frontend/src/components/DriverStatsCard.jsx` | `useApi` → `useApiQuery` (1 call) |
| `frontend/src/components/PointsProgression.jsx` | `useApi` → `useApiQuery` (1 call) |
| `frontend/src/components/TeammateComparison.jsx` | `useApi` → `useApiQuery` (1 call) |
| `frontend/src/components/dashboard/RecentRaceSummary.jsx` | `useApi` → `useApiQuery` (1 call) |
| `frontend/src/components/dashboard/UpcomingRace.jsx` | `useApi` → `useApiQuery` (1 call) |
| `frontend/src/components/race/RaceConditions.jsx` | `useApi` → `useApiQuery` (2 calls) |
| `frontend/src/components/race/RaceSummaryCard.jsx` | `useApi` → `useApiQuery` (2 calls) |
| `frontend/src/components/race/SectorAnalysis.jsx` | `useApi` → `useApiQuery` (1 call) |
| `frontend/src/components/race/TyreDegradation.jsx` | `useApi` → `useApiQuery` (1 call) |
| `frontend/src/components/race/StrategyTimeline.jsx` | `useApi` → `useApiQuery` (1 call) |

**Total**: 2 new files, 1 rewrite, 20 mechanical replacements (32 call sites across 16 consumer files).

### Special Cases

#### History.jsx Sync Operation
After `POST /api/historical/sync/{year}`, invalidate historical queries using a predicate to target the specific year:
```js
import { useQueryClient } from '@tanstack/react-query'

// Inside component:
const queryClient = useQueryClient()

// After successful sync:
queryClient.invalidateQueries({
  predicate: (query) =>
    query.queryKey[0] === 'historical' &&
    (query.queryKey.includes(year) || query.queryKey.includes(String(year)))
})
```
This forces a refetch of all historical data for the synced year only, without invalidating other years' cached data. Note: History.jsx must import `useQueryClient` from TanStack and call it at the component level (hook rules).

#### News.jsx Polling
Replace the manual `setInterval(refetch, 60000)` with TanStack's `refetchInterval` option:
```js
useApiQuery('/api/news?...', { refetchInterval: 60_000 })
```
**Important**: The existing `useEffect` block containing `setInterval` and its cleanup must be **deleted entirely** — not just modified. Leaving it alongside `refetchInterval` would cause double-fetching.

#### LiveTiming.jsx
Live timing data comes primarily via WebSocket (`useWebSocket` hook), not useApi. The 4 `useApi` calls in LiveTiming are for initial REST data (session info, weather, race control). These get `staleTime: 0` (live tier) so they always refetch — WebSocket continues to work unchanged.

#### Conditional Queries
Several existing `useApi` calls pass dynamic endpoints that can be null/undefined:
```js
useApi(round ? `/api/historical/qualifying/${year}/${round}` : null)
```
`useApiQuery` handles this identically — falsy endpoint disables the query via TanStack's `enabled: !!endpoint` option.

#### fetchApi Imperative Usages
`fetchApi` is used directly (not as a hook) in these files and remains unchanged:
- **History.jsx**: POST sync (`fetchApi('/api/historical/sync/...')`) and loop fetch for race summaries
- **RaceMap.jsx**: Driver colors fetch and lap comparison fetch (2 call sites)
- **useRaceStoryData.js**: Used inside TanStack's `queryFn` callback

These are imperative async calls, not hooks, so they don't go through `useApiQuery`. The `fetchApi` export from `useApi.js` is kept permanently.

### React Query DevTools

Added in development only via lazy import. Floating panel (default position: bottom-left to avoid conflicts with app UI) shows:
- All cached queries and their state (fresh/stale/fetching/inactive)
- Cache hit/miss for debugging
- Manual invalidation for testing

Stripped from production build automatically by TanStack's tree-shaking.

### What Does NOT Change

- All backend endpoints — untouched
- All component JSX — untouched
- All data shapes — the response JSON is identical
- WebSocket hook — untouched
- `fetchApi` utility — kept permanently for imperative usages (History.jsx, RaceMap.jsx, useRaceStoryData.js)
- Vite proxy config — untouched

### Behavioral Changes

- **Retry**: Current `useApi` has no retry logic (a failed request stays failed). TanStack default is 3 retries. We set `retry: false` on the QueryClient to match existing behavior. Individual queries can opt into retries via options if desired later.
- **Request deduplication**: New behavior. If Dashboard and Race Story both request `/api/historical/races/2026`, only one fetch fires. This is strictly an improvement.
- **Stale-while-revalidate**: For non-Infinity staleTime tiers, TanStack will show cached data immediately while refetching in the background. This means components may briefly show slightly stale data for semi-stable/live tiers. This is the intended UX improvement.

### Verification

After migration:
1. Visit Race Story → see data load → navigate to Dashboard → navigate back to Race Story → **instant load, no spinner**
2. Visit Dashboard → switch year → switch back → **instant load from cache**
3. Check React Query DevTools: all historical queries show "fresh" state
4. Run `History.jsx` sync → verify only that year's historical queries invalidate and refetch
5. News page: verify 60s auto-refresh still works, verify old `setInterval` is removed
6. Live Timing: verify WebSocket + REST initial load still works
7. No console errors on any page
8. Conditional queries (null endpoints): verify no spurious fetches fire
