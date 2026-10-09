export type DueStatus = 'overdue' | 'today' | 'upcoming'

export interface DueChip {
  status: DueStatus
  label: string
  title: string
}

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseDueDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const match = DATE_KEY.exec(value)
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(2000, 0, 1)
  date.setFullYear(year, month - 1, day)
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null
}

export function isDueDate(value: unknown): value is string {
  return parseDueDate(value) !== null
}

export function toDateKey(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0')
  const year = String(date.getFullYear()).padStart(4, '0')
  return `${year}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getDueStatus(dueDate: string, now = new Date()): DueStatus {
  const today = toDateKey(now)
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'today'
  return 'upcoming'
}

export function formatDueDate(dueDate: string, now = new Date()): string {
  const date = parseDueDate(dueDate)
  if (!date) return dueDate
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  })
}

export function getDueChip(
  dueDate: string | null | undefined,
  now = new Date(),
): DueChip | null {
  if (!dueDate || !isDueDate(dueDate)) return null
  const status = getDueStatus(dueDate, now)
  const formatted = formatDueDate(dueDate, now)
  const label =
    status === 'overdue'
      ? 'Overdue'
      : status === 'today'
        ? 'Due today'
        : `Due ${formatted}`
  return { status, label, title: `Due ${formatted}` }
}
