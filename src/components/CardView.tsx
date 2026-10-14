import type { HTMLAttributes, Ref } from 'react'
import { fromDateKey, getDueChip } from '../dueDate'
import { useTodayKey } from '../useToday'
import type { Card } from '../types'
import { Avatar } from './Avatar'
import { LabelPill } from './LabelPill'
import { Icon } from './Icon'

interface CardViewProps extends HTMLAttributes<HTMLDivElement> {
  card: Card
  ref?: Ref<HTMLDivElement>
  dragging?: boolean
  overlay?: boolean
}

export function CardView({
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
  const todayKey = useTodayKey()
  const dueChip = getDueChip(card.dueDate, fromDateKey(todayKey))
  const urgent = card.labels.includes('urgent')

  return (
    <div ref={ref} className={classes} data-card-id={card.id} {...rest}>
      <div className="card__heading">
        <h3 className="card__title">{card.title}</h3>
        {urgent && (
          <span className="priority priority--urgent" title="Urgent">
            !
          </span>
        )}
      </div>
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
        <span className="card__meta">
          {!urgent && <Icon name="signal" size={12} className="card__priority" />}
          <span className="card__id">{card.id}</span>
        </span>
        <Avatar assigneeId={card.assigneeId} />
      </div>
    </div>
  )
}
