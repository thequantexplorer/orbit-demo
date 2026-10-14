import type { Column } from './types'

export const MAX_WIP_LIMIT = 999

/** True for a usable WIP limit: an integer from 1 to MAX_WIP_LIMIT. */
export function isValidWipLimit(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_WIP_LIMIT
  )
}

/** True when the column has a limit and its card count has reached it. */
export function isColumnFull(
  column: Pick<Column, 'cardIds' | 'wipLimit'>,
): boolean {
  return column.wipLimit !== null && column.cardIds.length >= column.wipLimit
}

/** Short explanation shown when a full column blocks a card. */
export function wipLimitMessage(column: Column): string {
  return `${column.title} is at its WIP limit (${column.cardIds.length} / ${column.wipLimit}). Move an issue out or raise the limit first.`
}
