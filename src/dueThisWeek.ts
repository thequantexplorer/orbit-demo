import { isDueWithinDays } from './dueDate'
import type { Card } from './types'

/**
 * Counts the cards due within the next 7 days and, when `enabled`, keeps only
 * those cards in each column.
 */
export function applyDueThisWeek<T extends { cards: Card[] }>(
  columns: T[],
  enabled: boolean,
  todayKey: string,
): { columns: T[]; count: number } {
  const dueColumns = columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) =>
      isDueWithinDays(card.dueDate, todayKey),
    ),
  }))
  const count = dueColumns.reduce(
    (sum, column) => sum + column.cards.length,
    0,
  )
  return { columns: enabled ? dueColumns : columns, count }
}
