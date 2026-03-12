import { useState, useEffect, useRef, useCallback } from 'react'

export function useWebSocket(path) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('disconnected')
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)

  const connect = useCallback(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const url = `${proto}//${host}${path}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      // Send periodic pings
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping')
      }, 30000)
      ws._pingInterval = pingInterval
    }

    ws.onmessage = (event) => {
      if (event.data === 'pong') return
      try {
        const update = JSON.parse(event.data)
        setData(prev => ({ ...prev, ...update }))
      } catch {}
    }

    ws.onclose = () => {
      setStatus('reconnecting')
      if (ws._pingInterval) clearInterval(ws._pingInterval)
      reconnectTimer.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [path])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        if (wsRef.current._pingInterval) clearInterval(wsRef.current._pingInterval)
        wsRef.current.close()
      }
    }
  }, [connect])

  return { data, status }
}
