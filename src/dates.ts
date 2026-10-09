export function parseDay(s: string): Date {
  const [year, month, day] = s.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDay(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function addDays(d: Date, days: number): Date {
  const result = new Date(d)
  result.setDate(result.getDate() + days)
  return result
}

export function formatDueLabel(dueDate: string): string {
  return parseDay(dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function startOfWeek(d: Date): Date {
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - s.getDay() + 1)
  return s
}

export function isDueThisWeek(dueDate: string, now: Date = new Date()): boolean {
  const start = startOfWeek(now)
  const due = parseDay(dueDate)
  return start <= due && due < addDays(start, 7)
}
