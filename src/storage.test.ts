import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSeedBoard } from './data'
import { clearBoard, loadBoard, saveBoard } from './storage'

const STORAGE_KEY = 'kanban-board:v1'

function createStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key)
    },
    setItem: (key, value) => {
      store.set(key, String(value))
    },
  }
}

let storage: Storage

beforeEach(() => {
  storage = createStorage()
  vi.stubGlobal('localStorage', storage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadBoard', () => {
  it('returns null when nothing is saved', () => {
    expect(loadBoard()).toBeNull()
  })

  it('round-trips a saved board', () => {
    const board = createSeedBoard()
    expect(saveBoard(board)).toBe(true)
    expect(loadBoard()).toEqual(board)
  })

  it('keeps a saved due date', () => {
    const seed = createSeedBoard()
    const board = {
      ...seed,
      cards: {
        ...seed.cards,
        'KB-1': { ...seed.cards['KB-1'], dueDate: '2026-10-12' },
      },
    }
    saveBoard(board)
    expect(loadBoard()?.cards['KB-1'].dueDate).toBe('2026-10-12')
  })

  it('loads boards saved before due dates existed', () => {
    const board = createSeedBoard()
    const legacy = {
      ...board,
      cards: Object.fromEntries(
        Object.entries(board.cards).map(([id, card]) => {
          const { dueDate: _dueDate, ...rest } = card
          return [id, rest]
        }),
      ),
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    expect(loadBoard()).toEqual(board)
  })

  it('keeps a saved WIP limit', () => {
    const seed = createSeedBoard()
    const board = {
      ...seed,
      columns: seed.columns.map((column) =>
        column.id === 'in-progress' ? { ...column, wipLimit: 3 } : column,
      ),
    }
    saveBoard(board)
    expect(loadBoard()).toEqual(board)
  })

  it('loads boards saved before WIP limits existed', () => {
    const board = createSeedBoard()
    const legacy = {
      ...board,
      columns: board.columns.map(({ wipLimit: _limit, ...rest }) => rest),
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(legacy))
    expect(loadBoard()).toEqual(board)
  })

  it('drops malformed WIP limits', () => {
    const board = createSeedBoard()
    const saved = JSON.parse(JSON.stringify(board))
    saved.columns[0].wipLimit = 0
    saved.columns[1].wipLimit = '4'
    saved.columns[2].wipLimit = 2.5
    saved.columns[3].wipLimit = -1
    storage.setItem(STORAGE_KEY, JSON.stringify(saved))
    expect(loadBoard()).toEqual(board)
  })

  it('drops malformed due dates', () => {
    const board = createSeedBoard()
    const saved = JSON.parse(JSON.stringify(board))
    saved.cards['KB-1'].dueDate = 'next week'
    saved.cards['KB-2'].dueDate = 20261012
    saved.cards['KB-3'].dueDate = '2026-02-30'
    storage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const loaded = loadBoard()!
    expect(loaded.cards['KB-1'].dueDate).toBeNull()
    expect(loaded.cards['KB-2'].dueDate).toBeNull()
    expect(loaded.cards['KB-3'].dueDate).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    storage.setItem(STORAGE_KEY, '{not json')
    expect(loadBoard()).toBeNull()
  })

  it('rejects saved values that are not a board', () => {
    const invalid = [
      null,
      [],
      { cards: {}, nextCardNumber: 1 },
      { columns: [], cards: null, nextCardNumber: 1 },
      { columns: [], cards: {}, nextCardNumber: '1' },
    ]
    for (const value of invalid) {
      storage.setItem(STORAGE_KEY, JSON.stringify(value))
      expect(loadBoard()).toBeNull()
    }
  })

  it('returns null when localStorage throws', () => {
    vi.spyOn(storage, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadBoard()).toBeNull()
  })
})

describe('saveBoard', () => {
  it('writes JSON under the versioned key', () => {
    const board = createSeedBoard()
    saveBoard(board)
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual(board)
  })

  it('returns false when storage is full', () => {
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(saveBoard(createSeedBoard())).toBe(false)
  })
})

describe('clearBoard', () => {
  it('removes only the saved board', () => {
    saveBoard(createSeedBoard())
    storage.setItem('other', 'keep')
    clearBoard()
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
    expect(storage.getItem('other')).toBe('keep')
  })
})
