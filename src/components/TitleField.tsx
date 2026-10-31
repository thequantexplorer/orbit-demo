import { TITLE_MAX_LENGTH, isTitleTooLong, titleLength } from '../titleLimit'

interface TitleFieldProps {
  value: string
  onChange: (value: string) => void
}

export function TitleField({ value, onChange }: TitleFieldProps) {
  const tooLong = isTitleTooLong(value)

  return (
    <div className="modal__title-field">
      <label htmlFor="modal-title" className="visually-hidden">
        Title
      </label>
      <input
        id="modal-title"
        className="modal__title-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Issue title"
        maxLength={200}
        required
        aria-invalid={tooLong}
        aria-describedby="modal-title-count"
        data-autofocus
      />
      <div
        id="modal-title-count"
        className={`modal__title-count${tooLong ? ' modal__title-count--over' : ''}`}
      >
        <span className="visually-hidden">Title length: </span>
        {titleLength(value)}/{TITLE_MAX_LENGTH}
      </div>
    </div>
  )
}
