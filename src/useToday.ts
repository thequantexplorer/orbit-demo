import { useEffect, useState } from 'react'

export function msUntilNextDay(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next.getTime() - now.getTime() + 1000
}

/** The current date, refreshed when the local day changes. */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => {
      const now = new Date()
      if (now.toDateString() !== today.toDateString()) setToday(now)
    }
    const timer = window.setTimeout(refresh, msUntilNextDay(today))
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [today])
  return today
}
