import { describe, expect, it } from 'vitest'
import { createSeedBoard } from './data'

describe('createSeedBoard', () => {
  it('creates two weeks of sample activity relative to the supplied day', () => {
    const board = createSeedBoard('2026-10-21')

    expect(board.history).toEqual({
      '2026-10-20': { added: 0, completed: 2, reopened: 0, removed: 0 },
      '2026-10-19': { added: 1, completed: 1, reopened: 0, removed: 0 },
      '2026-10-18': { added: 0, completed: 2, reopened: 0, removed: 0 },
      '2026-10-17': { added: 2, completed: 0, reopened: 0, removed: 0 },
      '2026-10-16': { added: 0, completed: 1, reopened: 0, removed: 0 },
      '2026-10-15': { added: 1, completed: 2, reopened: 0, removed: 0 },
      '2026-10-14': { added: 0, completed: 1, reopened: 0, removed: 0 },
      '2026-10-13': { added: 2, completed: 1, reopened: 0, removed: 0 },
      '2026-10-12': { added: 0, completed: 2, reopened: 0, removed: 0 },
      '2026-10-11': { added: 0, completed: 1, reopened: 0, removed: 0 },
      '2026-10-10': { added: 3, completed: 0, reopened: 0, removed: 0 },
      '2026-10-09': { added: 0, completed: 2, reopened: 0, removed: 0 },
      '2026-10-08': { added: 0, completed: 1, reopened: 0, removed: 0 },
    })
    expect(board.history['2026-10-21']).toBeUndefined()
  })
})
