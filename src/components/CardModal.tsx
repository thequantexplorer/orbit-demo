import { useState, type FormEvent } from 'react'
import { addChecklistItem } from '../checklist'
import type { Card, ChecklistItem, Column, ColumnId, LabelId } from '../types'
import { ChecklistEditor } from './ChecklistEditor'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { IssueProperties } from './IssueProperties'
import { LabelPicker } from './LabelPicker'

interface CardModalProps {
  card: Card
  columnId: ColumnId
  columns: Column[]
  creating?: boolean
  onSave: (patch: Omit<Card, 'id'>, columnId: ColumnId) => void
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
  const [checklist, setChecklist] = useState<ChecklistItem[]>(card.checklist)
  const [checklistDraft, setChecklistDraft] = useState('')
  const [status, setStatus] = useState(columnId)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    onSave(
      {
        title: title.trim(),
        description: description.trim(),
        labels,
        assigneeId,
        dueDate,
        checklist: addChecklistItem(checklist, checklistDraft),
      },
      status,
    )
    onClose()
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
          <IssueProperties
            columns={columns}
            status={status}
            assigneeId={assigneeId}
            dueDate={dueDate}
            onStatusChange={setStatus}
            onAssigneeChange={setAssigneeId}
            onDueDateChange={setDueDate}
          />
          <LabelPicker labels={labels} onChange={setLabels} />
          <ChecklistEditor
            items={checklist}
            draft={checklistDraft}
            onItemsChange={setChecklist}
            onDraftChange={setChecklistDraft}
          />
        </div>
        <footer className="modal__footer">
          {creating ? (
            <span className="modal__hint">
              Good work starts with a clear issue.
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
              disabled={!title.trim()}
            >
              {creating ? 'Create issue' : 'Save changes'} <kbd>↵</kbd>
            </button>
          </div>
        </footer>
      </form>
    </Dialog>
  )
}
