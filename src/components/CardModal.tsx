import { useRef, useState, type FormEvent } from 'react'
import { ASSIGNEES, LABELS, LABEL_ORDER } from '../data'
import { isColumnFull } from '../wipLimit'
import type { Card, Column, ColumnId, LabelId } from '../types'
import { Avatar } from './Avatar'
import { Dialog } from './Dialog'
import { Icon, StatusIcon } from './Icon'

interface CardModalProps {
  card: Card
  columnId: ColumnId
  columns: Column[]
  creating?: boolean
  onSave: (patch: Omit<Card, 'id'>, columnId: ColumnId) => boolean
  onDelete: () => void
  onClose: () => void
}

export function CardModal({
  card,
  columnId,
  columns,
  creating = false,
  onSave,
  onDelete,
  onClose,
}: CardModalProps) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description)
  const [labels, setLabels] = useState<LabelId[]>(card.labels)
  const [assigneeId, setAssigneeId] = useState<string | null>(card.assigneeId)
  const [dueDate, setDueDate] = useState<string | null>(card.dueDate)
  const dueDateInput = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState(() => {
    if (creating) {
      const initial = columns.find((column) => column.id === columnId)
      if (initial && isColumnFull(initial)) {
        return (
          columns.find((column) => !isColumnFull(column))?.id ?? columnId
        )
      }
    }
    return columnId
  })
  const allFull = creating && columns.every((column) => isColumnFull(column))
  const [confirmDelete, setConfirmDelete] = useState(false)

  function toggleLabel(labelId: LabelId) {
    setLabels((current) =>
      current.includes(labelId)
        ? current.filter((id) => id !== labelId)
        : [...current, labelId],
    )
  }

  function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    const saved = onSave(
      {
        title: title.trim(),
        description: description.trim(),
        labels,
        assigneeId,
        dueDate,
      },
      status,
    )
    if (saved) onClose()
  }

  return (
    <Dialog
      onClose={onClose}
      labelledBy="issue-dialog-title"
      className="issue-dialog"
    >
      <form
        onSubmit={handleSave}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter')
            event.currentTarget.requestSubmit()
        }}
      >
        <header className="modal__header">
          <div className="modal__breadcrumb">
            <span className="team-icon">
              <Icon name="layers" size={12} />
            </span>{' '}
            Product <Icon name="chevron" size={12} />{' '}
            <span id="issue-dialog-title">
              {creating ? 'New issue' : card.id}
            </span>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="modal__body">
          <label htmlFor="modal-title" className="visually-hidden">
            Title
          </label>
          <input
            id="modal-title"
            className="modal__title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Issue title"
            maxLength={200}
            required
            data-autofocus
          />
          <label htmlFor="modal-description" className="visually-hidden">
            Description
          </label>
          <textarea
            id="modal-description"
            className="modal__description"
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add a description, a little context, or a big idea…"
          />
          <div className="modal__properties">
            <div className="property-field">
              <label htmlFor="issue-status">Status</label>
              <div className="select-wrap">
                <StatusIcon status={status} />
                <select
                  id="issue-status"
                  value={status}
                  onChange={(event) => {
                    const column = columns.find(
                      (entry) => entry.id === event.target.value,
                    )
                    if (column) setStatus(column.id)
                  }}
                >
                  {columns.map((column) => {
                    const blocked =
                      isColumnFull(column) &&
                      (creating || column.id !== columnId)
                    return (
                      <option
                        key={column.id}
                        value={column.id}
                        disabled={blocked}
                      >
                        {blocked
                          ? `${column.title} (at WIP limit)`
                          : column.title}
                      </option>
                    )
                  })}
                </select>
                <Icon name="down" size={12} />
              </div>
            </div>
            <div className="property-field">
              <label htmlFor="issue-assignee">Assignee</label>
              <div className="select-wrap">
                <Avatar assigneeId={assigneeId} />
                <select
                  id="issue-assignee"
                  value={assigneeId ?? ''}
                  onChange={(event) =>
                    setAssigneeId(event.target.value || null)
                  }
                >
                  <option value="">Unassigned</option>
                  {Object.values(ASSIGNEES).map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </option>
                  ))}
                </select>
                <Icon name="down" size={12} />
              </div>
            </div>
            <div className="property-field">
              <label htmlFor="issue-due-date">Due date</label>
              <div className="select-wrap">
                <Icon name="calendar" size={14} />
                <input
                  ref={dueDateInput}
                  id="issue-due-date"
                  type="date"
                  value={dueDate ?? ''}
                  onChange={(event) => setDueDate(event.target.value || null)}
                />
                {dueDate && (
                  <button
                    type="button"
                    className="icon-button due-date-clear"
                    aria-label="Clear due date"
                    title="Clear due date"
                    onClick={() => {
                      setDueDate(null)
                      dueDateInput.current?.focus()
                    }}
                  >
                    <Icon name="close" size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
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
        </div>
        <footer className="modal__footer">
          {creating ? (
            <span className="modal__hint">
              {allFull
                ? 'Every column is at its WIP limit.'
                : 'Good work starts with a clear issue.'}
            </span>
          ) : confirmDelete ? (
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
          ) : (
            <button
              className="icon-button delete-button"
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete issue"
              title="Delete issue"
            >
              <Icon name="trash" />
            </button>
          )}
          <div className="modal__actions">
            <button className="button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="button button--primary"
              type="submit"
              disabled={!title.trim() || allFull}
            >
              {creating ? 'Create issue' : 'Save changes'} <kbd>↵</kbd>
            </button>
          </div>
        </footer>
      </form>
    </Dialog>
  )
}
