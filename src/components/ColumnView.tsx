import { memo, useCallback, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Card, Column, ColumnId } from '../types'
import { AddCardForm } from './AddCardForm'
import { SortableCard } from './SortableCard'
import { Icon, StatusIcon } from './Icon'

interface ColumnViewProps {
  column: Column
  cards: Card[]
  todayKey: string
  isDropTarget: boolean
  onAddCard: (columnId: ColumnId, title: string) => void
  onOpenCard: (cardId: string) => void
  onClearColumn: () => void
  filtered?: boolean
}

const DROPPABLE_DATA = { type: 'column' }

export const ColumnView = memo(function ColumnView({
  column,
  cards,
  todayKey,
  isDropTarget,
  onAddCard,
  onOpenCard,
  onClearColumn,
  filtered = false,
}: ColumnViewProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: DROPPABLE_DATA,
  })
  const items = useMemo(() => cards.map((card) => card.id), [cards])
  const handleAdd = useCallback(
    (title: string) => onAddCard(column.id, title),
    [onAddCard, column.id],
  )

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
        items={items}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="column__cards">
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              todayKey={todayKey}
              onOpen={onOpenCard}
            />
          ))}
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

      <AddCardForm columnTitle={column.title} onAdd={handleAdd} />
    </section>
  )
})
