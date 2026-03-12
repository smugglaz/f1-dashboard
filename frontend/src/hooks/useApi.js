import { useState, useEffect, useCallback } from 'react'

const BASE = ''

export function useApi(endpoint, options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!endpoint) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BASE}${endpoint}`, options)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

export async function fetchApi(endpoint, options = {}) {
  const res = await fetch(`${BASE}${endpoint}`, options)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
