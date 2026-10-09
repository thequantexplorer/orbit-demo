import { LABEL_ORDER } from './data'
import type {
  BoardState,
  Card,
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

const searchTextCache = new WeakMap<Card, string>()

/** Lowercase text a search query is matched against, cached per card object. */
export function searchTextOf(card: Card): string {
  let text = searchTextCache.get(card)
  if (text === undefined) {
    text = `${card.title} ${card.id} ${card.description}`.toLowerCase()
    searchTextCache.set(card, text)
  }
  return text
}

function sameCards(a: Card[], b: Card[]) {
  return a.length === b.length && a.every((card, index) => card === b[index])
}

/**
 * The cards of each column that match `filter`, keyed by column id. A column
 * whose matches are unchanged keeps its array from `previous`, so memoized
 * columns and their sortable contexts can skip re-rendering.
 */
export function filterColumns(
  board: BoardState,
  filter: BoardFilter,
  previous?: Partial<Record<ColumnId, Card[]>>,
): Record<ColumnId, Card[]> {
  const query = filter.query.toLowerCase()
  const result = {} as Record<ColumnId, Card[]>
  for (const column of board.columns) {
    const cards: Card[] = []
    if (filter.view !== 'completed' || column.id === 'done') {
      for (const id of column.cardIds) {
        const card = board.cards[id]
        if (
          card &&
          (!query || searchTextOf(card).includes(query)) &&
          (!filter.labels.length ||
            filter.labels.some((label) => card.labels.includes(label))) &&
          (!filter.assigneeId || card.assigneeId === filter.assigneeId) &&
          (filter.view !== 'mine' || card.assigneeId === 'ava')
        )
          cards.push(card)
      }
    }
    const before = previous?.[column.id]
    result[column.id] = before && sameCards(before, cards) ? before : cards
  }
  return result
}

export interface CardCounts {
  labels: Record<LabelId, number>
  assignees: Record<string, number>
}

/** Per-label and per-assignee card counts in one pass over the board. */
export function countCards(cards: BoardState['cards']): CardCounts {
  const counts: CardCounts = {
    labels: Object.fromEntries(
      LABEL_ORDER.map((label) => [label, 0]),
    ) as Record<LabelId, number>,
    assignees: {},
  }
  for (const card of Object.values(cards)) {
    for (const label of new Set(card.labels))
      if (label in counts.labels) counts.labels[label] += 1
    if (card.assigneeId)
      counts.assignees[card.assigneeId] =
        (counts.assignees[card.assigneeId] ?? 0) + 1
  }
  return counts
}
