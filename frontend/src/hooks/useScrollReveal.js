import { useEffect, useRef, useState } from 'react'

/**
 * IntersectionObserver-based scroll reveal.
 * Returns a ref to attach to the element and a boolean `visible`.
 * The element fades in when it enters the viewport.
 *
 * @param {Object} options
 * @param {string} options.rootMargin - Intersection margin (default: '0px 0px -60px 0px')
 * @param {number} options.threshold - Intersection threshold (default: 0.1)
 * @param {boolean} options.once - Only trigger once (default: true)
 */
export function useScrollReveal({ rootMargin = '0px 0px -60px 0px', threshold = 0.1, once = true } = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) observer.unobserve(el)
        } else if (!once) {
          setVisible(false)
        }
      },
      { rootMargin, threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, threshold, once])

  return { ref, visible }
}
