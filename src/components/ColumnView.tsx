import { memo, startTransition, useEffect, useMemo, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Card, Column } from '../types'
import { AddCardForm } from './AddCardForm'
import { SortableCard } from './SortableCard'
import { Icon, StatusIcon } from './Icon'

interface ColumnViewProps {
  column: Column
  cards: Card[]
  isDropTarget: boolean
  onAddCard: (title: string) => void
  onOpenCard: (cardId: string) => void
  onClearColumn: () => void
  filtered?: boolean
  /** The card being dragged; it stays mounted wherever it sits. */
  activeCardId?: string | null
}

// Cards mount progressively: the first screenful right away, then one chunk
// per idle period, so the main thread never blocks on a whole column. Chunks
// are slices of the column's unfiltered order, so a filter change keeps every
// still-matching card in the same chunk (React reuses it instead of remounting).
const FIRST_CHUNK = 20
const CHUNK = 60

function chunkEnd(start: number) {
  return start === 0 ? FIRST_CHUNK : start + CHUNK
}

function alignToChunk(count: number) {
  let end = 0
  while (end < count) end = chunkEnd(end)
  return end
}

function scheduleIdle(callback: () => void) {
  if (typeof requestIdleCallback === 'function') {
    const handle = requestIdleCallback(callback, { timeout: 100 })
    return () => cancelIdleCallback(handle)
  }
  const handle = setTimeout(callback, 0)
  return () => clearTimeout(handle)
}

interface CardChunkProps {
  cardIds: string[]
  start: number
  end: number
  visible: Map<string, Card>
  onOpenCard: (cardId: string) => void
}

// Memoized so mounting the next chunk doesn't re-render the mounted ones.
const CardChunk = memo(function CardChunk({
  cardIds,
  start,
  end,
  visible,
  onOpenCard,
}: CardChunkProps) {
  const sortables = []
  for (const id of cardIds.slice(start, end)) {
    const card = visible.get(id)
    if (card)
      sortables.push(<SortableCard key={id} card={card} onOpen={onOpenCard} />)
  }
  return sortables
})

export function ColumnView({
  column,
  cards,
  isDropTarget,
  onAddCard,
  onOpenCard,
  onClearColumn,
  filtered = false,
  activeCardId = null,
}: ColumnViewProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'column' },
  })
  const [limit, setLimit] = useState(FIRST_CHUNK)
  const visibleIds = useMemo(() => cards.map((card) => card.id), [cards])
  const visible = useMemo(
    () => new Map(cards.map((card) => [card.id, card])),
    [cards],
  )
  const allIds = column.cardIds
  const firstScreen = cards.length
    ? allIds.indexOf(cards[Math.min(cards.length, FIRST_CHUNK) - 1].id) + 1
    : 0
  const activeIndex = activeCardId ? allIds.indexOf(activeCardId) : -1
  const renderLimit = Math.min(
    allIds.length,
    alignToChunk(
      Math.min(allIds.length, Math.max(limit, firstScreen, activeIndex + 1)),
    ),
  )
  const dragging = activeCardId !== null
  const streaming = limit !== Infinity

  useEffect(() => {
    if (!streaming || dragging) return
    return scheduleIdle(() =>
      startTransition(() =>
        setLimit(
          chunkEnd(renderLimit) >= allIds.length
            ? Infinity
            : chunkEnd(renderLimit),
        ),
      ),
    )
  }, [streaming, dragging, renderLimit, allIds.length])

  const chunks = []
  for (let start = 0; start < renderLimit; start = chunkEnd(start)) {
    chunks.push(
      <CardChunk
        key={start}
        cardIds={allIds}
        start={start}
        end={Math.min(renderLimit, chunkEnd(start))}
        visible={visible}
        onOpenCard={onOpenCard}
      />,
    )
  }

  return (
    <section
      className={`column${isDropTarget ? ' column--drop-target' : ''}`}
      data-column-id={column.id}
      aria-label={`${column.title} column`}
    >
      <header className="column__header">
        <StatusIcon status={column.id} />
        <h2 className="column__title">{column.title}</h2>
        <span className="column__count" data-testid={`count-${column.id}`}>
          {cards.length}
        </span>
        {column.id === 'done' && column.cardIds.length > 0 && (
          <button
            className="column__clear"
            aria-label="Clear done issues"
            title="Remove all done issues"
            onClick={onClearColumn}
          >
            Clear
          </button>
        )}
        <button
          className="icon-button column__add"
          aria-label={`New issue in ${column.title}`}
          title={`Add to ${column.title}`}
          onClick={() =>
            document
              .getElementById(
                `add-${column.title.replaceAll(' ', '-').toLowerCase()}`,
              )
              ?.focus()
          }
        >
          <Icon name="plus" size={15} />
        </button>
      </header>

      <SortableContext
        id={column.id}
        items={visibleIds}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="column__cards">
          {chunks}
          {cards.length === 0 && (
            <div className="column__empty">
              <StatusIcon status={column.id} />
              <span>{filtered ? 'No matching issues' : 'No issues yet'}</span>
              <small>
                {filtered
                  ? 'Try another search or filter'
                  : 'Drop an issue here to get started'}
              </small>
            </div>
          )}
        </div>
      </SortableContext>

      <AddCardForm columnTitle={column.title} onAdd={onAddCard} />
    </section>
  )
}
