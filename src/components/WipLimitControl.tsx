import { useEffect, useRef, useState } from 'react'
import type { Column } from '../types'
import { parseWipLimit } from '../wipLimit'

interface WipLimitControlProps {
  column: Column
  overLimit: boolean
  onSetWipLimit: (limit: number | null) => void
}

export function WipLimitControl({
  column,
  overLimit,
  onSetWipLimit,
}: WipLimitControlProps) {
  const wipInputRef = useRef<HTMLInputElement | null>(null)
  const wipEditFinished = useRef(false)
  const [editingWip, setEditingWip] = useState(false)

  useEffect(() => {
    if (!editingWip) return
    wipInputRef.current?.focus()
    wipInputRef.current?.select()
  }, [editingWip])

  function finishWipEdit(value: string) {
    if (wipEditFinished.current) return
    wipEditFinished.current = true
    const limit = parseWipLimit(value)
    if (limit !== undefined) onSetWipLimit(limit)
    setEditingWip(false)
  }

  if (editingWip) {
    return (
      <input
        ref={wipInputRef}
        type="number"
        min={1}
        step={1}
        className="column__wip-input"
        aria-label={`WIP limit for ${column.title}`}
        defaultValue={column.wipLimit ?? ''}
        onBlur={(event) => finishWipEdit(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== 'Escape') return
          event.preventDefault()
          event.stopPropagation()
          if (event.key === 'Enter') {
            finishWipEdit(event.currentTarget.value)
          } else {
            wipEditFinished.current = true
            setEditingWip(false)
          }
        }}
      />
    )
  }

  return (
    <button
      className={`column__wip${column.wipLimit === null ? ' column__wip--unset' : ''}`}
      data-testid={`wip-${column.id}`}
      aria-label={`Set WIP limit for ${column.title}`}
      title={
        overLimit
          ? `Over WIP limit (${column.cardIds.length}/${column.wipLimit})`
          : column.wipLimit === null
            ? 'Set a WIP limit'
            : `WIP limit: ${column.wipLimit}`
      }
      onClick={() => {
        wipEditFinished.current = false
        setEditingWip(true)
      }}
    >
      {column.wipLimit === null ? 'WIP' : `WIP ${column.wipLimit}`}
    </button>
  )
}
