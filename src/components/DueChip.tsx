import { getDueChip } from '../dueDate'
import { Icon } from './Icon'

export function DueChip({ dueDate }: { dueDate?: string | null }) {
  const chip = getDueChip(dueDate)
  if (!chip) return null
  return (
    <span className={`due-chip due-chip--${chip.status}`} title={chip.title}>
      <Icon name="calendar" size={10} />
      {chip.label}
      {chip.status !== 'upcoming' && (
        <span className="visually-hidden">, {chip.title.replace(/^Due/, 'due')}</span>
      )}
    </span>
  )
}
