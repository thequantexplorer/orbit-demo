import { useState } from 'react'
import { Icon } from './Icon'

interface IssueToolsProps {
  onDelete: () => void
  onDuplicate: () => void
}

export function IssueTools({ onDelete, onDuplicate }: IssueToolsProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (confirmDelete)
    return (
      <div className="delete-confirm">
        <span>Delete this issue?</span>
        <button
          type="button"
          className="button button--danger"
          onClick={onDelete}
        >
          Delete issue
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label="Cancel deletion"
          onClick={() => setConfirmDelete(false)}
        >
          <Icon name="close" size={14} />
        </button>
      </div>
    )

  return (
    <div className="modal__tools">
      <button
        className="icon-button delete-button"
        type="button"
        onClick={() => setConfirmDelete(true)}
        aria-label="Delete issue"
        title="Delete issue"
      >
        <Icon name="trash" />
      </button>
      <button
        className="button duplicate-button"
        type="button"
        onClick={onDuplicate}
        title="Duplicate issue below the original"
      >
        <Icon name="copy" size={14} /> Duplicate
      </button>
    </div>
  )
}
