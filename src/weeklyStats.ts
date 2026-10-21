import { fromDateKey, toDateKey } from './dueDate'
import type { BoardState } from './types'

export const STATS_WINDOW_DAYS = 7
export const ARCHIVE_RETENTION_DAYS = 14

export interface DayStats {
  key: string
  completed: number
  remaining: number
}

export interface WeeklyStats {
  days: DayStats[]
  completed: number
  previousCompleted: number
  added: number
  remaining: number
  startRemaining: number
}

interface StatsRecord {
  createdAt: number
  completedAt: number
}

export function getWeeklyStats(board: BoardState, now: Date): WeeklyStats {
  const todayStart = fromDateKey(toDateKey(now))
  const firstDay = new Date(todayStart)
  firstDay.setDate(firstDay.getDate() - (STATS_WINDOW_DAYS - 1))
  const dayBounds = Array.from({ length: STATS_WINDOW_DAYS }, (_, index) => {
    const start = new Date(firstDay)
    start.setDate(start.getDate() + index)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return { key: toDateKey(start), start: start.getTime(), end: end.getTime() }
  })
  const windowStart = dayBounds[0].start
  const windowEnd = dayBounds[dayBounds.length - 1].end
  const previousStart = new Date(windowStart)
  previousStart.setDate(previousStart.getDate() - STATS_WINDOW_DAYS)
  const previousStartTime = previousStart.getTime()
  const doneIds = new Set(
    board.columns.find((column) => column.id === 'done')?.cardIds ?? [],
  )
  const records: StatsRecord[] = Object.values(board.cards).map((card) => ({
    createdAt: card.createdAt ?? Number.NEGATIVE_INFINITY,
    completedAt: doneIds.has(card.id)
      ? (card.completedAt ?? Number.NEGATIVE_INFINITY)
      : Number.POSITIVE_INFINITY,
  }))
  for (const completion of board.archivedCompletions) {
    records.push({
      createdAt: completion.createdAt ?? Number.NEGATIVE_INFINITY,
      completedAt: completion.completedAt,
    })
  }

  const days: DayStats[] = dayBounds.map(({ key }) => ({
    key,
    completed: 0,
    remaining: 0,
  }))
  let previousCompleted = 0
  let added = 0
  let startRemaining = 0

  for (const record of records) {
    const { createdAt, completedAt } = record
    if (
      completedAt >= previousStartTime &&
      completedAt < windowStart
    )
      previousCompleted++
    if (createdAt >= windowStart && createdAt < windowEnd) added++
    if (createdAt < windowStart && completedAt >= windowStart)
      startRemaining++

    for (let index = 0; index < dayBounds.length; index++) {
      const { start, end } = dayBounds[index]
      if (completedAt >= start && completedAt < end) days[index].completed++
      if (createdAt < end && completedAt >= end) days[index].remaining++
    }
  }

  const completed = days.reduce((sum, day) => sum + day.completed, 0)
  const remaining = days[days.length - 1].remaining
  return {
    days,
    completed,
    previousCompleted,
    added,
    remaining,
    startRemaining,
  }
}
