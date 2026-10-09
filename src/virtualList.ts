import { defaultRangeExtractor, type Range } from '@tanstack/react-virtual'
import type { Card, Column, ColumnId } from './types'

/** Visible range plus `pinned` (e.g. the dragged card) so it stays mounted. */
export function rangeWithPinned(range: Range, pinned: number): number[] {
  const indexes = defaultRangeExtractor(range)
  if (pinned < 0 || pinned >= range.count || indexes.includes(pinned))
    return indexes
  return [...indexes, pinned].sort((a, b) => a - b)
}

export type ListRow =
  | { type: 'header'; key: string; column: Column; count: number }
  | { type: 'card'; key: string; columnId: ColumnId; card: Card }
  | { type: 'empty'; key: string; columnId: ColumnId }

/** Flattens grouped columns into the rows of the list layout. */
export function buildListRows(
  columns: (Column & { cards: Card[] })[],
): ListRow[] {
  return columns.flatMap((column): ListRow[] => [
    {
      type: 'header',
      key: `header-${column.id}`,
      column,
      count: column.cards.length,
    },
    ...(column.cards.length
      ? column.cards.map(
          (card): ListRow => ({
            type: 'card',
            key: card.id,
            columnId: column.id,
            card,
          }),
        )
      : [{ type: 'empty' as const, key: `empty-${column.id}`, columnId: column.id }]),
  ])
}
