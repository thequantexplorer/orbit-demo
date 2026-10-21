import { describe, expect, it } from 'vitest'
import { createSeedBoard } from './data'
import { fromDateKey, toDateKey } from './dueDate'
import type { BoardState, Card, ColumnId } from './types'
import { getWeeklyStats } from './weeklyStats'

const now = new Date(2026, 9, 21, 9)

function timestamp(daysAgo: number, hour = 12) {
  const date = new Date(now)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, 0, 0, 0)
  return date.getTime()
}

function makeBoard(
  entries: Array<{ card: Card; columnId: ColumnId }> = [],
  archivedCompletions: BoardState['archivedCompletions'] = [],
): BoardState {
  const seed = createSeedBoard(now)
  return {
    ...seed,
    columns: seed.columns.map((column) => ({
      ...column,
      cardIds: entries
        .filter((entry) => entry.columnId === column.id)
        .map(({ card }) => card.id),
    })),
    cards: Object.fromEntries(entries.map(({ card }) => [card.id, card])),
    nextCardNumber: entries.length + 1,
    archivedCompletions,
  }
}

function card(
  id: string,
  createdAt: number | null,
  completedAt: number | null = null,
): Card {
  return {
    id,
    title: id,
    description: '',
    labels: [],
    assigneeId: null,
    dueDate: null,
    createdAt,
    completedAt,
  }
}

describe('getWeeklyStats', () => {
  it('returns the expected seeded weekly burndown', () => {
    const stats = getWeeklyStats(createSeedBoard(now), now)
    expect(stats.days.map(({ remaining }) => remaining)).toEqual([
      8, 7, 7, 8, 7, 7, 7,
    ])
    expect(stats.days.map(({ completed }) => completed)).toEqual([
      0, 1, 0, 0, 1, 0, 0,
    ])
    expect(stats).toMatchObject({
      completed: 2,
      previousCompleted: 0,
      added: 1,
      remaining: 7,
      startRemaining: 8,
    })
  })

  it('includes archived completions in completion and past remaining counts', () => {
    const stats = getWeeklyStats(
      makeBoard([], [
        {
          id: 'archived',
          createdAt: timestamp(3, 10),
          completedAt: timestamp(1, 16),
        },
      ]),
      now,
    )
    expect(stats.completed).toBe(1)
    expect(stats.days.map(({ remaining }) => remaining)).toEqual([
      0, 0, 0, 1, 1, 0, 0,
    ])
    expect(stats.remaining).toBe(0)
  })

  it('does not count legacy done cards with unknown completion time', () => {
    const stats = getWeeklyStats(
      makeBoard([{ card: card('legacy-done', null), columnId: 'done' }]),
      now,
    )
    expect(stats.completed).toBe(0)
    expect(stats.days.every(({ remaining }) => remaining === 0)).toBe(true)
    expect(stats.startRemaining).toBe(0)
  })

  it('includes a card in remaining from its creation day onward', () => {
    const stats = getWeeklyStats(
      makeBoard([
        { card: card('new', timestamp(3, 11)), columnId: 'in-progress' },
      ]),
      now,
    )
    expect(stats.days.map(({ remaining }) => remaining)).toEqual([
      0, 0, 0, 1, 1, 1, 1,
    ])
    expect(stats.added).toBe(1)
  })

  it('counts completions during the seven preceding local days', () => {
    const stats = getWeeklyStats(
      makeBoard(
        [
          {
            card: card('eight-days-ago', timestamp(20), timestamp(8)),
            columnId: 'done',
          },
          {
            card: card('thirteen-days-ago', timestamp(20), timestamp(13)),
            columnId: 'done',
          },
          {
            card: card('fourteen-days-ago', timestamp(20), timestamp(14)),
            columnId: 'done',
          },
        ],
      ),
      now,
    )
    expect(stats.previousCompleted).toBe(2)
    expect(stats.completed).toBe(0)
  })

  it.each([
    new Date(2026, 2, 9, 12),
    new Date(2026, 10, 2, 12),
  ])('returns seven consecutive local dates ending today for %s', (date) => {
    const stats = getWeeklyStats(makeBoard(), date)
    const expectedStart = fromDateKey(stats.days[0].key)
    for (const day of stats.days) {
      expect(day.key).toBe(toDateKey(expectedStart))
      expectedStart.setDate(expectedStart.getDate() + 1)
    }
    expect(stats.days).toHaveLength(7)
    expect(stats.days[6].key).toBe(toDateKey(date))
  })
})
