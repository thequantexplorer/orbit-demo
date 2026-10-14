import { useEffect, useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import { isColumnAtLimit, wipLimitMessage } from '../boardReducer'
import type { Card, Column } from '../types'
import { AddCardForm } from './AddCardForm'
import { SortableCard } from './SortableCard'
import { Icon, StatusIcon } from './Icon'

const CARD_GAP = 9

interface ColumnViewProps {
  column: Column
  cards: Card[]
  isDropTarget: boolean
  /** A card is being dragged over this column but it's at its WIP limit. */
  isBlockedDropTarget?: boolean
  activeCardId: string | null
  showDescriptions: boolean
  onAddCard: (title: string) => void
  onOpenCard: (cardId: string) => void
  onClearColumn: () => void
  onSetWipLimit: (limit: number | null) => void
  filtered?: boolean
}

interface WipLimitControlProps {
  column: Column
  count: number
  onSetWipLimit: (limit: number | null) => void
}

function WipLimitControl({ column, count, onSetWipLimit }: WipLimitControlProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const { wipLimit } = column
  const label = `${column.title} work-in-progress limit`

  if (draft !== null) {
    const commit = () => {
      const value = draft.trim() === '' ? null : Number(draft)
      onSetWipLimit(value)
      setDraft(null)
    }
    return (
      <span className="column__wip">
        <span className="column__count" data-testid={`count-${column.id}`}>
          {count}
        </span>
        <span className="column__limit">/</span>
        <input
          className="column__limit-input"
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          step={1}
          autoFocus
          placeholder="∞"
          aria-label={label}
          title="Leave empty for no limit"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.target.select()}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              setDraft(null)
            }
          }}
        />
      </span>
    )
  }

  return (
    <button
      type="button"
      className="column__wip column__wip-button"
      aria-label={
        wipLimit === null
          ? `Set ${label}`
          : `Edit ${label}: ${count} of ${wipLimit}`
      }
      title={wipLimit === null ? 'Set a WIP limit' : 'Edit WIP limit'}
      onClick={() => setDraft(wipLimit === null ? '' : String(wipLimit))}
    >
      <span className="column__count" data-testid={`count-${column.id}`}>
        {count}
      </span>
      {wipLimit === null ? (
        <span className="column__limit column__limit--unset">Set limit</span>
      ) : (
        <span className="column__limit">/ {wipLimit}</span>
      )}
    </button>
  )
}

// First guess before a card is measured; measured heights replace it.
function estimateCardHeight(card: Card, showDescriptions: boolean) {
  const base = showDescriptions ? 105 : 96
  const titleWrap = card.title.length > 40 ? 19 : 0
  const description = showDescriptions && card.description ? 38 : 0
  return base + titleWrap + description
}

export function ColumnView({
  column,
  cards,
  isDropTarget,
  isBlockedDropTarget = false,
  activeCardId,
  showDescriptions,
  onAddCard,
  onOpenCard,
  onClearColumn,
  onSetWipLimit,
  filtered = false,
}: ColumnViewProps) {
  const atLimit = isColumnAtLimit(column)
  const limitMessage = atLimit ? wipLimitMessage(column) : undefined
  // A limit counts every card in the column, including ones hidden by filters.
  const limitCount =
    column.wipLimit === null ? cards.length : column.cardIds.length
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'column' },
  })
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null)
  const activeIndex = activeCardId
    ? cards.findIndex((card) => card.id === activeCardId)
    : -1
  const focusedIndex = focusedCardId
    ? cards.findIndex((card) => card.id === focusedCardId)
    : -1

  // The app doesn't use React Compiler, so its auto-memoization caveat for
  // useVirtualizer's returned functions doesn't apply here.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => estimateCardHeight(cards[index], showDescriptions),
    getItemKey: (index) => cards[index].id,
    gap: CARD_GAP,
    overscan: 6,
    // Keep the active/focused card mounted; adjacent focus targets let Tab
    // reach the next card even after scrolling the focused card out of view.
    rangeExtractor: (range) => {
      const indexes = new Set(defaultRangeExtractor(range))
      if (activeIndex !== -1) indexes.add(activeIndex)
      if (focusedIndex !== -1) {
        for (let index = focusedIndex - 1; index <= focusedIndex + 1; index++) {
          if (index >= 0 && index < cards.length) indexes.add(index)
        }
      }
      return [...indexes].sort((a, b) => a - b)
    },
  })

  useEffect(() => {
    virtualizer.measure()
  }, [virtualizer, showDescriptions])

  return (
    <section
      className={`column${isDropTarget ? ' column--drop-target' : ''}${
        isBlockedDropTarget ? ' column--drop-blocked' : ''
      }${atLimit ? ' column--at-limit' : ''}`}
      data-column-id={column.id}
      aria-label={`${column.title} column`}
    >
      <header className="column__header" title={limitMessage}>
        <StatusIcon status={column.id} />
        <h2 className="column__title">{column.title}</h2>
        <WipLimitControl
          column={column}
          count={limitCount}
          onSetWipLimit={onSetWipLimit}
        />
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
          title={limitMessage ?? `Add to ${column.title}`}
          disabled={atLimit}
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
      {isBlockedDropTarget && (
        <p className="column__limit-message" role="status">
          WIP limit reached. Drop the issue in another column.
        </p>
      )}

      <SortableContext
        id={column.id}
        items={cards.map((card) => card.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={(node) => {
            setNodeRef(node)
            scrollRef.current = node
          }}
          className="column__cards"
          onFocusCapture={(event) => {
            const target = event.target.closest<HTMLElement>('[data-card-id]')
            if (target) setFocusedCardId(target.dataset.cardId ?? null)
          }}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setFocusedCardId(null)
          }}
        >
          {cards.length > 0 && (
            <div
              className="column__window"
              style={{ height: virtualizer.getTotalSize() }}
            >
              {virtualizer.getVirtualItems().map((item) => {
                const card = cards[item.index]
                return (
                  <div
                    key={card.id}
                    ref={virtualizer.measureElement}
                    className="column__item"
                    data-index={item.index}
                    style={{ transform: `translateY(${item.start}px)` }}
                  >
                    <SortableCard card={card} onOpen={onOpenCard} />
                  </div>
                )
              })}
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

      <AddCardForm
        columnTitle={column.title}
        onAdd={onAddCard}
        blockedReason={limitMessage}
      />
    </section>
  )
}
