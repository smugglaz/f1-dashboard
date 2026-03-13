import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LayoutDashboard, History, Map, Radio, Brain, Newspaper, Menu, X } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/race-analysis', icon: History, label: 'Race Analysis' },
  { to: '/race-map', icon: Map, label: 'Track Map' },
  { to: '/live', icon: Radio, label: 'Live Timing', liveIndicator: true },
  { to: '/predictions', icon: Brain, label: 'Predictions' },
  { to: '/news', icon: Newspaper, label: 'News' },
]

export default function Layout({ children }) {
  const [liveActive, setLiveActive] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const checkLive = () => {
      fetch('/api/live/session')
        .then(r => r.json())
        .then(d => setLiveActive(d && d.status !== 'no_active_session'))
        .catch(() => setLiveActive(false))
    }
    checkLive()
    const id = setInterval(checkLive, 30000)
    return () => clearInterval(id)
  }, [])

  // Close sidebar on route change (mobile)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex min-h-screen bg-f1-dark">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed lg:static inset-y-0 left-0 z-50 w-56 bg-white border-r border-f1-border flex flex-col shrink-0 shadow-sm transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-f1-border flex items-center justify-between">
          <h1 className="text-xl font-bold">
            <span className="text-f1-red">F1</span> Dashboard
          </h1>
          <button
            onClick={closeSidebar}
            className="lg:hidden text-f1-muted hover:text-f1-text"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 py-2">
          {navItems.map(({ to, icon: Icon, label, liveIndicator }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-f1-red/10 text-f1-red border-r-2 border-f1-red'
                    : 'text-f1-muted hover:text-f1-text hover:bg-f1-border/20'
                }`
              }
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>
              {liveIndicator && liveActive && (
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" title="Live session active" />
              )}
            </NavLink>
          ))}
        </div>
        <div className="p-4 border-t border-f1-border text-xs text-f1-muted">
          F1 Analytics v2.0
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-f1-border px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-f1-muted hover:text-f1-text"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-bold">
            <span className="text-f1-red">F1</span> Dashboard
          </h1>
        </div>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
