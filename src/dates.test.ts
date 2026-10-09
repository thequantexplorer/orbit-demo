import { describe, expect, it } from 'vitest'
import { isDueThisWeek, parseDay, startOfWeek } from './dates'

const monday = new Date(2026, 9, 5, 9, 30)
const wednesday = new Date(2026, 9, 7, 14, 0)
const saturday = new Date(2026, 9, 10, 18, 45)

describe('parseDay', () => {
  it('parses YYYY-MM-DD as a local date', () => {
    const d = parseDay('2026-10-12')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([
      2026, 9, 12, 0,
    ])
  })
})

describe('startOfWeek', () => {
  it.each([
    ['Monday', monday],
    ['Wednesday', wednesday],
    ['Saturday', saturday],
  ])('returns midnight on Monday for a %s', (_day, date) => {
    expect(startOfWeek(date)).toEqual(new Date(2026, 9, 5))
  })
})

describe('isDueThisWeek', () => {
  it('includes other days of the current week', () => {
    expect(isDueThisWeek('2026-10-05', wednesday)).toBe(true)
    expect(isDueThisWeek('2026-10-09', monday)).toBe(true)
    expect(isDueThisWeek('2026-10-11', saturday)).toBe(true)
  })

  it('excludes the previous and next weeks', () => {
    expect(isDueThisWeek('2026-10-04', monday)).toBe(false)
    expect(isDueThisWeek('2026-10-12', saturday)).toBe(false)
  })
})
