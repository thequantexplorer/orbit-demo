import { isValidDueDate } from './dueDate'
import type { BoardState, Card } from './types'

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
  const cards: Record<string, Card> = {}
  for (const [id, card] of Object.entries(board.cards)) {
    cards[id] = {
      ...card,
      dueDate: isValidDueDate(card.dueDate) ? card.dueDate : null,
      completedAt: isValidDueDate(card.completedAt) ? card.completedAt : null,
    }
  }
  return { ...board, cards }
}
