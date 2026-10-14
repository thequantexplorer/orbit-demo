import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import type { Card, Column } from '../types'
import { MAX_WIP_LIMIT, isColumnFull } from '../wipLimit'
import { AddCardForm } from './AddCardForm'
import { SortableCard } from './SortableCard'
import { Icon, StatusIcon } from './Icon'

const CARD_GAP = 9

interface ColumnViewProps {
  column: Column
  cards: Card[]
  isDropTarget: boolean
  isDropBlocked?: boolean
  activeCardId: string | null
  showDescriptions: boolean
  onAddCard: (title: string) => void
  onOpenCard: (cardId: string) => void
  onClearColumn: () => void
  onSetWipLimit: (limit: number | null) => void
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
  isDropBlocked = false,
  activeCardId,
  showDescriptions,
  onAddCard,
  onOpenCard,
  onClearColumn,
  onSetWipLimit,
  filtered = false,
}: ColumnViewProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'column' },
  })
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [editingLimit, setEditingLimit] = useState(false)
  const limit = column.wipLimit
  const atLimit = isColumnFull(column)
  const blockedReason = atLimit
    ? `At WIP limit of ${limit} — move an issue out`
    : undefined

  function commitLimit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const raw = new FormData(event.currentTarget).get('wip-limit')
    const value = typeof raw === 'string' ? raw.trim() : ''
    const next = value === '' ? null : Number(value)
    if (
      next === null ||
      (Number.isInteger(next) && next >= 1 && next <= MAX_WIP_LIMIT)
    ) {
      if (next !== limit) onSetWipLimit(next)
      setEditingLimit(false)
    }
  }
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
      className={`column${isDropTarget && !isDropBlocked ? ' column--drop-target' : ''}${isDropBlocked ? ' column--drop-blocked' : ''}`}
      data-column-id={column.id}
      aria-label={`${column.title} column`}
    >
      <header
        className={`column__header${atLimit ? ' column__header--at-limit' : ''}`}
        title={atLimit ? `${column.title} is at its WIP limit` : undefined}
      >
        <StatusIcon status={column.id} />
        <h2 className="column__title">{column.title}</h2>
        <span className="column__count" data-testid={`count-${column.id}`}>
          {limit === null ? cards.length : column.cardIds.length}
        </span>
        {editingLimit ? (
          <form
            className="column__limit-form"
            onSubmit={commitLimit}
            onBlur={(event) => {
              const form = event.currentTarget
              if (form.contains(event.relatedTarget)) return
              if (form.checkValidity()) form.requestSubmit()
              else setEditingLimit(false)
            }}
          >
            <span aria-hidden="true">/</span>
            <input
              name="wip-limit"
              className="column__limit-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_WIP_LIMIT}
              step={1}
              defaultValue={limit ?? ''}
              placeholder="∞"
              aria-label={`WIP limit for ${column.title} (empty for none)`}
              autoFocus
              onFocus={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation()
                  setEditingLimit(false)
                }
              }}
            />
          </form>
        ) : (
          <button
            className={`column__limit${limit === null ? ' column__limit--unset' : ''}`}
            data-testid={`limit-${column.id}`}
            aria-label={
              limit === null
                ? `Set WIP limit for ${column.title}`
                : `Edit WIP limit for ${column.title}, ${column.cardIds.length} of ${limit}`
            }
            title={limit === null ? 'Set a WIP limit' : 'Edit WIP limit'}
            onClick={() => setEditingLimit(true)}
          >
            {limit === null ? 'Limit' : `/ ${limit}`}
          </button>
        )}
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
          title={blockedReason ?? `Add to ${column.title}`}
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

      <AddCardForm
        columnTitle={column.title}
        onAdd={onAddCard}
        blockedReason={blockedReason}
      />
    </section>
  )
}
