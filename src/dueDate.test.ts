import { describe, expect, it } from 'vitest'
import {
  formatDueDate,
  getDueChip,
  getDueStatus,
  isDueDate,
  parseDueDate,
  toDateKey,
} from './dueDate'

const now = new Date(2026, 9, 9, 14, 30)

describe('parseDueDate / isDueDate', () => {
  it('parses a YYYY-MM-DD string as a local calendar date', () => {
    const date = parseDueDate('2026-10-12')
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(9)
    expect(date?.getDate()).toBe(12)
    expect(isDueDate('2026-10-12')).toBe(true)
  })

  it('keeps years before 100 instead of mapping them to the 1900s', () => {
    const date = parseDueDate('0042-03-04')
    expect(date?.getFullYear()).toBe(42)
    expect(isDueDate('0042-03-04')).toBe(true)
    expect(toDateKey(date!)).toBe('0042-03-04')
  })

  it('rejects malformed or impossible dates', () => {
    for (const value of [
      '',
      '2026-10-12T00:00:00Z',
      '10/12/2026',
      '2026-13-01',
      '2026-02-30',
      12,
      null,
      undefined,
    ]) {
      expect(parseDueDate(value)).toBeNull()
      expect(isDueDate(value)).toBe(false)
    }
  })
})

describe('toDateKey', () => {
  it('uses the local date with zero padding', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('getDueStatus', () => {
  it('is overdue for any earlier day', () => {
    expect(getDueStatus('2026-10-08', now)).toBe('overdue')
    expect(getDueStatus('2025-12-31', now)).toBe('overdue')
  })

  it('is today for the current day regardless of the time', () => {
    expect(getDueStatus('2026-10-09', now)).toBe('today')
    expect(getDueStatus('2026-10-09', new Date(2026, 9, 9, 0, 0))).toBe('today')
    expect(getDueStatus('2026-10-09', new Date(2026, 9, 9, 23, 59))).toBe(
      'today',
    )
  })

  it('is upcoming for later days', () => {
    expect(getDueStatus('2026-10-10', now)).toBe('upcoming')
    expect(getDueStatus('2027-01-01', now)).toBe('upcoming')
  })
})

describe('formatDueDate', () => {
  it('shows month and day within the current year', () => {
    expect(formatDueDate('2026-10-12', now)).toBe('Oct 12')
  })

  it('adds the year for other years', () => {
    expect(formatDueDate('2027-01-03', now)).toBe('Jan 3, 2027')
  })
})

describe('getDueChip', () => {
  it('returns null when there is no valid due date', () => {
    expect(getDueChip(undefined, now)).toBeNull()
    expect(getDueChip(null, now)).toBeNull()
    expect(getDueChip('', now)).toBeNull()
    expect(getDueChip('soon', now)).toBeNull()
  })

  it('labels an upcoming date with the date', () => {
    expect(getDueChip('2026-10-12', now)).toEqual({
      status: 'upcoming',
      label: 'Due Oct 12',
      title: 'Due Oct 12',
    })
  })

  it('labels the current day as due today', () => {
    expect(getDueChip('2026-10-09', now)).toEqual({
      status: 'today',
      label: 'Due today',
      title: 'Due Oct 9',
    })
  })

  it('labels a past date as overdue', () => {
    expect(getDueChip('2026-10-01', now)).toEqual({
      status: 'overdue',
      label: 'Overdue',
      title: 'Due Oct 1',
    })
  })
})
