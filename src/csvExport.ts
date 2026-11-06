import { ASSIGNEES, LABELS } from './data'
import type { BoardState } from './types'

const HEADERS = ['ID', 'Title', 'Status', 'Labels', 'Assignee', 'Due date', 'Description']

export function escapeCsvField(value: string) {
  // Prefix spreadsheet formula triggers so cells are read as text.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function boardToCsv(board: BoardState) {
  const rows = board.columns.flatMap((column) =>
    column.cardIds.flatMap((id) => {
      const card = board.cards[id]
      if (!card) return []
      return [
        [
          card.id,
          card.title,
          column.title,
          card.labels.map((label) => LABELS[label]?.name ?? label).join('; '),
          card.assigneeId ? (ASSIGNEES[card.assigneeId]?.name ?? card.assigneeId) : '',
          card.dueDate ?? '',
          card.description,
        ],
      ]
    }),
  )
  return [HEADERS, ...rows]
    .map((row) => row.map(escapeCsvField).join(','))
    .join('\r\n')
}

export function csvFileName(date: Date) {
  const pad = (part: number) => String(part).padStart(2, '0')
  return `orbit-issues-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.csv`
}

export function downloadCsv(csv: string, fileName: string) {
  // The BOM makes Excel read the file as UTF-8.
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
