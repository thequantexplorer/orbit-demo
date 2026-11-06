import { useEffect, useState } from 'react'
import type { ColumnId } from './types'

const STORAGE_KEY = 'kanban-collapsed-columns'

export function loadCollapsedColumns(): ColumnId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((id): id is ColumnId => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

export function saveCollapsedColumns(ids: ColumnId[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    /* Collapsing still works for this session without storage. */
  }
}

export function useCollapsedColumns() {
  const [collapsed, setCollapsed] = useState(loadCollapsedColumns)

  useEffect(() => saveCollapsedColumns(collapsed), [collapsed])

  function setColumnCollapsed(id: ColumnId, value: boolean) {
    setCollapsed((current) =>
      value
        ? current.includes(id)
          ? current
          : [...current, id]
        : current.filter((entry) => entry !== id),
    )
  }

  return { collapsed, setColumnCollapsed }
}
