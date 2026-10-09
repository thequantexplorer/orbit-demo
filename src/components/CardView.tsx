import { memo, useMemo, type HTMLAttributes, type Ref } from 'react'
import { fromDateKey, getDueChip } from '../dueDate'
import { useTodayKey } from '../useToday'
import type { Card } from '../types'
import { Avatar } from './Avatar'
import { LabelPill } from './LabelPill'
import { Icon } from './Icon'

interface CardViewProps extends HTMLAttributes<HTMLElement> {
  card: Card
  ref?: Ref<HTMLElement>
  dragging?: boolean
  overlay?: boolean
}

export const CardView = memo(function CardView({
  card,
  ref,
  dragging = false,
  overlay = false,
  className = '',
  ...rest
}: CardViewProps) {
  const classes = [
    'card',
    dragging && 'card--placeholder',
    overlay && 'card--overlay',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article ref={ref} className={classes} data-card-id={card.id} {...rest}>
      <CardContent card={card} />
    </article>
  )
})

// Separate from the <article> so drag style/transition changes on the wrapper
// don't re-render the card's contents.
const CardContent = memo(function CardContent({ card }: { card: Card }) {
  const todayKey = useTodayKey()
  const dueChip = useMemo(
    () => getDueChip(card.dueDate, fromDateKey(todayKey)),
    [card.dueDate, todayKey],
  )

  return (
    <>
      <div className="card__topline">
        <span className="card__id">{card.id}</span>
        {card.labels.includes('urgent') ? (
          <span className="priority priority--urgent" title="Urgent">
            !
          </span>
        ) : (
          <Icon name="signal" size={13} className="card__priority" />
        )}
      </div>
      <h3 className="card__title">{card.title}</h3>
      {card.description && (
        <p className="card__description">{card.description}</p>
      )}
      <div className="card__footer">
        <div className="card__labels">
          {dueChip && (
            <span
              className={`due-chip due-chip--${dueChip.status}`}
              title={dueChip.title}
            >
              <Icon name="calendar" size={10} />
              {dueChip.label}
            </span>
          )}
          {card.labels.map((labelId) => (
            <LabelPill key={labelId} labelId={labelId} />
          ))}
        </div>
        <Avatar assigneeId={card.assigneeId} />
      </div>
    </>
  )
})
