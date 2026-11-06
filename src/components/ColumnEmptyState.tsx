import type { ColumnId } from '../types'
import { StatusIcon } from './Icon'

export function ColumnEmptyState({
  status,
  filtered,
}: {
  status: ColumnId
  filtered: boolean
}) {
  return (
    <div className="column__empty">
      <StatusIcon status={status} />
      <span>{filtered ? 'No matching issues' : 'No issues yet'}</span>
      <small>
        {filtered
          ? 'Try another search or filter'
          : 'Drop an issue here to get started'}
      </small>
    </div>
  )
}
