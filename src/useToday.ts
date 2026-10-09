import { useSyncExternalStore } from 'react'
import { toDateKey } from './dueDate'

// Polling (rather than one timer until midnight) also catches clock and
// time-zone changes, and timers that were paused while the machine slept.
const CHECK_INTERVAL_MS = 60_000

const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | undefined
let lastKey = ''

function getTodayKey() {
  return toDateKey(new Date())
}

function checkDay() {
  const key = getTodayKey()
  if (key === lastKey) return
  lastKey = key
  for (const listener of [...listeners]) listener()
}

/** Calls `listener` when the local calendar day changes. */
export function subscribeToDayChange(listener: () => void): () => void {
  listeners.add(listener)
  if (timer === undefined) {
    lastKey = getTodayKey()
    timer = setInterval(checkDay, CHECK_INTERVAL_MS)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer !== undefined) {
      clearInterval(timer)
      timer = undefined
    }
  }
}

/** Today's local `YYYY-MM-DD`; re-renders the caller when the day changes. */
export function useTodayKey(): string {
  return useSyncExternalStore(subscribeToDayChange, getTodayKey)
}
