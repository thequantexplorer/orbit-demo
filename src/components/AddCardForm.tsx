import { useState, type FormEvent } from 'react'
import { Icon } from './Icon'

interface AddCardFormProps {
  columnTitle: string
  onAdd: (title: string) => void
  disabled?: boolean
}

export function AddCardForm({
  columnTitle,
  onAdd,
  disabled = false,
}: AddCardFormProps) {
  const [title, setTitle] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (disabled) return
    const trimmed = title.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setTitle('')
  }

  return (
    <form className="add-card" onSubmit={handleSubmit}>
      <Icon name="plus" size={14} />
      <input
        id={`add-${columnTitle.replaceAll(' ', '-').toLowerCase()}`}
        className="add-card__input"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={disabled ? 'Column is at its WIP limit' : 'Add a card…'}
        aria-label={`Add a card to ${columnTitle}`}
        maxLength={200}
        disabled={disabled}
      />
      <button
        className="add-card__button"
        type="submit"
        disabled={disabled || !title.trim()}
        aria-label="Add card"
      >
        <span aria-hidden="true">↵</span>
      </button>
    </form>
  )
}
