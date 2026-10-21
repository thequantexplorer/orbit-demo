import { fromDateKey, isValidDueDate, toDateKey } from './dueDate'
import type { BoardState } from './types'

export interface WeekDay {
  key: string
  label: string
  completed: number
  remaining: number | null
  ideal: number
}

export interface WeeklyStats {
  weekStartKey: string
  weekEndKey: string
  days: WeekDay[]
  startRemaining: number
  completedThisWeek: number
  completedLastWeek: number
  remaining: number
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function computeWeeklyStats(
  board: BoardState,
  todayKey: string,
): WeeklyStats {
  const doneColumn = board.columns.find((column) => column.id === 'done')
  const remaining = board.columns
    .filter((column) => column.id !== 'done')
    .reduce((count, column) => count + column.cardIds.length, 0)
  const completions = new Map<string, number>()

  for (const cardId of doneColumn?.cardIds ?? []) {
    const completedOn = board.cards[cardId]?.completedOn
    if (!isValidDueDate(completedOn) || completedOn > todayKey) continue
    completions.set(completedOn, (completions.get(completedOn) ?? 0) + 1)
  }

  const today = fromDateKey(todayKey)
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  const weekKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return toDateKey(date)
  })
  const weekStartKey = weekKeys[0]
  const weekEndKey = weekKeys[6]
  const previousWeekStart = new Date(weekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const previousWeekStartKey = toDateKey(previousWeekStart)

  const completedThisWeek = weekKeys.reduce(
    (total, key) => total + (completions.get(key) ?? 0),
    0,
  )
  const completedLastWeek = [...completions].reduce(
    (total, [key, count]) =>
      key >= previousWeekStartKey && key < weekStartKey ? total + count : total,
    0,
  )
  const startRemaining = remaining + completedThisWeek
  let completedThroughDay = 0
  const days = weekKeys.map((key, index) => {
    const completed = completions.get(key) ?? 0
    completedThroughDay += completed
    return {
      key,
      label: WEEKDAY_LABELS[index],
      completed,
      remaining:
        key <= todayKey ? startRemaining - completedThroughDay : null,
      ideal: startRemaining * (1 - (index + 1) / 7),
    }
  })

  return {
    weekStartKey,
    weekEndKey,
    days,
    startRemaining,
    completedThisWeek,
    completedLastWeek,
    remaining,
  }
}
