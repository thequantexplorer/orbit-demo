import { describe, expect, it } from 'vitest'
import { addDays, getWeeklyStats, startOfWeek } from './weeklyStats'
import type { BoardState, Card } from './types'

function makeCard(id: string, completedAt: string | null = null): Card {
  return {
    id,
    title: id,
    description: '',
    labels: [],
    assigneeId: null,
    dueDate: null,
    completedAt,
  }
}

function makeBoard(
  entries: { column: 'backlog' | 'review' | 'done'; card: Card }[],
): BoardState {
  const columns: BoardState['columns'] = [
    { id: 'backlog', title: 'Backlog', accent: '', cardIds: [] },
    { id: 'in-progress', title: 'In Progress', accent: '', cardIds: [] },
    { id: 'review', title: 'Review', accent: '', cardIds: [] },
    { id: 'done', title: 'Done', accent: '', cardIds: [] },
  ]
  const cards: Record<string, Card> = {}
  for (const { column, card } of entries) {
    cards[card.id] = card
    columns.find((entry) => entry.id === column)!.cardIds.push(card.id)
  }
  return { columns, cards, nextCardNumber: entries.length + 1 }
}

describe('startOfWeek', () => {
  it('keeps a Monday', () => {
    expect(startOfWeek('2026-10-19')).toBe('2026-10-19')
  })

  it('goes back six days from a Sunday', () => {
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19')
  })

  it('goes back to Monday from mid-week', () => {
    expect(startOfWeek('2026-10-21')).toBe('2026-10-19')
  })

  it('crosses a month and year boundary', () => {
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28')
  })
})

describe('addDays', () => {
  it('crosses a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
  })
})

describe('getWeeklyStats', () => {
  it('tracks scope, daily completions, and remaining work', () => {
    const board = makeBoard([
      { column: 'backlog', card: makeCard('open-1') },
      { column: 'review', card: makeCard('open-2') },
      { column: 'done', card: makeCard('done-unknown') },
      { column: 'done', card: makeCard('done-last-week', '2026-10-12') },
      { column: 'done', card: makeCard('done-mon', '2026-10-19') },
      { column: 'done', card: makeCard('done-wed', '2026-10-21') },
    ])

    expect(getWeeklyStats(board, '2026-10-21')).toEqual({
      weekStart: '2026-10-19',
      weekEnd: '2026-10-25',
      days: [
        { key: '2026-10-19', label: 'Mon', completed: 1, remaining: 3 },
        { key: '2026-10-20', label: 'Tue', completed: 0, remaining: 3 },
        { key: '2026-10-21', label: 'Wed', completed: 1, remaining: 2 },
        { key: '2026-10-22', label: 'Thu', completed: 0, remaining: null },
        { key: '2026-10-23', label: 'Fri', completed: 0, remaining: null },
        { key: '2026-10-24', label: 'Sat', completed: 0, remaining: null },
        { key: '2026-10-25', label: 'Sun', completed: 0, remaining: null },
      ],
      scope: 4,
      completedThisWeek: 2,
      completedToday: 1,
      remaining: 2,
    })
  })

  it('returns zero scope for an empty board', () => {
    const board = makeBoard([])
    expect(getWeeklyStats(board, '2026-10-21').scope).toBe(0)
  })

  it('skips column references with no matching card', () => {
    const board = makeBoard([])
    board.columns[0].cardIds.push('missing')
    expect(getWeeklyStats(board, '2026-10-21').scope).toBe(0)
  })
})
