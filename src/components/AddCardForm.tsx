import { useState, type FormEvent } from 'react'
import { Icon } from './Icon'

interface AddCardFormProps {
  columnTitle: string
  onAdd: (title: string) => void
  /** When set, adding is blocked and this explains why. */
  blockedReason?: string
}

export function AddCardForm({
  columnTitle,
  onAdd,
  blockedReason,
}: AddCardFormProps) {
  const [title, setTitle] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || blockedReason) return
    onAdd(trimmed)
    setTitle('')
  }

  return (
    <form
      className={`add-card${blockedReason ? ' add-card--blocked' : ''}`}
      onSubmit={handleSubmit}
      title={blockedReason}
    >
      <Icon name="plus" size={14} />
      <input
        id={`add-${columnTitle.replaceAll(' ', '-').toLowerCase()}`}
        className="add-card__input"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={blockedReason ?? 'Add a card…'}
        disabled={Boolean(blockedReason)}
        aria-label={`Add a card to ${columnTitle}`}
        maxLength={200}
      />
      <button
        className="add-card__button"
        type="submit"
        disabled={!title.trim() || Boolean(blockedReason)}
        aria-label="Add card"
      >
        <span aria-hidden="true">↵</span>
      </button>
    </form>
  )
}
