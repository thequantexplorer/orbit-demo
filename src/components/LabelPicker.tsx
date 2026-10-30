import { LABELS, LABEL_ORDER } from '../data'
import type { LabelId } from '../types'
import { Icon } from './Icon'

interface LabelPickerProps {
  labels: LabelId[]
  onChange: (labels: LabelId[]) => void
}

export function LabelPicker({ labels, onChange }: LabelPickerProps) {
  function toggleLabel(labelId: LabelId) {
    onChange(
      labels.includes(labelId)
        ? labels.filter((id) => id !== labelId)
        : [...labels, labelId],
    )
  }

  return (
    <fieldset className="label-picker">
      <legend>Labels</legend>
      {LABEL_ORDER.map((labelId) => (
        <button
          key={labelId}
          type="button"
          className={`label-chip${labels.includes(labelId) ? ' label-chip--active' : ''}`}
          aria-pressed={labels.includes(labelId)}
          onClick={() => toggleLabel(labelId)}
        >
          <span
            className="label-dot"
            style={{ background: LABELS[labelId].color }}
          />
          {LABELS[labelId].name}
          {labels.includes(labelId) && <Icon name="check" size={12} />}
        </button>
      ))}
    </fieldset>
  )
}
