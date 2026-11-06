import {
  DESCRIPTION_LIMIT,
  countCharacters,
  isOverDescriptionLimit,
} from '../descriptionLimit'

interface DescriptionFieldProps {
  value: string
  onChange: (value: string) => void
}

export function DescriptionField({ value, onChange }: DescriptionFieldProps) {
  const over = isOverDescriptionLimit(value)
  return (
    <>
      <label htmlFor="modal-description" className="visually-hidden">
        Description
      </label>
      <textarea
        id="modal-description"
        className="modal__description"
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Add a description, a little context, or a big idea…"
        aria-describedby="modal-description-count"
        aria-invalid={over || undefined}
      />
      <p
        id="modal-description-count"
        className={`modal__char-count${over ? ' modal__char-count--over' : ''}`}
        aria-live="polite"
      >
        {countCharacters(value)}/{DESCRIPTION_LIMIT}
      </p>
    </>
  )
}
