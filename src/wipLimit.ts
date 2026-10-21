/** Parses a WIP limit; empty input clears it and invalid input is undefined. */
export function parseWipLimit(input: string): number | null | undefined {
  const trimmed = input.trim()
  if (trimmed === '') return null
  if (!/^\d+$/.test(trimmed)) return undefined
  const limit = Number(trimmed)
  return isValidWipLimit(limit) ? limit : undefined
}

/** True for positive integer WIP limits. */
export function isValidWipLimit(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
}

export function isOverWipLimit(count: number, limit: number | null): boolean {
  return limit !== null && count > limit
}
