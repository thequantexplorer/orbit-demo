import { describe, expect, it } from 'vitest'
import { boardReducer, findColumnOfCard } from './boardReducer'
import { createSeedBoard } from './data'
import type { BoardState, ColumnId } from './types'

const TODAY = '2026-10-21'

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
        today: TODAY,
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
        today: TODAY,
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
        today: TODAY,
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
        today: TODAY,
      })
      expect(seed).toEqual(before)
    })
  })

  it('stamps a card when it enters Done', () => {
    const board = boardReducer(createSeedBoard(TODAY), {
      type: 'move-card',
      cardId: 'KB-1',
      toColumn: 'done',
      toIndex: 2,
      today: TODAY,
    })
    expect(board.cards['KB-1'].completedAt).toBe(TODAY)
  })

  it('clears the completion day when a card leaves Done', () => {
    const board = boardReducer(createSeedBoard(TODAY), {
      type: 'move-card',
      cardId: 'KB-8',
      toColumn: 'review',
      toIndex: 1,
      today: TODAY,
    })
    expect(board.cards['KB-8'].completedAt).toBeNull()
  })

  it('keeps the completion day for same-column moves in Done', () => {
    const seed = createSeedBoard(TODAY)
    const board = boardReducer(seed, {
      type: 'move-card',
      cardId: 'KB-8',
      toColumn: 'done',
      toIndex: 1,
      today: '2026-10-22',
    })
    expect(board.cards['KB-8'].completedAt).toBe(seed.cards['KB-8'].completedAt)
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
        today: TODAY,
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
        completedAt: null,
      })
      expect(cardIds(board, 'in-progress')).toEqual(['KB-5', 'KB-6', 'KB-10'])
    })

    it('keeps a due date passed in details', () => {
      const board = boardReducer(createSeedBoard(), {
        type: 'add-card',
        columnId: 'backlog',
        title: 'Launch',
        today: TODAY,
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
        today: TODAY,
      })
      expect(board).toBe(seed)
    })

    it('stamps a card added directly to Done', () => {
      const board = boardReducer(createSeedBoard(TODAY), {
        type: 'add-card',
        columnId: 'done',
        title: 'Finished',
        today: TODAY,
      })
      expect(board.cards['KB-10'].completedAt).toBe(TODAY)
    })

    it('leaves a card added to Backlog incomplete', () => {
      const board = boardReducer(createSeedBoard(TODAY), {
        type: 'add-card',
        columnId: 'backlog',
        title: 'Planned',
        today: TODAY,
      })
      expect(board.cards['KB-10'].completedAt).toBeNull()
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

  describe('set-wip-limit', () => {
    it('sets a limit on only the target column and clears it with null', () => {
      const seed = createSeedBoard()
      const limited = boardReducer(seed, {
        type: 'set-wip-limit',
        columnId: 'review',
        limit: 4,
      })
      expect(limited.columns.find((column) => column.id === 'review')?.wipLimit)
        .toBe(4)
      expect(limited.columns.filter((column) => column.id !== 'review'))
        .toEqual(seed.columns.filter((column) => column.id !== 'review'))

      const cleared = boardReducer(limited, {
        type: 'set-wip-limit',
        columnId: 'review',
        limit: null,
      })
      expect(cleared.columns.find((column) => column.id === 'review')?.wipLimit)
        .toBeNull()
    })

    it('returns the same board for invalid limits', () => {
      const seed = createSeedBoard()
      for (const limit of [0, -2, 2.5]) {
        expect(
          boardReducer(seed, {
            type: 'set-wip-limit',
            columnId: 'review',
            limit,
          }),
        ).toBe(seed)
      }
    })
  })

  it('restores a drag snapshot while keeping the current WIP limits', () => {
    const snapshot = createSeedBoard()
    const moved = boardReducer(snapshot, {
      type: 'move-card',
      cardId: 'KB-5',
      toColumn: 'review',
      toIndex: 1,
      today: TODAY,
    })
    const current = boardReducer(moved, {
      type: 'set-wip-limit',
      columnId: 'review',
      limit: 2,
    })
    const cancelled = boardReducer(current, {
      type: 'cancel-drag',
      snapshot,
    })

    expect(cancelled.columns.map((column) => column.cardIds)).toEqual(
      snapshot.columns.map((column) => column.cardIds),
    )
    expect(
      cancelled.columns.find((column) => column.id === 'review')?.wipLimit,
    ).toBe(2)
  })

  it('cancel-drag restores completion dates changed during drag-over', () => {
    const snapshot = createSeedBoard(TODAY)
    const moved = boardReducer(snapshot, {
      type: 'move-card',
      cardId: 'KB-1',
      toColumn: 'done',
      toIndex: 2,
      today: TODAY,
    })
    expect(moved.cards['KB-1'].completedAt).toBe(TODAY)

    const cancelled = boardReducer(moved, {
      type: 'cancel-drag',
      snapshot,
    })

    expect(cancelled.cards['KB-1'].completedAt).toBeNull()
    expect(findColumnOfCard(cancelled, 'KB-1')).toBe('backlog')
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

  it('reset restores the seed board', () => {
    const changed = boardReducer(createSeedBoard(), {
      type: 'clear-column',
      columnId: 'backlog',
    })
    const board = boardReducer(changed, { type: 'reset', today: TODAY })
    expect(board).toEqual(createSeedBoard(TODAY))
    expect(board.cards['KB-9'].completedAt).toBe(TODAY)
  })
})
