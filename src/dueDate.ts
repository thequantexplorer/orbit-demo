const DUE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export type DueStatus = 'upcoming' | 'today' | 'overdue'

export interface DueChip {
  status: DueStatus
  label: string
  title: string
}

/** True for a real calendar date in `YYYY-MM-DD` form. */
export function isValidDueDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = DUE_DATE_PATTERN.exec(value)
  if (!match) return false
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/** The local calendar day of `date` as `YYYY-MM-DD`. */
export function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = String(date.getFullYear()).padStart(4, '0')
  return `${year}-${month}-${day}`
}

/** Local midnight of a `YYYY-MM-DD` day. */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return date
}

export function formatDueDate(
  dueDate: string,
  today: Date = new Date(),
  { withYear = false } = {},
): string {
  const [year, month, day] = dueDate.split('-').map(Number)
  const label = `${MONTHS[month - 1]} ${day}`
  return withYear || year !== today.getFullYear() ? `${label}, ${year}` : label
}

export function getDueChip(
  dueDate: string | null | undefined,
  today: Date = new Date(),
): DueChip | null {
  if (!isValidDueDate(dueDate)) return null
  const todayKey = toDateKey(today)
  const title = `Due ${formatDueDate(dueDate, today, { withYear: true })}`
  if (dueDate < todayKey) return { status: 'overdue', label: 'Overdue', title }
  if (dueDate === todayKey) return { status: 'today', label: 'Due today', title }
  return {
    status: 'upcoming',
    label: `Due ${formatDueDate(dueDate, today)}`,
    title,
  }
}
