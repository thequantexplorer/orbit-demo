import { memo, useCallback, useMemo, type KeyboardEvent } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card } from '../types'
import { CardView } from './CardView'

const CARD_DATA = { type: 'card' }

interface SortableCardProps {
  card: Card
  onOpen: (cardId: string) => void
}

export const SortableCard = memo(function SortableCard({
  card,
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
    data: CARD_DATA,
  })

  const transformValue = CSS.Translate.toString(transform)
  const style = useMemo(
    () => ({ transform: transformValue, transition }),
    [transformValue, transition],
  )
  const handleClick = useCallback(() => {
    if (!isDragging) onOpen(card.id)
  }, [isDragging, onOpen, card.id])
  const onListenerKeyDown = listeners?.onKeyDown
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' && !isDragging) onOpen(card.id)
      else onListenerKeyDown?.(event)
    },
    [isDragging, onOpen, card.id, onListenerKeyDown],
  )

  return (
    <CardView
      ref={setNodeRef}
      card={card}
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
