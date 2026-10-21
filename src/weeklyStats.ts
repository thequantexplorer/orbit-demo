import { fromDateKey, toDateKey } from './dueDate'
import type { BoardState, Card } from './types'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export interface WeeklyDay {
  key: string
  label: string
  completed: number
  remaining: number | null
}

export interface WeeklyStats {
  weekStart: string
  weekEnd: string
  days: WeeklyDay[]
  scope: number
  completedThisWeek: number
  completedToday: number
  remaining: number
}

export function addDays(key: string, days: number): string {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export function startOfWeek(key: string): string {
  const day = fromDateKey(key).getDay()
  return addDays(key, -((day + 6) % 7))
}

export function getWeeklyStats(
  board: BoardState,
  todayKey: string,
): WeeklyStats {
  const weekStart = startOfWeek(todayKey)
  const weekEnd = addDays(weekStart, 6)
  const doneCards: Card[] = []
  let open = 0

  for (const column of board.columns) {
    for (const id of column.cardIds) {
      const card = board.cards[id]
      if (!card) continue
      if (column.id === 'done') doneCards.push(card)
      else open++
    }
  }

  const inWeek = doneCards.filter(
    (card) =>
      card.completedAt !== null &&
      card.completedAt >= weekStart &&
      card.completedAt <= weekEnd,
  )
  const completedThisWeek = inWeek.length
  const days = DAY_LABELS.map((label, index) => {
    const key = addDays(weekStart, index)
    const isFuture = key > todayKey
    return {
      key,
      label,
      completed: isFuture
        ? 0
        : inWeek.filter((card) => card.completedAt === key).length,
      remaining: isFuture
        ? null
        : open +
          inWeek.filter(
            (card) => card.completedAt !== null && card.completedAt > key,
          ).length,
    }
  })

  return {
    weekStart,
    weekEnd,
    days,
    scope: open + completedThisWeek,
    completedThisWeek,
    completedToday: inWeek.filter(
      (card) => card.completedAt === todayKey,
    ).length,
    remaining: open,
  }
}
