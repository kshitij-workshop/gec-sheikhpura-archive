import { useEffect } from 'react'
import { useLocation } from 'react-router'

/** Returns every route change to the top of the page. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
