import { describe, expect, it } from 'vitest'
import {
  formatDueDate,
  getDueChip,
  isValidDueDate,
  toDateKey,
} from './dueDate'

const today = new Date(2026, 9, 9, 14, 30)

describe('isValidDueDate', () => {
  it('accepts real YYYY-MM-DD dates', () => {
    expect(isValidDueDate('2026-10-12')).toBe(true)
    expect(isValidDueDate('2028-02-29')).toBe(true)
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
