import type { Column } from './types'

export const MAX_WIP_LIMIT = 999

/** A whole number from 1 to `MAX_WIP_LIMIT`, or null for "no limit". */
export function normalizeWipLimit(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_WIP_LIMIT
    ? value
    : null
}

/** True when the column has a limit and holds that many cards or more. */
export function isColumnFull(column: Column): boolean {
  return column.wipLimit !== null && column.cardIds.length >= column.wipLimit
}
