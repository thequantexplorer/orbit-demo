import { fromDateKey, toDateKey } from './dueDate'
import type { BoardState } from './types'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export interface BurndownDay {
  key: string
  label: string
  completed: number
  remaining: number | null
}

export interface WeeklyStats {
  weekStart: string
  weekEnd: string
  scope: number
  completedThisWeek: number
  remaining: number
  days: BurndownDay[]
}

function addCalendarDays(dayKey: string, amount: number): string {
  const date = fromDateKey(dayKey)
  date.setDate(date.getDate() + amount)
  return toDateKey(date)
}

export function getWeekStart(todayKey: string): string {
  const date = fromDateKey(todayKey)
  const daysSinceMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - daysSinceMonday)
  return toDateKey(date)
}

export function computeWeeklyStats(
  board: BoardState,
  todayKey: string,
): WeeklyStats {
  const weekStart = getWeekStart(todayKey)
  const weekEnd = addCalendarDays(weekStart, 6)
  const doneColumn = board.columns.find((column) => column.id === 'done')
  const doneIds = new Set(doneColumn?.cardIds ?? [])
  const doneCards = [...doneIds]
    .map((id) => board.cards[id])
    .filter((card) => card !== undefined)
  const completedThisWeek = doneCards.filter(
    (card) =>
      card.completedAt !== null &&
      card.completedAt >= weekStart &&
      card.completedAt <= weekEnd,
  ).length
  const remaining = Object.keys(board.cards).filter(
    (id) => !doneIds.has(id),
  ).length
  const scope = remaining + completedThisWeek
  let cumulative = 0
  const days = DAY_LABELS.map((label, index) => {
    const key = addCalendarDays(weekStart, index)
    const completed = doneCards.filter((card) => card.completedAt === key).length
    cumulative += completed
    return {
      key,
      label,
      completed,
      remaining: key > todayKey ? null : scope - cumulative,
    }
  })

  return {
    weekStart,
    weekEnd,
    scope,
    completedThisWeek,
    remaining,
    days,
  }
}
