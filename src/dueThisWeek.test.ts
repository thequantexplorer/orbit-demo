import { describe, expect, it } from 'vitest'
import { applyDueThisWeek } from './dueThisWeek'
import type { Card } from './types'

const todayKey = '2026-10-09'

function card(id: string, dueDate: string | null): Card {
  return {
    id,
    title: id,
    description: '',
    labels: [],
    assigneeId: null,
    dueDate,
  }
}

const columns = [
  {
    id: 'todo',
    cards: [
      card('KB-1', '2026-10-09'),
      card('KB-2', '2026-10-08'),
      card('KB-3', null),
    ],
  },
  {
    id: 'doing',
    cards: [card('KB-4', '2026-10-15'), card('KB-5', '2026-10-16')],
  },
  { id: 'done', cards: [card('KB-6', '2026-10-12')] },
]

const ids = (result: { columns: { cards: Card[] }[] }) =>
  result.columns.map((column) => column.cards.map((entry) => entry.id))

describe('applyDueThisWeek', () => {
  it('counts cards due in the next 7 days without filtering when off', () => {
    const result = applyDueThisWeek(columns, false, todayKey)
    expect(result.count).toBe(3)
    expect(result.columns).toBe(columns)
  })

  it('keeps only cards due in the next 7 days when on', () => {
    const result = applyDueThisWeek(columns, true, todayKey)
    expect(result.count).toBe(3)
    expect(ids(result)).toEqual([['KB-1'], ['KB-4'], ['KB-6']])
  })

  it('keeps every column and other column fields', () => {
    const result = applyDueThisWeek(columns, true, '2027-01-01')
    expect(result.count).toBe(0)
    expect(result.columns.map((column) => column.id)).toEqual([
      'todo',
      'doing',
      'done',
    ])
    expect(ids(result)).toEqual([[], [], []])
  })

  it('moves the window with today', () => {
    const result = applyDueThisWeek(columns, true, '2026-10-12')
    expect(result.count).toBe(3)
    expect(ids(result)).toEqual([[], ['KB-4', 'KB-5'], ['KB-6']])
  })

  it('does not mutate the input columns', () => {
    applyDueThisWeek(columns, true, todayKey)
    expect(columns[0].cards).toHaveLength(3)
  })
})
