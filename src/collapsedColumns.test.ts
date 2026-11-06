import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadCollapsedColumns, saveCollapsedColumns } from './collapsedColumns'

const STORAGE_KEY = 'kanban-collapsed-columns'

beforeEach(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('collapsed column storage', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(loadCollapsedColumns()).toEqual([])
  })

  it('round-trips collapsed column ids', () => {
    saveCollapsedColumns(['backlog', 'done'])
    expect(loadCollapsedColumns()).toEqual(['backlog', 'done'])
  })

  it('ignores malformed stored values', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadCollapsedColumns()).toEqual([])
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ backlog: true }))
    expect(loadCollapsedColumns()).toEqual([])
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['review', 3, null]))
    expect(loadCollapsedColumns()).toEqual(['review'])
  })

  it('does not throw when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(loadCollapsedColumns()).toEqual([])
    expect(() => saveCollapsedColumns(['done'])).not.toThrow()
  })
})
