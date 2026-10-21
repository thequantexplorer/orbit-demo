import { describe, expect, it } from 'vitest'
import { createGeneratedBoard, parseSeedCount } from './seed'

describe('parseSeedCount', () => {
  it('reads a positive integer from ?seed', () => {
    expect(parseSeedCount('?seed=5000')).toBe(5000)
    expect(parseSeedCount('?foo=1&seed=12')).toBe(12)
  })

  it('ignores a missing or invalid seed', () => {
    expect(parseSeedCount('')).toBeNull()
    expect(parseSeedCount('?seed=')).toBeNull()
    expect(parseSeedCount('?seed=0')).toBeNull()
    expect(parseSeedCount('?seed=-3')).toBeNull()
    expect(parseSeedCount('?seed=abc')).toBeNull()
  })

  it('caps very large counts', () => {
    expect(parseSeedCount('?seed=999999999')).toBe(100_000)
  })
})

describe('createGeneratedBoard', () => {
  it('creates exactly N cards across all four columns', () => {
    const board = createGeneratedBoard(1000)
    const placed = board.columns.flatMap((column) => column.cardIds)
    expect(Object.keys(board.cards)).toHaveLength(1000)
    expect(new Set(placed).size).toBe(1000)
    expect(board.columns.map((column) => column.id)).toEqual([
      'backlog',
      'in-progress',
      'review',
      'done',
    ])
    expect(board.columns.map((column) => column.wipLimit)).toEqual([
      null,
      null,
      null,
      null,
    ])
    for (const column of board.columns)
      expect(column.cardIds.length).toBeGreaterThan(0)
    expect(board.nextCardNumber).toBe(1001)
    expect(board.history).toEqual({})
  })

  it('is deterministic', () => {
    expect(createGeneratedBoard(200)).toEqual(createGeneratedBoard(200))
  })
})
