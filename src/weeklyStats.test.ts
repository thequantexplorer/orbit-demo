import { describe, expect, it } from 'vitest'
import type { BoardState, Card, ColumnId } from './types'
import { addDays, getWeeklyStats, startOfWeek } from './weeklyStats'

function createBoard(
  specs: { id: string; column: ColumnId; completedAt: string | null }[],
): BoardState {
  const columnIds: ColumnId[] = ['backlog', 'in-progress', 'review', 'done']
  const columns = columnIds.map((id) => ({
    id,
    title: id,
    accent: '#000000',
    cardIds: specs.filter((card) => card.column === id).map((card) => card.id),
    wipLimit: null,
  }))
  const cards: Record<string, Card> = Object.fromEntries(
    specs.map(({ id, completedAt }) => [
      id,
      {
        id,
        title: id,
        description: '',
        labels: [],
        assigneeId: null,
        dueDate: null,
        completedAt,
      },
    ]),
  )
  return { columns, cards, nextCardNumber: specs.length + 1 }
}

describe('startOfWeek', () => {
  it('returns Monday for Wednesday, Monday, and Sunday dates', () => {
    expect(startOfWeek('2026-10-21')).toBe('2026-10-19')
    expect(startOfWeek('2026-10-19')).toBe('2026-10-19')
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19')
  })
})

describe('addDays', () => {
  it('moves across month boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  })
})

describe('getWeeklyStats', () => {
  it('builds this week’s completed counts and remaining-card burndown', () => {
    const board = createBoard([
      { id: 'done-mon', column: 'done', completedAt: '2026-10-19' },
      { id: 'done-wed', column: 'done', completedAt: '2026-10-21' },
      { id: 'done-unknown', column: 'done', completedAt: null },
      { id: 'done-last-week', column: 'done', completedAt: '2026-10-14' },
      { id: 'done-future', column: 'done', completedAt: '2026-10-24' },
      { id: 'open-backlog', column: 'backlog', completedAt: null },
      { id: 'open-progress', column: 'in-progress', completedAt: null },
      { id: 'open-review', column: 'review', completedAt: null },
    ])
    const stats = getWeeklyStats(board, '2026-10-21')

    expect(stats).toMatchObject({
      weekStart: '2026-10-19',
      scope: 8,
      startRemaining: 6,
      remaining: 3,
      completedThisWeek: 3,
      completedLastWeek: 1,
    })
    expect(stats.days.map(({ remaining }) => remaining)).toEqual([
      5,
      5,
      3,
      null,
      null,
      null,
      null,
    ])
    expect(stats.days.map(({ completed }) => completed)).toEqual([
      1, 0, 2, 0, 0, 0, 0,
    ])
  })

  it('returns zeros for an empty board', () => {
    const stats = getWeeklyStats(createBoard([]), '2026-10-21')
    expect(stats).toMatchObject({
      weekStart: '2026-10-19',
      scope: 0,
      startRemaining: 0,
      remaining: 0,
      completedThisWeek: 0,
      completedLastWeek: 0,
    })
    expect(stats.days.map(({ remaining }) => remaining)).toEqual([
      0,
      0,
      0,
      null,
      null,
      null,
      null,
    ])
    expect(stats.days.map(({ completed }) => completed)).toEqual([
      0, 0, 0, 0, 0, 0, 0,
    ])
  })
})
