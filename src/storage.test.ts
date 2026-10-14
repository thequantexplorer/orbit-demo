import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { boardReducer } from './boardReducer'
import { createSeedBoard } from './data'
import { clearBoard, loadBoard, saveBoard } from './storage'
import type { BoardState } from './types'

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

  it('rejects boards whose columns are not the four known columns', () => {
    const seed = createSeedBoard()
    const [backlog, inProgress, review, done] = seed.columns
    const invalid = [
      [backlog, inProgress, review],
      [backlog, inProgress, review, done, { ...done, id: 'archive' }],
      [backlog, inProgress, review, { ...done, id: 'archive' }],
      [backlog, inProgress, review, { ...review }],
      [backlog, inProgress, review, null],
      [backlog, inProgress, review, 'done'],
      [backlog, inProgress, review, { ...done, id: '__proto__' }],
    ]
    for (const columns of invalid) {
      storage.setItem(STORAGE_KEY, JSON.stringify({ ...seed, columns }))
      expect(loadBoard()).toBeNull()
    }
  })

  it('rejects non-object card maps', () => {
    const seed = createSeedBoard()
    for (const cards of [[], 'cards', 1]) {
      storage.setItem(STORAGE_KEY, JSON.stringify({ ...seed, cards }))
      expect(loadBoard()).toBeNull()
    }
  })

  it('repairs malformed column fields', () => {
    const saved = JSON.parse(JSON.stringify(createSeedBoard()))
    saved.columns[0].title = 42
    delete saved.columns[1].accent
    saved.columns[2].cardIds = 'KB-7'
    saved.columns[3].extra = true
    storage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const loaded = loadBoard()!
    expect(loaded.columns[0]).toMatchObject({ title: 'Backlog' })
    expect(loaded.columns[1]).toMatchObject({ accent: '#3b82f6' })
    expect(loaded.columns[2].cardIds).toEqual([])
    expect(loaded.columns[3]).not.toHaveProperty('extra')
    // KB-7 lost its column, so it is moved to the backlog instead of lost.
    expect(loaded.columns[0].cardIds).toEqual([
      'KB-1',
      'KB-2',
      'KB-3',
      'KB-4',
      'KB-7',
    ])
  })

  it('keeps the saved column order', () => {
    const saved = createSeedBoard()
    saved.columns.reverse()
    saveBoard(saved)
    expect(loadBoard()!.columns.map((column) => column.id)).toEqual([
      'done',
      'review',
      'in-progress',
      'backlog',
    ])
  })

  it('drops dangling, duplicate and non-string card ids from columns', () => {
    const saved = JSON.parse(JSON.stringify(createSeedBoard()))
    saved.columns[0].cardIds = ['KB-1', 'KB-404', 'KB-1', 7, null, 'KB-2']
    saved.columns[1].cardIds = ['KB-2', 'KB-5', 'KB-6', 'toString']
    saved.columns[3].cardIds = ['KB-8', 'KB-9', 'constructor', '__proto__']
    storage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const loaded = loadBoard()!
    expect(loaded.columns.map((column) => column.cardIds)).toEqual([
      ['KB-1', 'KB-2', 'KB-3', 'KB-4'],
      ['KB-5', 'KB-6'],
      ['KB-7'],
      ['KB-8', 'KB-9'],
    ])
  })

  it('moves cards that are in no column to the backlog', () => {
    const saved = JSON.parse(JSON.stringify(createSeedBoard()))
    saved.columns[0].cardIds = ['KB-1']
    storage.setItem(STORAGE_KEY, JSON.stringify(saved))
    expect(loadBoard()!.columns[0].cardIds).toEqual([
      'KB-1',
      'KB-2',
      'KB-3',
      'KB-4',
    ])
  })

  it('drops cards that are malformed or keyed by a different id', () => {
    const saved = JSON.parse(JSON.stringify(createSeedBoard()))
    saved.cards['KB-1'] = null
    saved.cards['KB-2'] = 'Design onboarding flow'
    saved.cards['KB-3'] = [saved.cards['KB-3']]
    saved.cards['KB-4'].title = undefined
    saved.cards['KB-5'].title = { text: 'Dark mode' }
    saved.cards['KB-6'].id = 'KB-7'
    delete saved.cards['KB-7'].id
    storage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const loaded = loadBoard()!
    expect(Object.keys(loaded.cards).sort()).toEqual(['KB-8', 'KB-9'])
    expect(loaded.columns.map((column) => column.cardIds)).toEqual([
      [],
      [],
      [],
      ['KB-8', 'KB-9'],
    ])
  })

  it('repairs malformed card fields', () => {
    const saved = JSON.parse(JSON.stringify(createSeedBoard()))
    Object.assign(saved.cards['KB-1'], {
      description: null,
      labels: 'bug',
      assigneeId: 7,
      extra: 'field',
    })
    Object.assign(saved.cards['KB-2'], {
      labels: ['bug', 'nope', 'bug', 3, null, 'toString', '__proto__', 'urgent'],
      assigneeId: 'nobody',
    })
    delete saved.cards['KB-3'].description
    delete saved.cards['KB-3'].labels
    delete saved.cards['KB-3'].assigneeId
    saved.cards['KB-4'].assigneeId = 'constructor'
    storage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const loaded = loadBoard()!
    expect(loaded.cards['KB-1']).toEqual({
      id: 'KB-1',
      title: 'Set up CI pipeline',
      description: '',
      labels: [],
      assigneeId: null,
      dueDate: null,
    })
    expect(loaded.cards['KB-2'].labels).toEqual(['bug', 'urgent'])
    expect(loaded.cards['KB-2'].assigneeId).toBeNull()
    expect(loaded.cards['KB-3']).toMatchObject({
      description: '',
      labels: [],
      assigneeId: null,
    })
    expect(loaded.cards['KB-4'].assigneeId).toBeNull()
  })

  it('ignores card ids that collide with Object.prototype', () => {
    const seed = createSeedBoard()
    const card = (id: string) => ({ ...seed.cards['KB-1'], id })
    const raw = JSON.stringify(seed).replace(
      '"cards":{',
      `"cards":{"__proto__":${JSON.stringify(card('__proto__'))},` +
        `"constructor":${JSON.stringify(card('constructor'))},` +
        `"toString":${JSON.stringify(card('toString'))},` +
        `"hasOwnProperty":${JSON.stringify(card('hasOwnProperty'))},`,
    )
    storage.setItem(
      STORAGE_KEY,
      raw.replace(
        '"cardIds":["KB-1"',
        '"cardIds":["__proto__","constructor","toString","hasOwnProperty","KB-1"',
      ),
    )
    const loaded = loadBoard()!
    expect(Object.getPrototypeOf(loaded.cards)).toBe(Object.prototype)
    expect(Object.keys(loaded.cards).sort()).toEqual(
      Object.keys(seed.cards).sort(),
    )
    expect(loaded.columns[0].cardIds).toEqual(seed.columns[0].cardIds)
    expect(({} as Record<string, unknown>).title).toBeUndefined()
  })

  it('bumps nextCardNumber past every existing card number', () => {
    const seed = createSeedBoard()
    for (const nextCardNumber of [1, 5, 9, 0, -3, 2.5, null, '20', 2 ** 53, 1e20]) {
      storage.setItem(STORAGE_KEY, JSON.stringify({ ...seed, nextCardNumber }))
      expect(loadBoard()!.nextCardNumber).toBe(10)
    }
  })

  it('keeps a nextCardNumber that is already ahead of the cards', () => {
    saveBoard({ ...createSeedBoard(), nextCardNumber: 42 })
    expect(loadBoard()!.nextCardNumber).toBe(42)
  })

  it('accounts for non-sequential card ids', () => {
    const saved = JSON.parse(JSON.stringify(createSeedBoard()))
    saved.cards['KB-120'] = { ...saved.cards['KB-1'], id: 'KB-120' }
    saved.cards['KB-007'] = { ...saved.cards['KB-1'], id: 'KB-007' }
    saved.cards['custom'] = { ...saved.cards['KB-1'], id: 'custom' }
    saved.columns[0].cardIds.push('KB-120', 'KB-007', 'custom')
    storage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const loaded = loadBoard()!
    expect(loaded.nextCardNumber).toBe(121)
    expect(Object.keys(loaded.cards)).toHaveLength(12)
  })

  it('keeps large card numbers that can still be incremented safely', () => {
    const board: BoardState = {
      columns: createSeedBoard().columns.map((column) => ({
        ...column,
        cardIds: column.id === 'backlog' ? ['KB-1000000000'] : [],
      })),
      cards: {
        'KB-1000000000': {
          id: 'KB-1000000000',
          title: 'new',
          description: '',
          labels: [],
          assigneeId: null,
          dueDate: null,
        },
      },
      nextCardNumber: 1_000_000_001,
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(board))
    expect(loadBoard()).toEqual(board)

    const nearMax = { ...board, nextCardNumber: Number.MAX_SAFE_INTEGER }
    saveBoard(nearMax)
    expect(loadBoard()).toEqual(nearMax)
  })

  it('round-trips every board add-card can produce near the limit', () => {
    for (const start of [999_999_999, Number.MAX_SAFE_INTEGER - 2]) {
      saveBoard({ ...createSeedBoard(), nextCardNumber: start })
      let board = loadBoard()!
      for (let i = 0; i < 4; i++) {
        board = boardReducer(board, {
          type: 'add-card',
          columnId: 'backlog',
          title: `New ${i}`,
        })
        saveBoard(board)
        expect(loadBoard()).toEqual(board)
      }
    }
  })

  it('drops cards whose number is too large to increment safely', () => {
    const saved = JSON.parse(JSON.stringify(createSeedBoard()))
    for (const id of [
      `KB-${Number.MAX_SAFE_INTEGER}`,
      'KB-9007199254740993',
      'KB-99999999999999999999',
    ]) {
      saved.cards[id] = { ...saved.cards['KB-1'], id }
      saved.columns[0].cardIds.push(id)
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(saved))
    const loaded = loadBoard()!
    expect(Object.keys(loaded.cards)).toHaveLength(9)
    expect(loaded.columns[0].cardIds).toEqual(['KB-1', 'KB-2', 'KB-3', 'KB-4'])
    expect(loaded.nextCardNumber).toBe(10)
  })

  it('never lets add-card reuse an existing id', () => {
    const seed = createSeedBoard()
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...seed, nextCardNumber: 3 }))
    let board = loadBoard()!
    for (let i = 0; i < 3; i++) {
      board = boardReducer(board, {
        type: 'add-card',
        columnId: 'backlog',
        title: `New ${i}`,
      })
    }
    expect(Object.keys(board.cards)).toHaveLength(12)
    expect(board.cards['KB-1'].title).toBe('Set up CI pipeline')
  })

  it('never throws on arbitrary JSON', () => {
    const values = [
      0,
      'board',
      true,
      { columns: {}, cards: {}, nextCardNumber: 1 },
      { columns: [1, 2, 3, 4], cards: {}, nextCardNumber: 1 },
      { ...createSeedBoard(), columns: [[], [], [], []] },
    ]
    for (const value of values) {
      storage.setItem(STORAGE_KEY, JSON.stringify(value))
      expect(() => loadBoard()).not.toThrow()
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
