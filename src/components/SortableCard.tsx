import { memo, useCallback, useMemo, type KeyboardEvent } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../types'
import { CardView } from './CardView'

interface SortableCardProps {
  card: Card
  todayKey: string
  onOpen: (cardId: string) => void
}

const SORTABLE_DATA = { type: 'card' }

export const SortableCard = memo(function SortableCard({
  card,
  todayKey,
  onOpen,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: SORTABLE_DATA,
  })

  const translate = CSS.Translate.toString(transform)
  const style = useMemo(
    () => ({ transform: translate, transition }),
    [translate, transition],
  )
  const handleClick = useCallback(() => {
    if (!isDragging) onOpen(card.id)
  }, [isDragging, onOpen, card.id])
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' && !isDragging) onOpen(card.id)
      else listeners?.onKeyDown?.(event)
    },
    [isDragging, onOpen, card.id, listeners],
  )

  return (
    <CardView
      ref={setNodeRef}
      card={card}
      todayKey={todayKey}
      dragging={isDragging}
      style={style}
      {...attributes}
      {...listeners}
      aria-label={`${card.id} ${card.title}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    />
  )
})
