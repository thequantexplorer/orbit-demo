import { useRef, type KeyboardEvent } from 'react'
import {
  addChecklistItem,
  getChecklistProgress,
  MAX_CHECKLIST_ITEM_LENGTH,
  removeChecklistItem,
  toggleChecklistItem,
} from '../checklist'
import type { ChecklistItem } from '../types'
import { Icon } from './Icon'

interface ChecklistEditorProps {
  items: ChecklistItem[]
  draft: string
  onItemsChange: (items: ChecklistItem[]) => void
  onDraftChange: (draft: string) => void
}

export function ChecklistEditor({
  items,
  draft,
  onItemsChange,
  onDraftChange,
}: ChecklistEditorProps) {
  const draftInput = useRef<HTMLInputElement>(null)
  const { done, total } = getChecklistProgress(items)

  function addDraft() {
    if (!draft.trim()) return
    onItemsChange(addChecklistItem(items, draft))
    onDraftChange('')
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    if (event.metaKey || event.ctrlKey) return
    event.preventDefault()
    addDraft()
  }

  return (
    <section className="checklist" aria-labelledby="checklist-heading">
      <div className="checklist__header">
        <h2 id="checklist-heading">Checklist</h2>
        {total > 0 && (
          <span className="checklist__count">
            {done}/{total}
          </span>
        )}
      </div>
      {total > 0 && (
        <div className="checklist__bar" aria-hidden="true">
          <span style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}
      {total > 0 && (
        <ul className="checklist__items">
          {items.map((item) => (
            <li
              key={item.id}
              className={`checklist-item${item.done ? ' checklist-item--done' : ''}`}
            >
              <label>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() =>
                    onItemsChange(toggleChecklistItem(items, item.id))
                  }
                />
                <span>{item.text}</span>
              </label>
              <button
                type="button"
                className="icon-button checklist-item__remove"
                aria-label={`Remove checklist item: ${item.text}`}
                title="Remove item"
                onClick={() => {
                  onItemsChange(removeChecklistItem(items, item.id))
                  draftInput.current?.focus()
                }}
              >
                <Icon name="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="checklist__add">
        <Icon name="plus" size={14} />
        <label htmlFor="checklist-new-item" className="visually-hidden">
          New checklist item
        </label>
        <input
          ref={draftInput}
          id="checklist-new-item"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handleDraftKeyDown}
          placeholder="Add an item…"
          maxLength={MAX_CHECKLIST_ITEM_LENGTH}
        />
        {draft.trim() && (
          <button type="button" className="button" onClick={addDraft}>
            Add
          </button>
        )}
      </div>
    </section>
  )
}
