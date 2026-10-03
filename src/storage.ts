import type { BoardState } from './types'

const STORAGE_KEY = 'kanban-board:v1'

export function loadBoard(): BoardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isBoardState(parsed) ? parsed : null
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
