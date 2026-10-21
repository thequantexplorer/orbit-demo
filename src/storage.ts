import { isValidDueDate } from './dueDate'
import type { BoardState, Card } from './types'
import { isValidWipLimit } from './wipLimit'

const STORAGE_KEY = 'kanban-board:v1'

export function loadBoard(): BoardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isBoardState(parsed) ? normalizeBoard(parsed) : null
  } catch {
    return null
  }
}

export function saveBoard(board: BoardState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board))
    return true
  } catch {
    return false
  }
}

export function clearBoard(): void {
  localStorage.removeItem(STORAGE_KEY)
}

function isBoardState(value: unknown): value is BoardState {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<BoardState>
  return (
    Array.isArray(candidate.columns) &&
    typeof candidate.cards === 'object' &&
    candidate.cards !== null &&
    typeof candidate.nextCardNumber === 'number'
  )
}

// Boards saved before a field existed are missing it; fill in defaults.
function normalizeBoard(board: BoardState): BoardState {
  const columns = board.columns.map((column) => ({
    ...column,
    wipLimit: isValidWipLimit(column.wipLimit) ? column.wipLimit : null,
  }))
  const cards: Record<string, Card> = {}
  for (const [id, card] of Object.entries(board.cards)) {
    cards[id] = {
      ...card,
      dueDate: isValidDueDate(card.dueDate) ? card.dueDate : null,
    }
  }
  return { ...board, columns, cards, history: normalizeHistory(board.history) }
}

function normalizeHistory(value: unknown): BoardState['history'] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }
  const history: BoardState['history'] = {}
  for (const [day, activity] of Object.entries(value)) {
    if (
      !isValidDueDate(day) ||
      typeof activity !== 'object' ||
      activity === null ||
      Array.isArray(activity)
    ) {
      continue
    }
    const counts = activity as Record<string, unknown>
    history[day] = {
      added: isNonNegativeInteger(counts.added) ? counts.added : 0,
      completed: isNonNegativeInteger(counts.completed) ? counts.completed : 0,
      reopened: isNonNegativeInteger(counts.reopened) ? counts.reopened : 0,
      removed: isNonNegativeInteger(counts.removed) ? counts.removed : 0,
    }
  }
  return history
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}
