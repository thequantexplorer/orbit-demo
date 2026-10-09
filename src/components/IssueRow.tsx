import { memo } from 'react'
import type { Card, ColumnId } from '../types'
import { Avatar } from './Avatar'
import { Icon, StatusIcon } from './Icon'
import { LabelPill } from './LabelPill'

interface IssueRowProps {
  card: Card
  columnId: ColumnId
  onOpen: (cardId: string) => void
}

export const IssueRow = memo(function IssueRow({
  card,
  columnId,
  onOpen,
}: IssueRowProps) {
  return (
    <button className="issue-row" onClick={() => onOpen(card.id)}>
      <span className="card__id">{card.id}</span>
      <StatusIcon status={columnId} />
      <strong>{card.title}</strong>
      <span className="issue-row__labels">
        {card.labels.map((label) => (
          <LabelPill key={label} labelId={label} />
        ))}
      </span>
      <Avatar assigneeId={card.assigneeId} />
      <Icon name="chevron" size={12} />
    </button>
  )
})
