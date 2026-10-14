import { ASSIGNEES, LABELS, createSeedBoard } from './data'
import { isValidDueDate } from './dueDate'
import type { BoardState, Card, Column, ColumnId, LabelId } from './types'

const STORAGE_KEY = 'kanban-board:v1'
const CARD_NUMBER_PATTERN = /^KB-(\d+)$/
// Far below Number.MAX_SAFE_INTEGER so `nextCardNumber + 1` stays exact.
const MAX_CARD_NUMBER = 1_000_000_000

export function loadBoard(): BoardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizeBoard(JSON.parse(raw))
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

// Ids like `__proto__` or `toString` would shadow or be confused with
// `Object.prototype` members when used as keys of a plain object.
function isSafeKey(key: unknown): key is string {
  return typeof key === 'string' && key !== '' && !(key in Object.prototype)
}

function cardNumber(id: string): number | null {
  const match = CARD_NUMBER_PATTERN.exec(id)
  return match ? Number(match[1]) : null
}

function isValidNextCardNumber(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= MAX_CARD_NUMBER
  )
}

/**
 * Validates a parsed save and repairs what can be repaired unambiguously:
 * boards saved before a field existed get defaults, malformed optional fields
 * are reset, invalid cards and dangling or duplicate card ids are dropped,
 * cards missing from every column go to the backlog, and
 * `nextCardNumber` is bumped past every existing `KB-N` id. Returns `null`
 * when the columns can't be trusted, so the caller falls back to the seed.
 */
function normalizeBoard(value: unknown): BoardState | null {
  if (!isRecord(value)) return null
  if (!Array.isArray(value.columns) || !isRecord(value.cards)) return null

  const defaults = createSeedBoard().columns
  if (value.columns.length !== defaults.length) return null
  const seenColumns = new Set<ColumnId>()
  const savedColumns: { fallback: Column; raw: Record<string, unknown> }[] = []
  for (const raw of value.columns) {
    if (!isRecord(raw)) return null
    const fallback = defaults.find((column) => column.id === raw.id)
    if (!fallback || seenColumns.has(fallback.id)) return null
    seenColumns.add(fallback.id)
    savedColumns.push({ fallback, raw })
  }

  const cards: Record<string, Card> = {}
  for (const id of Object.keys(value.cards)) {
    const card = normalizeCard(id, value.cards[id])
    if (card) cards[id] = card
  }

  const placed = new Set<string>()
  const columns: Column[] = savedColumns.map(({ fallback, raw }) => {
    const cardIds: string[] = []
    if (Array.isArray(raw.cardIds)) {
      for (const id of raw.cardIds) {
        if (typeof id !== 'string' || !hasOwn(cards, id) || placed.has(id)) {
          continue
        }
        placed.add(id)
        cardIds.push(id)
      }
    }
    return {
      id: fallback.id,
      title: typeof raw.title === 'string' ? raw.title : fallback.title,
      accent: typeof raw.accent === 'string' ? raw.accent : fallback.accent,
      cardIds,
    }
  })
  const orphans = Object.keys(cards).filter((id) => !placed.has(id))
  columns.find((column) => column.id === 'backlog')!.cardIds.push(...orphans)

  let nextCardNumber = isValidNextCardNumber(value.nextCardNumber)
    ? value.nextCardNumber
    : 1
  for (const id of Object.keys(cards)) {
    const number = cardNumber(id)
    if (number !== null && number >= nextCardNumber) nextCardNumber = number + 1
  }

  return { columns, cards, nextCardNumber }
}

function normalizeCard(id: string, value: unknown): Card | null {
  if (!isSafeKey(id) || !isRecord(value)) return null
  if (value.id !== id || typeof value.title !== 'string') return null
  const number = cardNumber(id)
  if (number !== null && number >= MAX_CARD_NUMBER) return null

  const labels: LabelId[] = []
  if (Array.isArray(value.labels)) {
    for (const label of value.labels) {
      if (isSafeKey(label) && hasOwn(LABELS, label)) {
        const labelId = label as LabelId
        if (!labels.includes(labelId)) labels.push(labelId)
      }
    }
  }

  return {
    id,
    title: value.title,
    description: typeof value.description === 'string' ? value.description : '',
    labels,
    assigneeId:
      isSafeKey(value.assigneeId) && hasOwn(ASSIGNEES, value.assigneeId)
        ? value.assigneeId
        : null,
    dueDate: isValidDueDate(value.dueDate) ? value.dueDate : null,
  }
}
