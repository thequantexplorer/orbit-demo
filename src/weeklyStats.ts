import { fromDateKey, toDateKey } from './dueDate'
import type { BoardState } from './types'

export interface BurndownDay {
  day: string
  label: string
  remaining: number | null
  ideal: number
  completed: number
  future: boolean
}

export interface WeeklyStats {
  weekStart: string
  weekEnd: string
  startRemaining: number
  days: BurndownDay[]
  completed: number
  added: number
  remaining: number
  dailyAverage: number
  previousCompleted: number
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function addDays(dayKey: string, amount: number): string {
  const date = fromDateKey(dayKey)
  date.setDate(date.getDate() + amount)
  return toDateKey(date)
}

export function startOfWeek(dayKey: string): string {
  const date = fromDateKey(dayKey)
  const daysSinceMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - daysSinceMonday)
  return toDateKey(date)
}

function remainingAt(board: BoardState, day: string, todayKey: string): number {
  const openNow = board.columns
    .filter((column) => column.id !== 'done')
    .reduce((total, column) => total + column.cardIds.length, 0)
  const laterDelta = Object.entries(board.history).reduce(
    (total, [key, activity]) => {
      if (key <= day || key > todayKey) return total
      return (
        total +
        activity.added +
        activity.reopened -
        activity.completed -
        activity.removed
      )
    },
    0,
  )
  return Math.max(0, openNow - laterDelta)
}

function netCompleted(board: BoardState, day: string): number {
  const activity = board.history[day]
  return (activity?.completed ?? 0) - (activity?.reopened ?? 0)
}

function weekCompleted(
  board: BoardState,
  weekStart: string,
  todayKey: string,
): number {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
    .filter((day) => day <= todayKey)
    .reduce((total, day) => total + netCompleted(board, day), 0)
}

export function getWeeklyStats(
  board: BoardState,
  todayKey: string,
  weekOffset = 0,
): WeeklyStats {
  const weekStart = addDays(startOfWeek(todayKey), weekOffset * 7)
  const weekEnd = addDays(weekStart, 6)
  const startRemaining = remainingAt(board, addDays(weekStart, -1), todayKey)
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index)
    const future = day > todayKey
    return {
      day,
      label: DAY_LABELS[fromDateKey(day).getDay()],
      remaining: future ? null : remainingAt(board, day, todayKey),
      ideal: startRemaining * (1 - (index + 1) / 7),
      completed: future ? 0 : netCompleted(board, day),
      future,
    }
  })
  const completed = days.reduce((total, day) => total + day.completed, 0)
  const added = days.reduce(
    (total, day) =>
      total + (day.future ? 0 : (board.history[day.day]?.added ?? 0)),
    0,
  )
  const elapsedDays = Math.max(1, days.filter((day) => !day.future).length)
  const remainingDay = weekEnd > todayKey ? todayKey : weekEnd

  return {
    weekStart,
    weekEnd,
    startRemaining,
    days,
    completed,
    added,
    remaining: remainingAt(board, remainingDay, todayKey),
    dailyAverage: Math.round((completed / elapsedDays) * 10) / 10,
    previousCompleted: weekCompleted(
      board,
      addDays(weekStart, -7),
      todayKey,
    ),
  }
}
