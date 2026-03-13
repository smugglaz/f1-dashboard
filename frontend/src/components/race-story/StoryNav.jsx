import { useState, useEffect } from 'react'

const SECTIONS = [
  { id: 'stage', label: 'The Stage' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'unfolds', label: 'Race' },
  { id: 'package', label: 'Insight' },
  { id: 'numbers', label: 'Numbers' },
]

export default function StoryNav() {
  const [active, setActive] = useState('stage')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    )

    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-end gap-3">
      {SECTIONS.map(s => (
        <button
          key={s.id}
          onClick={() => scrollTo(s.id)}
          className="group flex items-center gap-2"
        >
          <span className={`text-caption-2 transition-all duration-200 ${
            active === s.id
              ? 'opacity-100 text-label-primary font-medium'
              : 'opacity-0 group-hover:opacity-100 text-label-tertiary'
          }`}>
            {s.label}
          </span>
          <div className={`rounded-full transition-all duration-200 ${
            active === s.id
              ? 'w-2.5 h-2.5 bg-label-primary'
              : 'w-1.5 h-1.5 bg-label-quaternary group-hover:bg-label-secondary'
          }`} />
        </button>
      ))}
    </nav>
  )
}
