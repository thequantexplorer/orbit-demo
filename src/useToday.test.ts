import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { subscribeToDayChange } from './useToday'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 9, 23, 59, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('subscribeToDayChange', () => {
  it('notifies subscribers after local midnight, every day', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToDayChange(listener)
    vi.advanceTimersByTime(59_000)
    expect(listener).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2_000)
    expect(listener).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(24 * 60 * 60 * 1000)
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('stops notifying once unsubscribed', () => {
    const listener = vi.fn()
    subscribeToDayChange(listener)()
    vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000)
    expect(listener).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
