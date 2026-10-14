import { useRef, useState, type FormEvent } from 'react'
import { isValidWipLimit } from '../boardReducer'
import { Icon } from './Icon'

interface WipLimitEditorProps {
  columnTitle: string
  limit: number | null
  count: number
  onChange: (limit: number | null) => void
}

export function WipLimitEditor({
  columnTitle,
  limit,
  count,
  onChange,
}: WipLimitEditorProps) {
  const details = useRef<HTMLDetailsElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(limit === null ? '' : String(limit))
  const inputId = `wip-${columnTitle.replaceAll(' ', '-').toLowerCase()}`
  const parsed = draft.trim() === '' ? null : Number(draft)
  const valid = parsed === null || isValidWipLimit(parsed)

  function close() {
    if (details.current) details.current.open = false
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    onChange(parsed)
    close()
  }

  return (
    <details
      ref={details}
      className="popover column__limit-popover"
      onToggle={(event) => {
        if (!event.currentTarget.open) return
        setDraft(limit === null ? '' : String(limit))
        input.current?.focus()
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          close()
          event.currentTarget.querySelector('summary')?.focus()
        }
      }}
    >
      <summary
        className="icon-button column__limit-button"
        aria-label={`Set WIP limit for ${columnTitle}`}
        title={limit === null ? 'Set a WIP limit' : `WIP limit: ${limit}`}
      >
        <Icon name="signal" size={14} />
      </summary>
      <form className="popover-panel wip-limit" onSubmit={handleSubmit}>
        <h3>WIP limit</h3>
        <label className="popover-label" htmlFor={inputId}>
          Most issues allowed in {columnTitle}
        </label>
        <input
          id={inputId}
          ref={input}
          className="wip-limit__input"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          placeholder="No limit"
          value={draft}
          aria-invalid={!valid}
          onChange={(event) => setDraft(event.target.value)}
        />
        <p className="wip-limit__hint">
          {!valid
            ? 'Enter a whole number of 1 or more.'
            : parsed !== null && count > parsed
              ? `${count} issues are already here; no more can be added.`
              : `${count} ${count === 1 ? 'issue' : 'issues'} in this column now.`}
        </p>
        <footer>
          {limit !== null && (
            <button
              type="button"
              className="button"
              onClick={() => {
                onChange(null)
                close()
              }}
            >
              Remove limit
            </button>
          )}
          <button
            type="submit"
            className="button button--primary"
            disabled={!valid}
          >
            Save
          </button>
        </footer>
      </form>
    </details>
  )
}
