import { memo, useMemo, type HTMLAttributes, type Ref } from 'react'
import { fromDateKey, getDueChip } from '../dueDate'
import type { Card } from '../types'
import { Avatar } from './Avatar'
import { LabelPill } from './LabelPill'
import { Icon } from './Icon'

interface CardViewProps extends HTMLAttributes<HTMLElement> {
  card: Card
  /** Today's `YYYY-MM-DD`, passed down so cards don't each subscribe to it. */
  todayKey: string
  ref?: Ref<HTMLElement>
  dragging?: boolean
  overlay?: boolean
}

export const CardView = memo(function CardView({
  card,
  todayKey,
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
  const dueChip = useMemo(
    () => getDueChip(card.dueDate, fromDateKey(todayKey)),
    [card.dueDate, todayKey],
  )

  return (
    <article ref={ref} className={classes} data-card-id={card.id} {...rest}>
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
    </article>
  )
})
