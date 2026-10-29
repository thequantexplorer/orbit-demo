import { focusCollapseToggle } from '../columnCollapse'
import type { Column } from '../types'
import { Icon } from './Icon'

interface ColumnCollapseButtonProps {
  column: Column
  onToggle: () => void
}

export function ColumnCollapseButton({
  column,
  onToggle,
}: ColumnCollapseButtonProps) {
  return (
    <button
      className="icon-button column__collapse"
      data-collapse-toggle={column.id}
      aria-label={`Collapse ${column.title}`}
      aria-expanded="true"
      title={`Collapse ${column.title}`}
      onClick={() => {
        onToggle()
        focusCollapseToggle(column.id)
      }}
    >
      <Icon name="collapse" size={14} />
    </button>
  )
}
