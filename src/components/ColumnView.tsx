import { useEffect, useRef, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'
import type { Card, Column } from '../types'
import { isOverWipLimit } from '../boardReducer'
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
  const activeIndex = activeCardId
    ? cards.findIndex((card) => card.id === activeCardId)
    : -1
  const focusedIndex = focusedCardId
    ? cards.findIndex((card) => card.id === focusedCardId)
    : -1
  const [editingWip, setEditingWip] = useState(false)
  const [wipDraft, setWipDraft] = useState('')
  const editingWipRef = useRef(false)
  const overWipLimit = isOverWipLimit(column)

  function finishWipEdit(value: string, commit: boolean) {
    if (!editingWipRef.current) return
    editingWipRef.current = false
    setEditingWip(false)
    if (!commit) return

    const trimmed = value.trim()
    if (!trimmed) {
      onSetWipLimit(null)
      return
    }
    const limit = Number(trimmed)
    if (Number.isInteger(limit) && limit > 0) onSetWipLimit(limit)
  }

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
      className={`column${isDropTarget ? ' column--drop-target' : ''}`}
      data-column-id={column.id}
      aria-label={`${column.title} column`}
    >
      <header
        className={`column__header${overWipLimit ? ' column__header--over-limit' : ''}`}
        data-over-limit={overWipLimit ? 'true' : undefined}
        title={
          overWipLimit
            ? `Over WIP limit: ${column.cardIds.length} of ${column.wipLimit}`
            : undefined
        }
      >
        <StatusIcon status={column.id} />
        <h2 className="column__title">{column.title}</h2>
        <span className="column__count" data-testid={`count-${column.id}`}>
          {cards.length}
        </span>
        {editingWip ? (
          <input
            autoFocus
            className="column__wip-input"
            type="number"
            min={1}
            aria-label={`WIP limit for ${column.title}`}
            value={wipDraft}
            onChange={(event) => setWipDraft(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Enter') {
                event.preventDefault()
                finishWipEdit(event.currentTarget.value, true)
              } else if (event.key === 'Escape') {
                event.preventDefault()
                finishWipEdit(event.currentTarget.value, false)
              }
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onBlur={(event) =>
              finishWipEdit(event.currentTarget.value, true)
            }
          />
        ) : (
          <button
            className={`column__wip${column.wipLimit === null ? ' column__wip--unset' : ''}`}
            type="button"
            data-testid={`wip-${column.id}`}
            aria-label={`WIP limit for ${column.title}`}
            title="Set WIP limit"
            onClick={() => {
              editingWipRef.current = true
              setWipDraft(
                column.wipLimit === null ? '' : String(column.wipLimit),
              )
              setEditingWip(true)
            }}
          >
            {column.wipLimit === null ? 'WIP' : `/ ${column.wipLimit}`}
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

      <AddCardForm columnTitle={column.title} onAdd={onAddCard} />
    </section>
  )
}
