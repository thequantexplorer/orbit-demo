import { describe, expect, it } from 'vitest'
import { boardReducer } from './boardReducer'
import {
  CONFETTI_COLORS,
  createConfetti,
  isShipped,
  prefersReducedMotion,
} from './celebration'
import { createSeedBoard } from './data'
import type { BoardState, ColumnId } from './types'

function firstCardIn(board: BoardState, columnId: ColumnId) {
  return board.columns.find((column) => column.id === columnId)!.cardIds[0]
}

function moveTo(board: BoardState, cardId: string, toColumn: ColumnId) {
  return boardReducer(board, {
    type: 'move-card',
    cardId,
    toColumn,
    toIndex: 0,
  })
}

describe('isShipped', () => {
  it('celebrates cards moved into Done from any other column', () => {
    const board = createSeedBoard()
    for (const columnId of ['backlog', 'in-progress', 'review'] as const) {
      const cardId = firstCardIn(board, columnId)
      expect(isShipped(board, moveTo(board, cardId, 'done'), cardId)).toBe(true)
    }
  })

  it('ignores reorders inside Done, moves out of Done, and other moves', () => {
    const board = createSeedBoard()
    const doneId = firstCardIn(board, 'done')
    const reordered = boardReducer(board, {
      type: 'reorder-card',
      columnId: 'done',
      fromIndex: 0,
      toIndex: 1,
    })
    expect(isShipped(board, reordered, doneId)).toBe(false)
    expect(isShipped(board, moveTo(board, doneId, 'review'), doneId)).toBe(false)

    const backlogId = firstCardIn(board, 'backlog')
    const toReview = moveTo(board, backlogId, 'review')
    expect(isShipped(board, toReview, backlogId)).toBe(false)
    expect(isShipped(board, board, 'missing')).toBe(false)
  })
})

describe('createConfetti', () => {
  it('fans pieces upward using theme colors', () => {
    const pieces = createConfetti(20, () => 0.5)
    expect(pieces).toHaveLength(20)
    for (const piece of pieces) {
      expect(piece.dy).toBeLessThan(0)
      expect(CONFETTI_COLORS).toContain(piece.color)
    }
    expect(pieces[0].dx).toBeLessThan(0)
    expect(pieces.at(-1)!.dx).toBeGreaterThan(0)
  })

  it('is deterministic for a given random source', () => {
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const first = createConfetti(12, random)
    seed = 1
    expect(createConfetti(12, random)).toEqual(first)
  })
})

describe('prefersReducedMotion', () => {
  it('reads the reduced-motion media query', () => {
    const original = globalThis.window
    for (const matches of [true, false]) {
      globalThis.window = {
        matchMedia: (query: string) => ({
          matches: matches && query === '(prefers-reduced-motion: reduce)',
        }),
      } as unknown as Window & typeof globalThis
      expect(prefersReducedMotion()).toBe(matches)
    }
    globalThis.window = original
  })

  it('defaults to motion when matchMedia is unavailable', () => {
    expect(prefersReducedMotion()).toBe(false)
  })
})
