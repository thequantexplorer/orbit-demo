import { describe, expect, it } from 'vitest'
import {
  boardReducer,
  canAcceptCard,
  findColumnOfCard,
  isColumnFull,
  isValidWipLimit,
} from './boardReducer'
import { createSeedBoard } from './data'
import type { BoardState, ColumnId } from './types'

function column(board: BoardState, columnId: ColumnId) {
  return board.columns.find((entry) => entry.id === columnId)!
}

function cardIds(board: BoardState, columnId: ColumnId) {
  return column(board, columnId).cardIds
}

describe('isValidWipLimit', () => {
  it('accepts positive integers only', () => {
    expect(isValidWipLimit(1)).toBe(true)
    expect(isValidWipLimit(12)).toBe(true)
    expect(isValidWipLimit(0)).toBe(false)
    expect(isValidWipLimit(-1)).toBe(false)
    expect(isValidWipLimit(2.5)).toBe(false)
    expect(isValidWipLimit('3')).toBe(false)
    expect(isValidWipLimit(null)).toBe(false)
    expect(isValidWipLimit(undefined)).toBe(false)
  })
})

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
    it('stores a positive whole-number limit on the column', () => {
      const board = boardReducer(createSeedBoard(), {
        type: 'set-wip-limit',
        columnId: 'in-progress',
        limit: 3,
      })
      expect(column(board, 'in-progress').wipLimit).toBe(3)
      expect(column(board, 'backlog').wipLimit).toBeNull()
      expect(isColumnFull(column(board, 'in-progress'))).toBe(false)
    })

    it('clears the limit with null', () => {
      const limited = boardReducer(createSeedBoard(), {
        type: 'set-wip-limit',
        columnId: 'review',
        limit: 1,
      })
      const cleared = boardReducer(limited, {
        type: 'set-wip-limit',
        columnId: 'review',
        limit: null,
      })
      expect(column(cleared, 'review').wipLimit).toBeNull()
    })

    it('treats zero, negatives, fractions and NaN as no limit', () => {
      for (const limit of [0, -2, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        const board = boardReducer(createSeedBoard(), {
          type: 'set-wip-limit',
          columnId: 'backlog',
          limit,
        })
        expect(column(board, 'backlog').wipLimit).toBeNull()
      }
    })

    it('returns the same board when the limit is unchanged', () => {
      const seed = createSeedBoard()
      expect(
        boardReducer(seed, {
          type: 'set-wip-limit',
          columnId: 'backlog',
          limit: null,
        }),
      ).toBe(seed)
    })

    it('may be set below the current count, marking the column full', () => {
      const board = boardReducer(createSeedBoard(), {
        type: 'set-wip-limit',
        columnId: 'backlog',
        limit: 2,
      })
      expect(column(board, 'backlog').cardIds).toHaveLength(4)
      expect(isColumnFull(column(board, 'backlog'))).toBe(true)
      expect(canAcceptCard(board, 'backlog')).toBe(false)
    })
  })

  describe('WIP limit enforcement', () => {
    function limitedBoard() {
      // Review holds KB-7; a limit of 1 makes it full.
      return boardReducer(createSeedBoard(), {
        type: 'set-wip-limit',
        columnId: 'review',
        limit: 1,
      })
    }

    it('rejects move-card into a full column', () => {
      const board = limitedBoard()
      const result = boardReducer(board, {
        type: 'move-card',
        cardId: 'KB-1',
        toColumn: 'review',
        toIndex: 0,
      })
      expect(result).toBe(board)
      expect(cardIds(result, 'review')).toEqual(['KB-7'])
      expect(cardIds(result, 'backlog')).toEqual(['KB-1', 'KB-2', 'KB-3', 'KB-4'])
    })

    it('allows a move into the column once there is room', () => {
      const board = boardReducer(createSeedBoard(), {
        type: 'set-wip-limit',
        columnId: 'review',
        limit: 2,
      })
      const moved = boardReducer(board, {
        type: 'move-card',
        cardId: 'KB-1',
        toColumn: 'review',
        toIndex: 0,
      })
      expect(cardIds(moved, 'review')).toEqual(['KB-1', 'KB-7'])
      expect(isColumnFull(column(moved, 'review'))).toBe(true)
    })

    it('still allows reordering inside a full column', () => {
      const board = boardReducer(limitedBoard(), {
        type: 'set-wip-limit',
        columnId: 'backlog',
        limit: 4,
      })
      const moved = boardReducer(board, {
        type: 'move-card',
        cardId: 'KB-1',
        toColumn: 'backlog',
        toIndex: 3,
      })
      expect(cardIds(moved, 'backlog')).toEqual(['KB-2', 'KB-3', 'KB-4', 'KB-1'])
      const reordered = boardReducer(board, {
        type: 'reorder-card',
        columnId: 'backlog',
        fromIndex: 0,
        toIndex: 1,
      })
      expect(cardIds(reordered, 'backlog')).toEqual(['KB-2', 'KB-1', 'KB-3', 'KB-4'])
    })

    it('rejects add-card into a full column', () => {
      const board = limitedBoard()
      const result = boardReducer(board, {
        type: 'add-card',
        columnId: 'review',
        title: 'One more',
      })
      expect(result).toBe(board)
      expect(result.nextCardNumber).toBe(10)
      expect(result.cards['KB-10']).toBeUndefined()
    })

    it('allows moving a card out of a full column', () => {
      const moved = boardReducer(limitedBoard(), {
        type: 'move-card',
        cardId: 'KB-7',
        toColumn: 'done',
        toIndex: 0,
      })
      expect(cardIds(moved, 'review')).toEqual([])
      expect(cardIds(moved, 'done')).toEqual(['KB-7', 'KB-8', 'KB-9'])
    })

    it('canAcceptCard is false for unknown columns', () => {
      expect(
        canAcceptCard(createSeedBoard(), 'nowhere' as ColumnId),
      ).toBe(false)
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
