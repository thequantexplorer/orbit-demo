import { isValidPriority, PRIORITY_NAMES, PRIORITY_ORDER } from '../priority'
import type { Priority } from '../types'
import { Icon } from './Icon'
import { PriorityFlag } from './PriorityFlag'

interface PriorityFieldProps {
  value: Priority | null
  onChange: (priority: Priority | null) => void
}

export function PriorityField({ value, onChange }: PriorityFieldProps) {
  return (
    <div className="property-field">
      <label htmlFor="issue-priority">Priority</label>
      <div className="select-wrap">
        {value ? (
          <PriorityFlag priority={value} size={14} />
        ) : (
          <Icon name="flag" size={14} />
        )}
        <select
          id="issue-priority"
          value={value ?? ''}
          onChange={(event) => {
            const next = event.target.value
            onChange(isValidPriority(next) ? next : null)
          }}
        >
          <option value="">No priority</option>
          {PRIORITY_ORDER.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_NAMES[priority]}
            </option>
          ))}
        </select>
        <Icon name="down" size={12} />
      </div>
    </div>
  )
}
