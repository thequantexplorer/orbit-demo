import { describe, expect, it } from 'vitest'
import type { BoardState, Card } from './types'
import { computeWeeklyStats, getWeekStart } from './weeklyStats'

function makeCard(id: string, completedAt: string | null): Card {
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

describe('getWeekStart', () => {
  it('returns Monday for Wednesday, Monday, and Sunday dates', () => {
    expect(getWeekStart('2026-10-21')).toBe('2026-10-19')
    expect(getWeekStart('2026-10-19')).toBe('2026-10-19')
    expect(getWeekStart('2026-10-25')).toBe('2026-10-19')
  })

  it('handles a week that crosses a year boundary', () => {
    expect(getWeekStart('2026-01-01')).toBe('2025-12-29')
  })
})

describe('computeWeeklyStats', () => {
  it('counts this week’s Done cards and tracks remaining through today', () => {
    const board: BoardState = {
      columns: [
        {
          id: 'backlog',
          title: 'Backlog',
          accent: '',
          cardIds: ['open-1', 'reopened'],
          wipLimit: null,
        },
        {
          id: 'in-progress',
          title: 'In Progress',
          accent: '',
          cardIds: ['open-2'],
          wipLimit: null,
        },
        { id: 'review', title: 'Review', accent: '', cardIds: [], wipLimit: null },
        {
          id: 'done',
          title: 'Done',
          accent: '',
          cardIds: ['mon', 'tue', 'wed', 'last-week'],
          wipLimit: null,
        },
      ],
      cards: {
        'open-1': makeCard('open-1', null),
        reopened: makeCard('reopened', '2026-10-20'),
        'open-2': makeCard('open-2', null),
        mon: makeCard('mon', '2026-10-19'),
        tue: makeCard('tue', '2026-10-20'),
        wed: makeCard('wed', '2026-10-21'),
        'last-week': makeCard('last-week', '2026-10-18'),
      },
      nextCardNumber: 1,
    }

    const stats = computeWeeklyStats(board, '2026-10-21')
    expect(stats).toMatchObject({
      weekStart: '2026-10-19',
      weekEnd: '2026-10-25',
      scope: 6,
      completedThisWeek: 3,
      remaining: 3,
    })
    expect(stats.days.map(({ key, label, completed, remaining }) => ({
      key,
      label,
      completed,
      remaining,
    }))).toEqual([
      { key: '2026-10-19', label: 'Mon', completed: 1, remaining: 5 },
      { key: '2026-10-20', label: 'Tue', completed: 1, remaining: 4 },
      { key: '2026-10-21', label: 'Wed', completed: 1, remaining: 3 },
      { key: '2026-10-22', label: 'Thu', completed: 0, remaining: null },
      { key: '2026-10-23', label: 'Fri', completed: 0, remaining: null },
      { key: '2026-10-24', label: 'Sat', completed: 0, remaining: null },
      { key: '2026-10-25', label: 'Sun', completed: 0, remaining: null },
    ])
  })

  it('returns a flat zero burndown for an empty board', () => {
    const board: BoardState = {
      columns: [
        { id: 'backlog', title: 'Backlog', accent: '', cardIds: [], wipLimit: null },
        { id: 'in-progress', title: 'In Progress', accent: '', cardIds: [], wipLimit: null },
        { id: 'review', title: 'Review', accent: '', cardIds: [], wipLimit: null },
        { id: 'done', title: 'Done', accent: '', cardIds: [], wipLimit: null },
      ],
      cards: {},
      nextCardNumber: 1,
    }
    const stats = computeWeeklyStats(board, '2026-10-21')
    expect(stats.scope).toBe(0)
    expect(stats.remaining).toBe(0)
    expect(stats.days.map((day) => day.remaining)).toEqual([
      0,
      0,
      0,
      null,
      null,
      null,
      null,
    ])
  })
})
