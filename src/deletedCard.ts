import type { BoardState, Card, ColumnId } from './types'

/** A deleted card and where it lived, so it can be restored exactly. */
export interface DeletedCard {
  card: Card
  columnId: ColumnId
  index: number
}

export const UNDO_TIMEOUT_MS = 5000
const MAX_TITLE_LENGTH = 40

export function captureDeletedCard(
  board: BoardState,
  cardId: string,
): DeletedCard | null {
  const card = board.cards[cardId]
  const column = board.columns.find((column) =>
    column.cardIds.includes(cardId),
  )
  if (!card || !column) return null
  return { card, columnId: column.id, index: column.cardIds.indexOf(cardId) }
}

export function truncateTitle(title: string, max = MAX_TITLE_LENGTH): string {
  const trimmed = title.trim()
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed
}

export function deletedCardMessage(card: Card): string {
  return `Deleted ${card.id} ${truncateTitle(card.title)}`
}

type ShortcutKeys = Pick<
  KeyboardEvent,
  'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'
>

/** Ctrl/Cmd+Z outside text fields; Shift is left for redo. */
export function isUndoShortcut(event: ShortcutKeys, editing: boolean): boolean {
  return (
    !editing &&
    (event.metaKey || event.ctrlKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === 'z'
  )
}
