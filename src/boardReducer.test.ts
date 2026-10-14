import { describe, expect, it } from 'vitest'
import { boardReducer, findColumnOfCard } from './boardReducer'
import { createSeedBoard } from './data'
import type { BoardState, ColumnId } from './types'

function cardIds(board: BoardState, columnId: ColumnId) {
  return board.columns.find((column) => column.id === columnId)!.cardIds
}

describe('findColumnOfCard', () => {
  it('returns the column holding the card, or undefined', () => {
    const board = createSeedBoard()
    expect(findColumnOfCard(board, 'KB-1')).toBe('backlog')
    expect(findColumnOfCard(board, 'KB-7')).toBe('review')
    expect(findColumnOfCard(board, 'KB-404')).toBeUndefined()
  })
})

describe('boardReducer', () => {
  describe('move-card', () => {
    it('moves a card to another column at the given index', () => {
      const board = boardReducer(createSeedBoard(), {
        type: 'move-card',
        cardId: 'KB-1',
        toColumn: 'review',
        toIndex: 0,
      })
      expect(cardIds(board, 'backlog')).toEqual(['KB-2', 'KB-3', 'KB-4'])
      expect(cardIds(board, 'review')).toEqual(['KB-1', 'KB-7'])
    })

    it('reorders within the same column', () => {
      const board = boardReducer(createSeedBoard(), {
        type: 'move-card',
        cardId: 'KB-1',
        toColumn: 'backlog',
        toIndex: 2,
      })
      expect(cardIds(board, 'backlog')).toEqual(['KB-2', 'KB-3', 'KB-1', 'KB-4'])
    })

    it('returns the same board for an unknown card', () => {
      const seed = createSeedBoard()
      const board = boardReducer(seed, {
        type: 'move-card',
        cardId: 'KB-404',
        toColumn: 'done',
        toIndex: 0,
      })
      expect(board).toBe(seed)
    })

    it('does not mutate the previous state', () => {
      const seed = createSeedBoard()
      const before = structuredClone(seed)
      boardReducer(seed, {
        type: 'move-card',
        cardId: 'KB-5',
        toColumn: 'done',
        toIndex: 1,
      })
      expect(seed).toEqual(before)
    })
  })

  it('reorder-card moves a card between indexes in one column', () => {
    const board = boardReducer(createSeedBoard(), {
      type: 'reorder-card',
      columnId: 'backlog',
      fromIndex: 3,
      toIndex: 0,
    })
    expect(cardIds(board, 'backlog')).toEqual(['KB-4', 'KB-1', 'KB-2', 'KB-3'])
    expect(cardIds(board, 'in-progress')).toEqual(['KB-5', 'KB-6'])
  })

  describe('add-card', () => {
    it('appends a card with the next id and trimmed title', () => {
      const board = boardReducer(createSeedBoard(), {
        type: 'add-card',
        columnId: 'in-progress',
        title: '  Ship it  ',
        details: { labels: ['bug'] },
      })
      expect(board.nextCardNumber).toBe(11)
      expect(board.cards['KB-10']).toEqual({
        id: 'KB-10',
        title: 'Ship it',
        description: '',
        labels: ['bug'],
        assigneeId: null,
        dueDate: null,
      })
      expect(cardIds(board, 'in-progress')).toEqual(['KB-5', 'KB-6', 'KB-10'])
    })

    it('keeps a due date passed in details', () => {
      const board = boardReducer(createSeedBoard(), {
        type: 'add-card',
        columnId: 'backlog',
        title: 'Launch',
        details: { dueDate: '2026-10-12' },
      })
      expect(board.cards['KB-10'].dueDate).toBe('2026-10-12')
    })

    it('ignores a blank title', () => {
      const seed = createSeedBoard()
      const board = boardReducer(seed, {
        type: 'add-card',
        columnId: 'backlog',
        title: '   ',
      })
      expect(board).toBe(seed)
    })
  })

  it('update-card merges the patch into the card', () => {
    const board = boardReducer(createSeedBoard(), {
      type: 'update-card',
      cardId: 'KB-2',
      patch: { title: 'Redesign onboarding', assigneeId: null },
    })
    expect(board.cards['KB-2']).toMatchObject({
      id: 'KB-2',
      title: 'Redesign onboarding',
      assigneeId: null,
      labels: ['design'],
    })
  })

  it('update-card sets and clears the due date', () => {
    const withDate = boardReducer(createSeedBoard(), {
      type: 'update-card',
      cardId: 'KB-2',
      patch: { dueDate: '2026-10-12' },
    })
    expect(withDate.cards['KB-2'].dueDate).toBe('2026-10-12')
    const cleared = boardReducer(withDate, {
      type: 'update-card',
      cardId: 'KB-2',
      patch: { dueDate: null },
    })
    expect(cleared.cards['KB-2'].dueDate).toBeNull()
  })

  it('delete-card removes the card and its column reference', () => {
    const board = boardReducer(createSeedBoard(), {
      type: 'delete-card',
      cardId: 'KB-6',
    })
    expect(board.cards['KB-6']).toBeUndefined()
    expect(cardIds(board, 'in-progress')).toEqual(['KB-5'])
    expect(Object.keys(board.cards)).toHaveLength(8)
  })

  describe('clear-column', () => {
    it('removes every card in the column and leaves others intact', () => {
      const board = boardReducer(createSeedBoard(), {
        type: 'clear-column',
        columnId: 'done',
      })
      expect(cardIds(board, 'done')).toEqual([])
      expect(board.cards['KB-8']).toBeUndefined()
      expect(board.cards['KB-9']).toBeUndefined()
      expect(Object.keys(board.cards)).toHaveLength(7)
      expect(board.nextCardNumber).toBe(10)
    })

    it('returns the same board when the column is already empty', () => {
      const cleared = boardReducer(createSeedBoard(), {
        type: 'clear-column',
        columnId: 'done',
      })
      expect(
        boardReducer(cleared, { type: 'clear-column', columnId: 'done' }),
      ).toBe(cleared)
    })
  })

  describe('set-wip-limit', () => {
    it('sets and clears a column limit', () => {
      const seed = createSeedBoard()
      const limited = boardReducer(seed, {
        type: 'set-wip-limit',
        columnId: 'in-progress',
        limit: 3,
      })
      expect(
        limited.columns.find((column) => column.id === 'in-progress')?.wipLimit,
      ).toBe(3)
      const cleared = boardReducer(limited, {
        type: 'set-wip-limit',
        columnId: 'in-progress',
        limit: null,
      })
      expect(
        cleared.columns.find((column) => column.id === 'in-progress')?.wipLimit,
      ).toBeNull()
    })

    it('rejects invalid limits with the same board reference', () => {
      const seed = createSeedBoard()
      for (const limit of [0, -2, 1.5]) {
        expect(
          boardReducer(seed, {
            type: 'set-wip-limit',
            columnId: 'backlog',
            limit,
          }),
        ).toBe(seed)
      }
    })

    it('returns the same board for an unknown column or unchanged limit', () => {
      const seed = createSeedBoard()
      expect(
        boardReducer(seed, {
          type: 'set-wip-limit',
          columnId: 'nope' as ColumnId,
          limit: 2,
        }),
      ).toBe(seed)
      expect(
        boardReducer(seed, {
          type: 'set-wip-limit',
          columnId: 'backlog',
          limit: null,
        }),
      ).toBe(seed)
    })
  })

  describe('wip limits and card moves', () => {
    it('seed columns start with no limit', () => {
      for (const column of createSeedBoard().columns) {
        expect(column.wipLimit).toBeNull()
      }
    })

    it('rejects a move into a full column', () => {
      const seed = createSeedBoard()
      const limited = boardReducer(seed, {
        type: 'set-wip-limit',
        columnId: 'in-progress',
        limit: 2,
      })
      const board = boardReducer(limited, {
        type: 'move-card',
        cardId: 'KB-1',
        toColumn: 'in-progress',
        toIndex: 0,
      })
      expect(board).toBe(limited)
    })

    it('moves into a column under its limit', () => {
      const seed = createSeedBoard()
      const limited = boardReducer(seed, {
        type: 'set-wip-limit',
        columnId: 'in-progress',
        limit: 3,
      })
      const board = boardReducer(limited, {
        type: 'move-card',
        cardId: 'KB-1',
        toColumn: 'in-progress',
        toIndex: 0,
      })
      expect(cardIds(board, 'in-progress')).toEqual(['KB-1', 'KB-5', 'KB-6'])
    })

    it('still reorders within a full column', () => {
      const seed = createSeedBoard()
      const limited = boardReducer(seed, {
        type: 'set-wip-limit',
        columnId: 'in-progress',
        limit: 2,
      })
      const board = boardReducer(limited, {
        type: 'move-card',
        cardId: 'KB-5',
        toColumn: 'in-progress',
        toIndex: 1,
      })
      expect(cardIds(board, 'in-progress')).toEqual(['KB-6', 'KB-5'])
    })

    it('rejects add-card into a full column', () => {
      const seed = createSeedBoard()
      const limited = boardReducer(seed, {
        type: 'set-wip-limit',
        columnId: 'review',
        limit: 1,
      })
      const board = boardReducer(limited, {
        type: 'add-card',
        columnId: 'review',
        title: 'New work',
      })
      expect(board).toBe(limited)
    })

    it('rejects moves when the limit is below the current count', () => {
      const seed = createSeedBoard()
      const limited = boardReducer(seed, {
        type: 'set-wip-limit',
        columnId: 'in-progress',
        limit: 1,
      })
      const board = boardReducer(limited, {
        type: 'move-card',
        cardId: 'KB-1',
        toColumn: 'in-progress',
        toIndex: 0,
      })
      expect(board).toBe(limited)
    })
  })

  it('reset restores the seed board', () => {
    const changed = boardReducer(createSeedBoard(), {
      type: 'clear-column',
      columnId: 'backlog',
    })
    expect(boardReducer(changed, { type: 'reset' })).toEqual(createSeedBoard())
  })
})
