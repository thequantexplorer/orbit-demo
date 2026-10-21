import { describe, expect, it } from 'vitest'
import { fromDateKey } from './dueDate'
import { createSeedBoard } from './data'
import { computeWeeklyStats } from './weeklyStats'
import type { BoardState } from './types'

function makeBoard(
  completedDates: Partial<Record<'KB-8' | 'KB-9', string | null>> = {},
  staleNonDoneDate?: string,
): BoardState {
  const seed = createSeedBoard(fromDateKey('2026-01-08'))
  const cards: BoardState['cards'] = Object.fromEntries(
    Object.entries(seed.cards).map(([id, card]) => [
      id,
      { ...card, completedOn: null },
    ]),
  )
  for (const [id, completedOn] of Object.entries(completedDates))
    cards[id] = { ...cards[id], completedOn: completedOn ?? null }
  if (staleNonDoneDate)
    cards['KB-1'] = { ...cards['KB-1'], completedOn: staleNonDoneDate }
  return { ...seed, cards }
}

describe('computeWeeklyStats', () => {
  it('starts the week on Monday for Sunday and Monday dates', () => {
    const board = makeBoard()
    const sunday = computeWeeklyStats(board, '2026-01-04')
    expect(sunday.weekStartKey).toBe('2025-12-29')
    expect(sunday.days[0].key).toBe('2025-12-29')
    expect(sunday.weekEndKey).toBe('2026-01-04')

    const monday = computeWeeklyStats(board, '2026-01-05')
    expect(monday.weekStartKey).toBe('2026-01-05')
    expect(monday.weekEndKey).toBe('2026-01-11')
  })

  it('buckets completions by day and leaves future remaining values null', () => {
    const stats = computeWeeklyStats(
      makeBoard({ 'KB-8': '2026-01-05', 'KB-9': '2026-01-08' }),
      '2026-01-08',
    )
    expect(stats.days.map((day) => day.completed)).toEqual([1, 0, 0, 1, 0, 0, 0])
    expect(stats.days.map((day) => day.remaining)).toEqual([
      8,
      8,
      8,
      7,
      null,
      null,
      null,
    ])
  })

  it('counts completions from the previous Monday-to-Sunday week', () => {
    const stats = computeWeeklyStats(
      makeBoard({ 'KB-8': '2026-01-04', 'KB-9': '2026-01-05' }),
      '2026-01-08',
    )
    expect(stats.completedLastWeek).toBe(1)
    expect(stats.completedThisWeek).toBe(1)
  })

  it('ignores unknown done dates, future dates, and stale non-done dates', () => {
    const stats = computeWeeklyStats(
      makeBoard(
        { 'KB-8': null, 'KB-9': '2026-01-09' },
        '2026-01-06',
      ),
      '2026-01-08',
    )
    expect(stats.completedThisWeek).toBe(0)
    expect(stats.completedLastWeek).toBe(0)
    expect(stats.remaining).toBe(7)
    expect(stats.startRemaining).toBe(7)
  })

  it('calculates start remaining and the unrounded ideal line', () => {
    const stats = computeWeeklyStats(
      makeBoard({ 'KB-8': '2026-01-05', 'KB-9': '2026-01-08' }),
      '2026-01-08',
    )
    expect(stats.remaining).toBe(7)
    expect(stats.completedThisWeek).toBe(2)
    expect(stats.startRemaining).toBe(9)
    expect(stats.days[0].ideal).toBe(9 * (1 - 1 / 7))
    expect(stats.days[6].ideal).toBe(0)
  })

  it('handles a week crossing a month and year boundary', () => {
    const stats = computeWeeklyStats(
      makeBoard({ 'KB-8': '2025-12-30', 'KB-9': '2026-01-01' }),
      '2026-01-01',
    )
    expect(stats.weekStartKey).toBe('2025-12-29')
    expect(stats.weekEndKey).toBe('2026-01-04')
    expect(stats.days.map((day) => day.key)).toEqual([
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
    ])
  })
})
