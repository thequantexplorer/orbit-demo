import type { Priority } from './types'

export const PRIORITY_ORDER: Priority[] = ['low', 'medium', 'high']

export const PRIORITY_NAMES: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export function isValidPriority(value: unknown): value is Priority {
  return PRIORITY_ORDER.includes(value as Priority)
}
