import { useId } from 'react'
import { focusCollapseToggle } from '../columnCollapse'
import type { Column } from '../types'
import { isOverWipLimit } from '../wipLimit'
import { Icon } from './Icon'

interface ColumnRailProps {
  column: Column
  /** Number of cards shown for this column (after search/filters). */
  count: number
  /** A card is being dragged; the rail is not a drop target. */
  dragging: boolean
  onToggle: () => void
}

export function ColumnRail({
  column,
  count,
  dragging,
  onToggle,
}: ColumnRailProps) {
  const descriptionId = useId()
  const overLimit = isOverWipLimit(column.cardIds.length, column.wipLimit)
  const description = `${count} ${count === 1 ? 'issue' : 'issues'}${
    overLimit ? `, over WIP limit of ${column.wipLimit}` : ''
  }`
  const classes = [
    'column-rail',
    overLimit && 'column-rail--over-limit',
    dragging && 'column-rail--inert',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={classes}
      data-column-id={column.id}
      data-collapse-toggle={column.id}
      data-over-limit={overLimit ? 'true' : undefined}
      aria-label={`Expand ${column.title}`}
      aria-expanded="false"
      aria-describedby={descriptionId}
      title={`Expand ${column.title} (${description})`}
      onClick={() => {
        onToggle()
        focusCollapseToggle(column.id)
      }}
    >
      <Icon name="expand" size={14} className="column-rail__icon" />
      <span
        className="column-rail__dot"
        style={{ background: column.accent }}
        aria-hidden="true"
      />
      <span className="column-rail__title" aria-hidden="true">
        {column.title}
      </span>
      <span
        className="column-rail__count"
        data-testid={`count-${column.id}`}
        aria-hidden="true"
      >
        {count}
      </span>
      <span id={descriptionId} hidden>
        {description}
      </span>
    </button>
  )
}
