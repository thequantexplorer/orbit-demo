import { LABELS } from '../data'
import type { LabelId } from '../types'

interface LabelPillProps {
  labelId: LabelId
}

export function LabelPill({ labelId }: LabelPillProps) {
  const label = LABELS[labelId]
  return (
    <span className="label-pill" title={label.name}>
      <span className="label-dot" style={{ background: label.color }} />
      <span className="label-pill__name">{label.name}</span>
    </span>
  )
}
