import type { ChecklistItem } from './types'

export const MAX_CHECKLIST_ITEM_LENGTH = 200

let idCounter = 0

function createItemId(): string {
  idCounter += 1
  return `item-${Date.now().toString(36)}-${idCounter.toString(36)}`
}

/** Appends a new unchecked item; blank text leaves the list unchanged. */
export function addChecklistItem(
  items: ChecklistItem[],
  text: string,
  id: string = createItemId(),
): ChecklistItem[] {
  const trimmed = text.trim().slice(0, MAX_CHECKLIST_ITEM_LENGTH)
  if (!trimmed) return items
  return [...items, { id, text: trimmed, done: false }]
}

export function toggleChecklistItem(
  items: ChecklistItem[],
  id: string,
): ChecklistItem[] {
  return items.map((item) =>
    item.id === id ? { ...item, done: !item.done } : item,
  )
}

export function removeChecklistItem(
  items: ChecklistItem[],
  id: string,
): ChecklistItem[] {
  return items.filter((item) => item.id !== id)
}

export function getChecklistProgress(items: ChecklistItem[]): {
  done: number
  total: number
} {
  return {
    done: items.filter((item) => item.done).length,
    total: items.length,
  }
}

/** Keeps well-formed saved items and drops anything else. */
export function normalizeChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const items: ChecklistItem[] = []
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) continue
    const { id, text, done } = entry as Partial<ChecklistItem>
    if (typeof id !== 'string' || !id || seen.has(id)) continue
    if (typeof text !== 'string' || !text.trim()) continue
    seen.add(id)
    items.push({
      id,
      text: text.trim().slice(0, MAX_CHECKLIST_ITEM_LENGTH),
      done: done === true,
    })
  }
  return items
}
