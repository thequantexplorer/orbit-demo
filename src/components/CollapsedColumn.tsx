import { useDroppable } from '@dnd-kit/core'
import type { Column } from '../types'
import { Icon, StatusIcon } from './Icon'

interface CollapsedColumnProps {
  column: Column
  cardCount: number
  isDropTarget: boolean
  onExpand: () => void
}

export function CollapsedColumn({
  column,
  cardCount,
  isDropTarget,
  onExpand,
}: CollapsedColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: 'column' },
  })

  return (
    <section
      ref={setNodeRef}
      className={`column column--collapsed${isDropTarget ? ' column--drop-target' : ''}`}
      data-column-id={column.id}
      data-collapsed="true"
      aria-label={`${column.title} column (collapsed)`}
    >
      <button
        className="column__strip"
        aria-label={`Expand ${column.title} column`}
        aria-expanded="false"
        title={`Expand ${column.title}`}
        onClick={onExpand}
      >
        <Icon name="chevron" size={13} className="column__strip-chevron" />
        <StatusIcon status={column.id} />
        <span className="column__strip-title">{column.title}</span>
        <span className="column__count" data-testid={`count-${column.id}`}>
          {cardCount}
        </span>
      </button>
    </section>
  )
}
