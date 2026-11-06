import { STORY_POINT_OPTIONS, formatStoryPoints } from '../storyPoints'
import { Icon } from './Icon'

interface StoryPointsFieldProps {
  value: number | null
  onChange: (value: number | null) => void
}

export function StoryPointsField({ value, onChange }: StoryPointsFieldProps) {
  return (
    <div className="property-field">
      <label htmlFor="issue-story-points">Estimate</label>
      <div className="select-wrap">
        <Icon name="signal" size={14} />
        <select
          id="issue-story-points"
          value={value ?? ''}
          onChange={(event) =>
            onChange(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">No estimate</option>
          {STORY_POINT_OPTIONS.map((points) => (
            <option key={points} value={points}>
              {formatStoryPoints(points)}
            </option>
          ))}
        </select>
        <Icon name="down" size={12} />
      </div>
    </div>
  )
}
