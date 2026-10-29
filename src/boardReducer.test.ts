import { describe, expect, it } from 'vitest'
import { boardReducer, findColumnOfCard } from './boardReducer'
import { createSeedBoard } from './data'
import type { BoardState, ColumnId, Comment } from './types'

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
        comments: [],
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

  describe('toggle-column-collapsed', () => {
    it('toggles only the target column', () => {
      const seed = createSeedBoard()
      const collapsed = boardReducer(seed, {
        type: 'toggle-column-collapsed',
        columnId: 'review',
      })
      expect(collapsed.columns.map((column) => column.collapsed)).toEqual([
        false,
        false,
        true,
        false,
      ])
      expect(collapsed.columns.map((column) => column.cardIds)).toEqual(
        seed.columns.map((column) => column.cardIds),
      )

      const expanded = boardReducer(collapsed, {
        type: 'toggle-column-collapsed',
        columnId: 'review',
      })
      expect(expanded.columns).toEqual(seed.columns)
    })

    it('returns the same board for an unknown column', () => {
      const seed = createSeedBoard()
      expect(
        boardReducer(seed, {
          type: 'toggle-column-collapsed',
          columnId: 'missing' as ColumnId,
        }),
      ).toBe(seed)
    })
  })

  it('restores a drag snapshot while keeping the current collapsed state', () => {
    const snapshot = createSeedBoard()
    const moved = boardReducer(snapshot, {
      type: 'move-card',
      cardId: 'KB-5',
      toColumn: 'review',
      toIndex: 1,
    })
    const current = boardReducer(moved, {
      type: 'toggle-column-collapsed',
      columnId: 'backlog',
    })
    const cancelled = boardReducer(current, {
      type: 'cancel-drag',
      snapshot,
    })

    expect(cancelled.columns.map((column) => column.cardIds)).toEqual(
      snapshot.columns.map((column) => column.cardIds),
    )
    expect(cancelled.columns.map((column) => column.collapsed)).toEqual([
      true,
      false,
      false,
      false,
    ])
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

  describe('restore-card', () => {
    function deleteAt(cardId: string) {
      const seed = createSeedBoard()
      const columnId = findColumnOfCard(seed, cardId)!
      const index = cardIds(seed, columnId).indexOf(cardId)
      const card = seed.cards[cardId]
      const board = boardReducer(seed, { type: 'delete-card', cardId })
      return { seed, board, card, columnId, index }
    }

    it('puts the card back with every field at the same position', () => {
      const { seed, board, card, columnId, index } = deleteAt('KB-2')
      const restored = boardReducer(board, {
        type: 'restore-card',
        card,
        columnId,
        index,
      })
      expect(restored).toEqual(seed)
      expect(restored.cards['KB-2']).toBe(card)
    })

    it('keeps other edits made after the deletion', () => {
      const { board, card, columnId, index } = deleteAt('KB-2')
      const edited = boardReducer(
        boardReducer(board, {
          type: 'update-card',
          cardId: 'KB-1',
          patch: { title: 'Edited meanwhile' },
        }),
        { type: 'add-card', columnId: 'done', title: 'New issue' },
      )
      const restored = boardReducer(edited, {
        type: 'restore-card',
        card,
        columnId,
        index,
      })
      expect(restored.cards['KB-1'].title).toBe('Edited meanwhile')
      expect(restored.cards['KB-10'].title).toBe('New issue')
      expect(restored.nextCardNumber).toBe(edited.nextCardNumber)
      expect(cardIds(restored, 'backlog')).toEqual(['KB-1', 'KB-2', 'KB-3', 'KB-4'])
    })

    it('clamps the index when the column shrank meanwhile', () => {
      const { board, card, columnId, index } = deleteAt('KB-4')
      const shrunk = boardReducer(board, { type: 'delete-card', cardId: 'KB-1' })
      const restored = boardReducer(shrunk, {
        type: 'restore-card',
        card,
        columnId,
        index,
      })
      expect(index).toBe(3)
      expect(cardIds(restored, 'backlog')).toEqual(['KB-2', 'KB-3', 'KB-4'])
    })

    it('clamps negative and non-finite indexes', () => {
      const { board, card, columnId } = deleteAt('KB-2')
      const first = boardReducer(board, {
        type: 'restore-card',
        card,
        columnId,
        index: -4,
      })
      expect(cardIds(first, 'backlog')).toEqual(['KB-2', 'KB-1', 'KB-3', 'KB-4'])
      const last = boardReducer(board, {
        type: 'restore-card',
        card,
        columnId,
        index: Number.NaN,
      })
      expect(cardIds(last, 'backlog')).toEqual(['KB-1', 'KB-3', 'KB-4', 'KB-2'])
    })

    it('is a no-op when the id already exists', () => {
      const seed = createSeedBoard()
      const restored = boardReducer(seed, {
        type: 'restore-card',
        card: { ...seed.cards['KB-2'], title: 'Duplicate' },
        columnId: 'done',
        index: 0,
      })
      expect(restored).toBe(seed)
    })

    it('is a no-op for an unknown column', () => {
      const { board, card } = deleteAt('KB-2')
      const restored = boardReducer(board, {
        type: 'restore-card',
        card,
        columnId: 'archive' as ColumnId,
        index: 0,
      })
      expect(restored).toBe(board)
    })
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

  describe('comments', () => {
    const comment: Comment = {
      id: 'c-1',
      authorId: 'ava',
      body: '  First!  ',
      createdAt: '2026-10-12T09:30:00.000Z',
    }

    it('new cards start without comments', () => {
      const board = boardReducer(createSeedBoard(), {
        type: 'add-card',
        columnId: 'backlog',
        title: 'Fresh',
      })
      expect(board.cards['KB-10'].comments).toEqual([])
    })

    it('add-comment appends a trimmed comment in order', () => {
      const seed = createSeedBoard()
      const before = structuredClone(seed)
      const once = boardReducer(seed, { type: 'add-comment', cardId: 'KB-1', comment })
      const twice = boardReducer(once, {
        type: 'add-comment',
        cardId: 'KB-1',
        comment: { ...comment, id: 'c-2', body: 'Second' },
      })
      expect(twice.cards['KB-1'].comments.map((entry) => entry.body)).toEqual([
        'First!',
        'Second',
      ])
      expect(twice.cards['KB-2']).toBe(seed.cards['KB-2'])
      expect(seed).toEqual(before)
    })

    it('add-comment ignores blank bodies, unknown cards and duplicate ids', () => {
      const seed = createSeedBoard()
      expect(
        boardReducer(seed, {
          type: 'add-comment',
          cardId: 'KB-1',
          comment: { ...comment, body: ' \n ' },
        }),
      ).toBe(seed)
      expect(
        boardReducer(seed, { type: 'add-comment', cardId: 'KB-404', comment }),
      ).toBe(seed)
      const once = boardReducer(seed, { type: 'add-comment', cardId: 'KB-1', comment })
      expect(
        boardReducer(once, { type: 'add-comment', cardId: 'KB-1', comment }),
      ).toBe(once)
    })

    it('delete-comment removes only the author\'s own comment', () => {
      const board = boardReducer(createSeedBoard(), {
        type: 'add-comment',
        cardId: 'KB-1',
        comment,
      })
      expect(
        boardReducer(board, {
          type: 'delete-comment',
          cardId: 'KB-1',
          commentId: 'c-1',
          authorId: 'marcus',
        }),
      ).toBe(board)
      expect(
        boardReducer(board, {
          type: 'delete-comment',
          cardId: 'KB-1',
          commentId: 'c-404',
          authorId: 'ava',
        }),
      ).toBe(board)
      const deleted = boardReducer(board, {
        type: 'delete-comment',
        cardId: 'KB-1',
        commentId: 'c-1',
        authorId: 'ava',
      })
      expect(deleted.cards['KB-1'].comments).toEqual([])
    })

    it('update-card keeps existing comments', () => {
      const board = boardReducer(createSeedBoard(), {
        type: 'add-comment',
        cardId: 'KB-1',
        comment,
      })
      const updated = boardReducer(board, {
        type: 'update-card',
        cardId: 'KB-1',
        patch: { title: 'Renamed' },
      })
      expect(updated.cards['KB-1'].comments).toHaveLength(1)
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
