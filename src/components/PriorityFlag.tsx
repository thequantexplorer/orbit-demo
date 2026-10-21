import { PRIORITY_NAMES } from '../priority'
import type { Priority } from '../types'
import { Icon } from './Icon'

interface PriorityFlagProps {
  priority: Priority
  size?: number
}

export function PriorityFlag({ priority, size = 12 }: PriorityFlagProps) {
  const label = `${PRIORITY_NAMES[priority]} priority`
  return (
    <span
      className={`priority-flag priority-flag--${priority}`}
      role="img"
      aria-label={label}
      title={label}
      data-priority={priority}
    >
      <Icon name="flag" size={size} />
    </span>
  )
}
