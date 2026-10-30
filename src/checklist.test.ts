import { describe, expect, it } from 'vitest'
import {
  addChecklistItem,
  getChecklistProgress,
  MAX_CHECKLIST_ITEM_LENGTH,
  normalizeChecklist,
  removeChecklistItem,
  toggleChecklistItem,
} from './checklist'
import type { ChecklistItem } from './types'

const items: ChecklistItem[] = [
  { id: 'a', text: 'Write spec', done: true },
  { id: 'b', text: 'Ship it', done: false },
]

describe('addChecklistItem', () => {
  it('appends a trimmed, unchecked item', () => {
    expect(addChecklistItem(items, '  Review copy ', 'c')).toEqual([
      ...items,
      { id: 'c', text: 'Review copy', done: false },
    ])
  })

  it('ignores blank text', () => {
    expect(addChecklistItem(items, '   ')).toBe(items)
  })

  it('caps item length', () => {
    const [item] = addChecklistItem([], 'x'.repeat(500), 'c')
    expect(item.text).toHaveLength(MAX_CHECKLIST_ITEM_LENGTH)
  })

  it('generates unique ids', () => {
    const once = addChecklistItem([], 'One')
    const twice = addChecklistItem(once, 'Two')
    expect(twice[0].id).not.toBe(twice[1].id)
  })
})

describe('toggleChecklistItem', () => {
  it('flips only the matching item', () => {
    expect(toggleChecklistItem(items, 'b')).toEqual([
      items[0],
      { ...items[1], done: true },
    ])
    expect(toggleChecklistItem(items, 'a')[0].done).toBe(false)
  })
})

describe('removeChecklistItem', () => {
  it('removes the matching item', () => {
    expect(removeChecklistItem(items, 'a')).toEqual([items[1]])
    expect(removeChecklistItem(items, 'missing')).toEqual(items)
  })
})

describe('getChecklistProgress', () => {
  it('counts done and total items', () => {
    expect(getChecklistProgress(items)).toEqual({ done: 1, total: 2 })
    expect(getChecklistProgress([])).toEqual({ done: 0, total: 0 })
  })
})

describe('normalizeChecklist', () => {
  it('defaults missing or invalid lists to empty', () => {
    for (const value of [undefined, null, 'items', {}, 3]) {
      expect(normalizeChecklist(value)).toEqual([])
    }
  })

  it('keeps valid items and drops malformed ones', () => {
    expect(
      normalizeChecklist([
        items[0],
        null,
        { id: 'b', text: 'No done flag' },
        { id: 'a', text: 'Duplicate id', done: false },
        { id: '', text: 'Empty id', done: false },
        { id: 'c', text: '   ', done: false },
        { id: 'd', text: 42, done: false },
        { id: 'e', text: 'Truthy done', done: 'yes' },
      ]),
    ).toEqual([
      items[0],
      { id: 'b', text: 'No done flag', done: false },
      { id: 'e', text: 'Truthy done', done: false },
    ])
  })
})
