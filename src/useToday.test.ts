import { describe, expect, it } from 'vitest'
import { msUntilNextDay } from './useToday'

describe('msUntilNextDay', () => {
  it('waits until just after the next local midnight', () => {
    const now = new Date(2026, 9, 9, 23, 59, 30)
    const fireAt = new Date(now.getTime() + msUntilNextDay(now))
    expect(fireAt.getDate()).toBe(10)
    expect(fireAt.getHours()).toBe(0)
    expect(fireAt.getSeconds()).toBe(1)
  })
})
