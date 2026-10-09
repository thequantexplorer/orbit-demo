import { useSyncExternalStore } from 'react'
import { toDateKey } from './dueDate'

const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined

function msUntilNextDay(now: Date): number {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next.getTime() - now.getTime()
}

function scheduleDayChange() {
  // A small buffer so the callback lands just after local midnight.
  timer = setTimeout(() => {
    for (const listener of listeners) listener()
    scheduleDayChange()
  }, msUntilNextDay(new Date()) + 1000)
}

/** Calls `listener` each time the local calendar day changes. */
export function subscribeToDayChange(listener: () => void): () => void {
  listeners.add(listener)
  if (listeners.size === 1) scheduleDayChange()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) clearTimeout(timer)
  }
}

function getTodayKey() {
  return toDateKey(new Date())
}

/** Today's local `YYYY-MM-DD`; re-renders the caller when the day changes. */
export function useTodayKey(): string {
  return useSyncExternalStore(subscribeToDayChange, getTodayKey)
}
