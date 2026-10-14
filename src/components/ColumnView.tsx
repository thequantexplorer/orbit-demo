import { useEffect, useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import type { Card, Column } from '../types'
import {
  MAX_WIP_LIMIT,
  isColumnFull,
  isValidWipLimit,
  wipLimitMessage,
} from '../wipLimit'
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
  dropBlocked: boolean
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
  activeCardId,
  showDescriptions,
  dropBlocked,
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
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null)
  const [editingWip, setEditingWip] = useState(false)
  const wipButtonRef = useRef<HTMLButtonElement | null>(null)
  const wipCommitted = useRef(false)
  const full = isColumnFull(column)
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

  function commitWipLimit(value: string) {
    if (wipCommitted.current) return
    wipCommitted.current = true
    const trimmed = value.trim()
    if (trimmed === '') {
      onSetWipLimit(null)
    } else {
      const limit = Number(trimmed)
      if (!isValidWipLimit(limit)) {
        cancelWipEdit()
        return
      }
      onSetWipLimit(limit)
    }
    setEditingWip(false)
    wipButtonRef.current?.focus()
  }

  function cancelWipEdit() {
    wipCommitted.current = true
    setEditingWip(false)
    wipButtonRef.current?.focus()
  }

  const sectionClass = `column${isDropTarget ? ' column--drop-target' : ''}${
    full ? ' column--at-limit' : ''
  }${
    column.wipLimit !== null && column.cardIds.length > column.wipLimit
      ? ' column--over-limit'
      : ''
  }${dropBlocked ? ' column--drop-blocked' : ''}`

  return (
    <section
      className={sectionClass}
      data-column-id={column.id}
      aria-label={`${column.title} column`}
    >
      <header className="column__header">
        <StatusIcon status={column.id} />
        <h2 className="column__title">{column.title}</h2>
        {editingWip ? (
          <form
            className="column__wip-form"
            onSubmit={(event) => {
              event.preventDefault()
              const input = event.currentTarget.elements.namedItem('wip')
              commitWipLimit(input instanceof HTMLInputElement ? input.value : '')
            }}
          >
            <input
              name="wip"
              type="number"
              min={1}
              max={MAX_WIP_LIMIT}
              step={1}
              inputMode="numeric"
              className="column__wip-input"
              aria-label={`WIP limit for ${column.title}`}
              placeholder="None"
              defaultValue={column.wipLimit ?? ''}
              autoFocus
              onBlur={(event) => commitWipLimit(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation()
                  cancelWipEdit()
                }
              }}
            />
          </form>
        ) : (
          <button
            type="button"
            ref={wipButtonRef}
            className="column__wip"
            aria-label={`WIP limit for ${column.title}: ${column.wipLimit ?? 'none'}. Edit`}
            title={
              column.wipLimit === null ? 'Set a WIP limit' : 'Edit WIP limit'
            }
            onClick={() => {
              wipCommitted.current = false
              setEditingWip(true)
            }}
          >
            <span className="column__count" data-testid={`count-${column.id}`}>
              {column.wipLimit !== null ? column.cardIds.length : cards.length}
            </span>
            {column.wipLimit !== null && (
              <span className="column__limit">/ {column.wipLimit}</span>
            )}
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
          title={full ? wipLimitMessage(column) : `Add to ${column.title}`}
          disabled={full}
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

      {full ? (
        <p className="column__limit-note" role="note">
          {wipLimitMessage(column)}
        </p>
      ) : (
        <AddCardForm columnTitle={column.title} onAdd={onAddCard} />
      )}
    </section>
  )
}
