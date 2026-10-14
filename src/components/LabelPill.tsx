import type { CSSProperties } from 'react'
import { LABELS } from '../data'
import { pastelVars } from '../palette'
import type { LabelId } from '../types'

interface LabelPillProps {
  labelId: LabelId
}

export function LabelPill({ labelId }: LabelPillProps) {
  const label = LABELS[labelId]
  return (
    <span
      className="label-pill"
      data-label={labelId}
      style={pastelVars(label.color, 'pill') as CSSProperties}
    >
      <span className="label-dot" style={{ background: label.color }} />
      {label.name}
    </span>
  )
}
