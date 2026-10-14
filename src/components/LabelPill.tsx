import type { CSSProperties } from 'react'
import { LABELS } from '../data'
import type { LabelId } from '../types'

interface LabelPillProps {
  labelId: LabelId
}

export function LabelPill({ labelId }: LabelPillProps) {
  const label = LABELS[labelId]
  return (
    <span
      className="label-pill"
      style={{ '--label-color': label.color } as CSSProperties}
    >
      <span className="label-dot" style={{ background: label.color }} />
      {label.name}
    </span>
  )
}
