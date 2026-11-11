import { describe, expect, it } from 'vitest'
import {
  DUE_SOON_DAYS,
  addDays,
  formatDueDate,
  fromDateKey,
  getDueChip,
  isDueWithinDays,
  isValidDueDate,
  toDateKey,
} from './dueDate'

const today = new Date(2026, 9, 9, 14, 30)

describe('isValidDueDate', () => {
  it('accepts real YYYY-MM-DD dates', () => {
    expect(isValidDueDate('2026-10-12')).toBe(true)
    expect(isValidDueDate('2028-02-29')).toBe(true)
    expect(isValidDueDate('0050-03-15')).toBe(true)
    expect(isValidDueDate('0001-01-01')).toBe(true)
  })

  it('rejects other values', () => {
    for (const value of [
      undefined,
      null,
      20261012,
      '',
      '2026-1-12',
      '10/12/2026',
      '2026-10-12T00:00',
      '2026-02-30',
      '2027-02-29',
      '2026-13-01',
    ]) {
      expect(isValidDueDate(value)).toBe(false)
    }
  })
})

describe('toDateKey', () => {
  it('uses the local calendar day with zero padding', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(toDateKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31')
  })
})

describe('fromDateKey', () => {
  it('returns local midnight of the day and round-trips with toDateKey', () => {
    const date = fromDateKey('2026-10-12')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(9)
    expect(date.getDate()).toBe(12)
    expect(date.getHours()).toBe(0)
    for (const key of ['2026-10-12', '0050-03-15', '2028-02-29']) {
      expect(toDateKey(fromDateKey(key))).toBe(key)
    }
  })
})

describe('formatDueDate', () => {
  it('omits the year when it is the current year', () => {
    expect(formatDueDate('2026-10-12', today)).toBe('Oct 12')
    expect(formatDueDate('2026-01-03', today)).toBe('Jan 3')
  })

  it('adds the year for other years or when asked', () => {
    expect(formatDueDate('2027-01-03', today)).toBe('Jan 3, 2027')
    expect(formatDueDate('2026-10-12', today, { withYear: true })).toBe(
      'Oct 12, 2026',
    )
  })
})

describe('getDueChip', () => {
  it('returns null when there is no valid due date', () => {
    expect(getDueChip(null, today)).toBeNull()
    expect(getDueChip(undefined, today)).toBeNull()
    expect(getDueChip('soon', today)).toBeNull()
  })

  it('shows the date for future due dates', () => {
    expect(getDueChip('2026-10-12', today)).toEqual({
      status: 'upcoming',
      label: 'Due Oct 12',
      title: 'Due Oct 12, 2026',
    })
    expect(getDueChip('2026-10-10', today)?.label).toBe('Due Oct 10')
    expect(getDueChip('2027-03-01', today)?.label).toBe('Due Mar 1, 2027')
  })

  it('says "Due today" on the due day, whatever the time', () => {
    for (const time of [
      new Date(2026, 9, 9, 0, 0),
      today,
      new Date(2026, 9, 9, 23, 59),
    ]) {
      expect(getDueChip('2026-10-09', time)).toEqual({
        status: 'today',
        label: 'Due today',
        title: 'Due Oct 9, 2026',
      })
    }
  })

  it('says "Overdue" once the due day has passed', () => {
    expect(getDueChip('2026-10-08', today)).toEqual({
      status: 'overdue',
      label: 'Overdue',
      title: 'Due Oct 8, 2026',
    })
    expect(getDueChip('2025-12-31', today)?.status).toBe('overdue')
    expect(
      getDueChip('2026-10-09', new Date(2026, 9, 10, 0, 0))?.status,
    ).toBe('overdue')
  })
})

describe('addDays', () => {
  it('moves across month, year, and leap-day boundaries', () => {
    expect(addDays('2026-10-09', 0)).toBe('2026-10-09')
    expect(addDays('2026-10-09', 6)).toBe('2026-10-15')
    expect(addDays('2026-10-28', 7)).toBe('2026-11-04')
    expect(addDays('2026-12-29', 7)).toBe('2027-01-05')
    expect(addDays('2028-02-26', 3)).toBe('2028-02-29')
    expect(addDays('2026-10-09', -1)).toBe('2026-10-08')
  })

  it('counts calendar days across daylight-saving changes', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
  })
})

describe('isDueWithinDays', () => {
  const todayKey = '2026-10-09'

  it('defaults to a seven-day window', () => {
    expect(DUE_SOON_DAYS).toBe(7)
  })

  it('includes today through the sixth day after today', () => {
    expect(isDueWithinDays('2026-10-09', todayKey)).toBe(true)
    expect(isDueWithinDays('2026-10-12', todayKey)).toBe(true)
    expect(isDueWithinDays('2026-10-15', todayKey)).toBe(true)
  })

  it('excludes overdue dates and dates after the window', () => {
    expect(isDueWithinDays('2026-10-08', todayKey)).toBe(false)
    expect(isDueWithinDays('2025-10-12', todayKey)).toBe(false)
    expect(isDueWithinDays('2026-10-16', todayKey)).toBe(false)
    expect(isDueWithinDays('2027-10-12', todayKey)).toBe(false)
  })

  it('handles windows that cross a month or year', () => {
    expect(isDueWithinDays('2027-01-02', '2026-12-29')).toBe(true)
    expect(isDueWithinDays('2027-01-04', '2026-12-29')).toBe(true)
    expect(isDueWithinDays('2027-01-05', '2026-12-29')).toBe(false)
  })

  it('ignores missing or invalid due dates', () => {
    for (const value of [null, undefined, '', 'soon', '2026-10-32']) {
      expect(isDueWithinDays(value, todayKey)).toBe(false)
    }
  })

  it('supports other window sizes', () => {
    expect(isDueWithinDays('2026-10-09', todayKey, 1)).toBe(true)
    expect(isDueWithinDays('2026-10-10', todayKey, 1)).toBe(false)
    expect(isDueWithinDays('2026-10-09', todayKey, 0)).toBe(false)
  })
})
