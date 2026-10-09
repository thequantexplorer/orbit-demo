import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { subscribeToDayChange } from './useToday'

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 9, 23, 58, 30))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('subscribeToDayChange', () => {
  it('notifies once per local day change', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToDayChange(listener)
    vi.advanceTimersByTime(MINUTE)
    expect(listener).not.toHaveBeenCalled()
    vi.advanceTimersByTime(MINUTE)
    expect(listener).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(DAY)
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('notices clock jumps within a minute', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToDayChange(listener)
    vi.setSystemTime(new Date(2026, 9, 7, 12, 0))
    vi.advanceTimersByTime(MINUTE)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('stops its timer once the last listener unsubscribes', () => {
    const listener = vi.fn()
    subscribeToDayChange(listener)()
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(2 * DAY)
    expect(listener).not.toHaveBeenCalled()
  })

  it('does not leave a timer behind when unsubscribing during a notification', () => {
    const unsubscribe = subscribeToDayChange(() => unsubscribe())
    vi.advanceTimersByTime(2 * MINUTE)
    expect(vi.getTimerCount()).toBe(0)

    const listener = vi.fn()
    const unsubscribeAgain = subscribeToDayChange(listener)
    expect(vi.getTimerCount()).toBe(1)
    vi.advanceTimersByTime(DAY)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribeAgain()
  })

  it('skips listeners removed earlier in the same notification', () => {
    const second = vi.fn()
    let unsubscribeSecond = () => {}
    const unsubscribeFirst = subscribeToDayChange(() => unsubscribeSecond())
    unsubscribeSecond = subscribeToDayChange(second)
    vi.advanceTimersByTime(2 * MINUTE)
    expect(second).not.toHaveBeenCalled()
    unsubscribeFirst()
  })
})
