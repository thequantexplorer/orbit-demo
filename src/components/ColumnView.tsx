import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import type { Card, Column } from '../types'
import { isColumnAtLimit } from '../boardReducer'
import { AddCardForm } from './AddCardForm'
import { SortableCard } from './SortableCard'
import { Icon, StatusIcon } from './Icon'

const CARD_GAP = 9

interface ColumnViewProps {
  column: Column
  cards: Card[]
  isDropTarget: boolean
  activeCardId: string | null
  showDescriptions: boolean
  onAddCard: (title: string) => void
  onOpenCard: (cardId: string) => void
  onClearColumn: () => void
  onSetLimit: (limit: number | null) => void
  filtered?: boolean
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
  activeCardId,
  showDescriptions,
  onAddCard,
  onOpenCard,
  onClearColumn,
  onSetLimit,
  filtered = false,
}: ColumnViewProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'column' },
  })
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null)
  const [limitDraft, setLimitDraft] = useState('')
  const atLimit = isColumnAtLimit(column)

  function handleLimitSubmit(event: FormEvent) {
    event.preventDefault()
    const parsed = Number.parseInt(limitDraft, 10)
    if (Number.isInteger(parsed) && parsed > 0) {
      onSetLimit(parsed)
      setLimitDraft('')
      document
        .querySelector<HTMLDetailsElement>(
          `[data-column-id="${column.id}"] .column__limit-editor`,
        )
        ?.removeAttribute('open')
    }
  }
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
      className={`column${isDropTarget ? ' column--drop-target' : ''}${atLimit ? ' column--at-limit' : ''}`}
      data-column-id={column.id}
      aria-label={`${column.title} column`}
    >
      <header
        className={`column__header${atLimit ? ' column__header--at-limit' : ''}`}
      >
        <StatusIcon status={column.id} />
        <h2 className="column__title">{column.title}</h2>
        <details
          className="popover popover--right column__limit-editor"
          onToggle={(event) => {
            if (event.currentTarget.open)
              setLimitDraft(column.wipLimit?.toString() ?? '')
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              event.currentTarget.open = false
          }}
        >
          <summary
            className={`column__count column__count--button${atLimit ? ' column__count--at-limit' : ''}`}
            data-testid={`count-${column.id}`}
            title={`Edit WIP limit for ${column.title}`}
            aria-label={`${column.title} WIP limit`}
          >
            {column.wipLimit !== null
              ? `${cards.length} / ${column.wipLimit}`
              : cards.length}
          </summary>
          <div className="popover-panel">
            <h3>WIP limit</h3>
            <p className="popover-hint">
              Max issues allowed in {column.title} at once.
            </p>
            <form className="limit-form" onSubmit={handleLimitSubmit}>
              <input
                className="limit-form__input"
                type="number"
                min={1}
                step={1}
                value={limitDraft}
                onChange={(event) => setLimitDraft(event.target.value)}
                placeholder="No limit"
                aria-label={`WIP limit for ${column.title}`}
                autoFocus
              />
              <button
                className="button button--primary"
                type="submit"
                disabled={
                  !limitDraft.trim() || Number.parseInt(limitDraft, 10) < 1
                }
              >
                Set
              </button>
            </form>
            {column.wipLimit !== null && (
              <button
                className="button clear-filter-button"
                onClick={() => onSetLimit(null)}
              >
                Remove limit
              </button>
            )}
          </div>
        </details>
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
          title={
            atLimit ? `${column.title} is at its WIP limit` : `Add to ${column.title}`
          }
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

      {atLimit && (
        <p className="column__limit-note" role="status">
          {column.title} is at its WIP limit ({column.wipLimit}). Move an issue
          out before adding more.
        </p>
      )}
      <AddCardForm
        columnTitle={column.title}
        onAdd={onAddCard}
        disabled={atLimit}
      />
    </section>
  )
}
