import { describe, expect, it } from 'vitest'
import { createGeneratedBoard, parseSeedCount } from './seed'
import { createSeedBoard } from './data'
import { fromDateKey, toDateKey } from './dueDate'
import { getWeekStart } from './weeklyStats'

describe('createSeedBoard', () => {
  it('marks its two Done cards complete this week', () => {
    const todayKey = toDateKey(new Date())
    const weekStart = getWeekStart(todayKey)
    const tuesday = fromDateKey(weekStart)
    tuesday.setDate(tuesday.getDate() + 1)
    const tuesdayKey = toDateKey(tuesday)
    const board = createSeedBoard()

    expect(board.cards['KB-8'].completedAt).toBe(weekStart)
    expect(board.cards['KB-9'].completedAt).toBe(
      tuesdayKey < todayKey ? tuesdayKey : todayKey,
    )
    expect(
      Object.values(board.cards)
        .filter((card) => card.id !== 'KB-8' && card.id !== 'KB-9')
        .every((card) => card.completedAt === null),
    ).toBe(true)
  })
})

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
    expect(Object.values(board.cards).every((card) => card.completedAt === null)).toBe(
      true,
    )
    expect(board.nextCardNumber).toBe(1001)
  })

  it('is deterministic', () => {
    expect(createGeneratedBoard(200)).toEqual(createGeneratedBoard(200))
  })
})
