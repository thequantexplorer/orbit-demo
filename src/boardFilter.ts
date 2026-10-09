import type {
  BoardState,
  Card,
  Column,
  ColumnId,
  LabelId,
  WorkspaceView,
} from './types'

export interface BoardFilter {
  query: string
  labels: LabelId[]
  assigneeId: string
  view: WorkspaceView
}

/** Visible card ids per column id, in board order. */
export type VisibleCardIds = Record<string, string[]>

type ColumnCardIds = Pick<Column, 'id' | 'cardIds'>

/** Messages from the main thread to the filter worker. */
export type FilterRequest =
  | {
      type: 'sync'
      /** Column order, or null when the columns did not change. */
      columns: ColumnCardIds[] | null
      upserts: Card[]
      removed: string[]
    }
  | { type: 'filter'; seq: number; filter: BoardFilter }

export interface FilterResponse {
  seq: number
  columns: VisibleCardIds
}

/** True when the filter shows every card, so no filtering is needed. */
export function isEmptyFilter(filter: BoardFilter) {
  return (
    !filter.query &&
    !filter.labels.length &&
    !filter.assigneeId &&
    filter.view !== 'mine' &&
    filter.view !== 'completed'
  )
}

export function matchesFilter(
  card: Card,
  columnId: ColumnId,
  filter: BoardFilter,
) {
  return (
    `${card.title} ${card.id} ${card.description}`
      .toLowerCase()
      .includes(filter.query.toLowerCase()) &&
    (!filter.labels.length ||
      filter.labels.some((label) => card.labels.includes(label))) &&
    (!filter.assigneeId || card.assigneeId === filter.assigneeId) &&
    (filter.view !== 'mine' || card.assigneeId === 'ava') &&
    (filter.view !== 'completed' || columnId === 'done')
  )
}

export function filterCardIds(
  columns: ColumnCardIds[],
  cards: Record<string, Card>,
  filter: BoardFilter,
): VisibleCardIds {
  return Object.fromEntries(
    columns.map((column) => [
      column.id,
      column.cardIds.filter((id) => {
        const card = cards[id]
        return card !== undefined && matchesFilter(card, column.id, filter)
      }),
    ]),
  )
}

/**
 * Applies a previous filter result to the current column order, so moved,
 * reordered or deleted cards stay consistent while a new result is pending.
 */
export function reconcileCardIds(
  columns: ColumnCardIds[],
  previous: VisibleCardIds,
): VisibleCardIds {
  const visible = new Set(Object.values(previous).flat())
  return Object.fromEntries(
    columns.map((column) => [
      column.id,
      column.cardIds.filter((id) => visible.has(id)),
    ]),
  )
}

/** The changes the worker needs to go from `previous` to `next`. */
export function diffBoard(
  previous: BoardState | null,
  next: BoardState,
): Extract<FilterRequest, { type: 'sync' }> | null {
  const columns =
    previous?.columns === next.columns
      ? null
      : next.columns.map(({ id, cardIds }) => ({ id, cardIds }))
  const upserts: Card[] = []
  const removed: string[] = []
  if (previous?.cards !== next.cards) {
    for (const [id, card] of Object.entries(next.cards))
      if (previous?.cards[id] !== card) upserts.push(card)
    if (previous)
      for (const id of Object.keys(previous.cards))
        if (!(id in next.cards)) removed.push(id)
  }
  if (!columns && !upserts.length && !removed.length) return null
  return { type: 'sync', columns, upserts, removed }
}
