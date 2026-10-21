import { describe, expect, it } from 'vitest'
import { boardReducer } from './boardReducer'
import type { BoardState, DayActivity } from './types'
import { addDays, getWeeklyStats, startOfWeek } from './weeklyStats'

const today = '2026-10-21'

function activity(changes: Partial<DayActivity>): DayActivity {
  return {
    added: 0,
    completed: 0,
    reopened: 0,
    removed: 0,
    ...changes,
  }
}

function createBoard(): BoardState {
  return {
    columns: [
      { id: 'backlog', title: 'Backlog', accent: '', cardIds: ['a', 'b'], wipLimit: null },
      { id: 'in-progress', title: 'In Progress', accent: '', cardIds: ['c'], wipLimit: null },
      { id: 'review', title: 'Review', accent: '', cardIds: [], wipLimit: null },
      { id: 'done', title: 'Done', accent: '', cardIds: ['d'], wipLimit: null },
    ],
    cards: {},
    nextCardNumber: 1,
    history: {
      '2026-10-12': activity({ completed: 2 }),
      '2026-10-17': activity({ completed: 1, reopened: 1 }),
      '2026-10-18': activity({ completed: 3, reopened: 1 }),
      '2026-10-19': activity({ added: 1, completed: 1 }),
      '2026-10-20': activity({ completed: 2, reopened: 1 }),
      '2026-10-21': activity({ added: 1, completed: 1 }),
    },
  }
}

describe('addDays', () => {
  it('uses calendar-day arithmetic across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09')
  })
})

describe('startOfWeek', () => {
  it('keeps Monday and moves Sunday back to the previous Monday', () => {
    expect(startOfWeek('2026-10-19')).toBe('2026-10-19')
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19')
  })

  it('handles a week spanning a month and year boundary', () => {
    expect(startOfWeek('2026-01-01')).toBe('2025-12-29')
  })
})

describe('getWeeklyStats', () => {
  it('back-computes remaining issues and returns weekly summary and chart data', () => {
    const stats = getWeeklyStats(createBoard(), today)

    expect(stats.weekStart).toBe('2026-10-19')
    expect(stats.weekEnd).toBe('2026-10-25')
    expect(stats.startRemaining).toBe(4)
    expect(stats.completed).toBe(3)
    expect(stats.added).toBe(2)
    expect(stats.remaining).toBe(3)
    expect(stats.dailyAverage).toBe(1)
    expect(stats.days).toHaveLength(7)
    expect(stats.days.slice(0, 3).map((day) => day.remaining)).toEqual([
      4, 3, 3,
    ])
    expect(stats.days[0]).toMatchObject({
      day: '2026-10-19',
      label: 'Mon',
      ideal: 4 * (1 - 1 / 7),
      completed: 1,
      future: false,
    })
    expect(stats.days[6]).toMatchObject({
      day: '2026-10-25',
      label: 'Sun',
      remaining: null,
      ideal: 0,
      completed: 0,
      future: true,
    })
    expect(stats.days.slice(3).every((day) => day.remaining === null)).toBe(true)
  })

  it('uses net completions and reports the previous week', () => {
    const board = createBoard()
    const stats = getWeeklyStats(board, today)
    const lastWeek = getWeeklyStats(board, today, -1)

    expect(stats.days[1].completed).toBe(1)
    expect(stats.previousCompleted).toBe(4)
    expect(lastWeek.completed).toBe(4)
  })

  it('keeps weekly stats unchanged when Done is cleared', () => {
    const board = createBoard()
    const before = getWeeklyStats(board, today)
    const cleared = boardReducer(board, {
      type: 'clear-column',
      columnId: 'done',
    })

    expect(getWeeklyStats(cleared, today)).toEqual(before)
  })
})
