import { useRef } from 'react'
import { ASSIGNEES } from '../data'
import type { Column, ColumnId } from '../types'
import { Avatar } from './Avatar'
import { Icon, StatusIcon } from './Icon'

interface IssuePropertiesProps {
  columns: Column[]
  status: ColumnId
  assigneeId: string | null
  dueDate: string | null
  setStatus: (status: ColumnId) => void
  setAssigneeId: (assigneeId: string | null) => void
  setDueDate: (dueDate: string | null) => void
}

export function IssueProperties({
  columns,
  status,
  assigneeId,
  dueDate,
  setStatus,
  setAssigneeId,
  setDueDate,
}: IssuePropertiesProps) {
  const dueDateInput = useRef<HTMLInputElement>(null)

  return (
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
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.title}
              </option>
            ))}
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
  )
}
