import type { CSSProperties } from 'react'
import { ASSIGNEES } from '../data'

interface AvatarProps {
  assigneeId: string | null
  size?: 'sm' | 'md'
}

export function Avatar({ assigneeId, size = 'sm' }: AvatarProps) {
  const assignee = assigneeId ? ASSIGNEES[assigneeId] : undefined
  if (!assignee) {
    return (
      <span
        className={`avatar avatar--${size} avatar--empty`}
        title="Unassigned"
        aria-label="Unassigned"
      >
        ?
      </span>
    )
  }
  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ '--avatar-color': assignee.color } as CSSProperties}
      title={assignee.name}
      aria-label={assignee.name}
    >
      {assignee.initials}
    </span>
  )
}
