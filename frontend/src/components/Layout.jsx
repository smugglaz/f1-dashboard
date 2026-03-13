import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { LayoutDashboard, History, Map, Radio, Brain, Newspaper, Menu, X } from 'lucide-react'

const navGroups = [
  {
    label: 'Analysis',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/race-analysis', icon: History, label: 'Race Story' },
    ],
  },
  {
    label: 'Live',
    items: [
      { to: '/race-map', icon: Map, label: 'Track Map' },
      { to: '/live', icon: Radio, label: 'Live Timing', liveIndicator: true },
    ],
  },
  {
    label: 'Intel',
    items: [
      { to: '/predictions', icon: Brain, label: 'Predictions' },
      { to: '/news', icon: Newspaper, label: 'News' },
    ],
  },
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

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — fixed glass panel */}
      <nav
        className={`fixed inset-y-0 left-0 z-50 w-56 glass-heavy flex flex-col shrink-0 transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4 flex items-center justify-between">
          <h1 className="text-title-3 font-bold tracking-tight text-label-primary">
            F1
          </h1>
          <button
            onClick={closeSidebar}
            className="lg:hidden text-label-tertiary hover:text-label-primary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav groups */}
        <div className="flex-1 px-3 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-4">
              <div className="px-2 mb-1 text-caption-2 uppercase tracking-wider font-medium">
                {group.label}
              </div>
              {group.items.map(({ to, icon: Icon, label, liveIndicator }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'bg-black/[0.06] text-label-primary font-medium'
                        : 'text-label-secondary hover:text-label-primary hover:bg-black/[0.03]'
                    }`
                  }
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span className="flex-1">{label}</span>
                  {liveIndicator && liveActive && (
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" title="Live session active" />
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 text-caption-2">
          F1 Analytics
        </div>
      </nav>

      {/* Main content — offset by sidebar width */}
      <main className="flex-1 lg:ml-56 overflow-auto">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 glass-heavy px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-label-secondary hover:text-label-primary transition-colors"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-headline">
            F1
          </h1>
        </div>

        {/* Page content with Apple-style margins */}
        <div className="max-w-7xl mx-auto px-8 py-6">{children}</div>
      </main>
    </div>
  )
}
