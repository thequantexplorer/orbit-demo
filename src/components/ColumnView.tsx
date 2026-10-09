import { useCallback, useEffect, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useVirtualizer, type Range } from '@tanstack/react-virtual'
import type { Card, Column } from '../types'
import { rangeWithPinned } from '../virtualList'
import { AddCardForm } from './AddCardForm'
import { SortableCard } from './SortableCard'
import { Icon, StatusIcon } from './Icon'

interface ColumnViewProps {
  column: Column
  cards: Card[]
  isDropTarget: boolean
  activeCardId: string | null
  showDescriptions: boolean
  onAddCard: (title: string) => void
  onOpenCard: (cardId: string) => void
  onClearColumn: () => void
  filtered?: boolean
}

export function ColumnView({
  column,
  cards,
  isDropTarget,
  activeCardId,
  showDescriptions,
  onAddCard,
  onOpenCard,
  onClearColumn,
  filtered = false,
}: ColumnViewProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'column' },
  })
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const setCardsRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollRef.current = node
      setNodeRef(node)
    },
    [setNodeRef],
  )
  const activeIndex = activeCardId
    ? cards.findIndex((card) => card.id === activeCardId)
    : -1
  // No React Compiler here; useVirtualizer re-renders on scroll itself.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (showDescriptions ? 128 : 96),
    getItemKey: (index) => cards[index].id,
    gap: 9,
    overscan: 6,
    // Keep the dragged card mounted so dnd-kit keeps tracking it.
    rangeExtractor: useCallback(
      (range: Range) => rangeWithPinned(range, activeIndex),
      [activeIndex],
    ),
  })

  // Card heights change with descriptions; drop the cached measurements.
  useEffect(() => {
    virtualizer.measure()
  }, [virtualizer, showDescriptions])

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
        items={cards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setCardsRef} className="column__cards">
          {cards.length > 0 && (
            <div
              className="column__virtual"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((item) => (
                <div
                  key={item.key}
                  ref={virtualizer.measureElement}
                  data-index={item.index}
                  className="column__virtual-item"
                  style={{ top: item.start }}
                >
                  <SortableCard card={cards[item.index]} onOpen={onOpenCard} />
                </div>
              ))}
            </div>
          )}
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
