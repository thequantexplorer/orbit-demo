import { fromDateKey, toDateKey } from './dueDate'
import type { BoardState } from './types'

export interface BurndownDay {
  day: string // YYYY-MM-DD
  remaining: number | null // open cards at end of this day; null for days after today
  completed: number // done cards whose completedAt === day (0 for future days)
}

export interface WeeklyStats {
  weekStart: string // Monday YYYY-MM-DD
  days: BurndownDay[] // always 7, Mon..Sun
  scope: number // total cards on board
  startRemaining: number // scope − cards done before weekStart
  remaining: number // scope − cards currently in Done
  completedThisWeek: number
  completedLastWeek: number // done cards with completedAt in [weekStart−7d, weekStart−1d]
}

export function startOfWeek(todayKey: string): string {
  const date = fromDateKey(todayKey)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return toDateKey(date)
}

export function addDays(key: string, days: number): string {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function getWeeklyStats(
  board: BoardState,
  todayKey: string,
): WeeklyStats {
  const weekStart = startOfWeek(todayKey)
  const lastWeekStart = addDays(weekStart, -7)
  const scope = Object.keys(board.cards).length
  const completedByDay = Array<number>(7).fill(0)
  let doneCount = 0
  let doneBeforeWeek = 0
  let completedLastWeek = 0
  const doneColumn = board.columns.find((column) => column.id === 'done')
  const weekDayIndexes = new Map(
    Array.from({ length: 7 }, (_, index) => [addDays(weekStart, index), index]),
  )

  for (const cardId of doneColumn?.cardIds ?? []) {
    const card = board.cards[cardId]
    if (!card) continue
    doneCount++

    const completedAt =
      card.completedAt && card.completedAt > todayKey
        ? todayKey
        : card.completedAt
    if (!completedAt || completedAt < weekStart) {
      doneBeforeWeek++
      if (completedAt && completedAt >= lastWeekStart)
        completedLastWeek++
      continue
    }

    const dayIndex = weekDayIndexes.get(completedAt)
    if (dayIndex !== undefined) completedByDay[dayIndex]++
  }

  const startRemaining = scope - doneBeforeWeek
  let completedThroughDay = 0
  const days: BurndownDay[] = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index)
    if (day > todayKey) return { day, remaining: null, completed: 0 }
    completedThroughDay += completedByDay[index]
    return {
      day,
      remaining: startRemaining - completedThroughDay,
      completed: completedByDay[index],
    }
  })

  return {
    weekStart,
    days,
    scope,
    startRemaining,
    remaining: scope - doneCount,
    completedThisWeek: completedByDay.reduce((total, count) => total + count, 0),
    completedLastWeek,
  }
}
