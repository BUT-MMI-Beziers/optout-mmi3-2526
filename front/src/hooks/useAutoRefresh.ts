import { useEffect, useRef } from 'react'

export function useAutoRefresh(
  onRefresh: () => void,
  { intervalMs = 30000, throttleMs = 10000 }: { intervalMs?: number; throttleMs?: number } = {}
) {
  const callback = useRef(onRefresh)
  const lastRun = useRef(Date.now())

  useEffect(() => { callback.current = onRefresh }, [onRefresh])

  useEffect(() => {
    const run = () => {
      lastRun.current = Date.now()
      callback.current()
    }

    let timer: ReturnType<typeof setInterval> | undefined
    const startPolling = () => {
      if (timer) return
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') run()
      }, intervalMs)
    }
    const stopPolling = () => {
      if (timer) clearInterval(timer)
      timer = undefined
    }

    const onFocus = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastRun.current >= throttleMs) run()
      startPolling()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastRun.current >= throttleMs) run()
        startPolling()
      } else {
        stopPolling()
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)
    startPolling()

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      stopPolling()
    }
  }, [intervalMs, throttleMs])
}
