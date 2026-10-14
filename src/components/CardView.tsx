import type { HTMLAttributes, Ref } from 'react'
import { formatDueDate, fromDateKey, getDueChip } from '../dueDate'
import { useTodayKey } from '../useToday'
import type { Card } from '../types'
import { Avatar } from './Avatar'
import { LabelPill } from './LabelPill'
import { Icon } from './Icon'

const DAY_MS = 86_400_000

// Terse chip text for dense cards; the chip title keeps the full date.
function shortDueLabel(dueDate: string, status: string, today: Date) {
  if (status === 'today') return 'Today'
  if (status === 'overdue') {
    const days = Math.round((today.getTime() - fromDateKey(dueDate).getTime()) / DAY_MS)
    return `${days}d late`
  }
  return formatDueDate(dueDate, today)
}

interface CardViewProps extends HTMLAttributes<HTMLElement> {
  card: Card
  ref?: Ref<HTMLElement>
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
  const today = fromDateKey(todayKey)
  const dueChip = getDueChip(card.dueDate, today)

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
      <h3 className="card__title" title={card.title}>
        {card.title}
      </h3>
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
              {card.dueDate &&
                shortDueLabel(card.dueDate, dueChip.status, today)}
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
}
