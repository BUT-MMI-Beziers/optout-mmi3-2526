import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    const main = document.querySelector('main')
    if (main) main.scrollTop = 0
    else window.scrollTo(0, 0)
  }, [pathname])
  return null
}
