import { useState, type FormEvent } from 'react'
import { Icon } from './Icon'

interface AddCardFormProps {
  columnTitle: string
  onAdd: (title: string) => void
  /** Shown instead of the input when the column can't take new cards. */
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
    >
      <Icon name="plus" size={14} />
      <input
        id={`add-${columnTitle.replaceAll(' ', '-').toLowerCase()}`}
        className="add-card__input"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={blockedReason ?? 'Add a card…'}
        aria-label={`Add a card to ${columnTitle}`}
        aria-describedby={
          blockedReason
            ? `add-${columnTitle.replaceAll(' ', '-').toLowerCase()}-blocked`
            : undefined
        }
        title={blockedReason}
        readOnly={Boolean(blockedReason)}
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
      {blockedReason && (
        <span
          id={`add-${columnTitle.replaceAll(' ', '-').toLowerCase()}-blocked`}
          className="visually-hidden"
        >
          {blockedReason}
        </span>
      )}
    </form>
  )
}
