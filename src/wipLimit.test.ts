import { describe, expect, it } from 'vitest'
import { isColumnFull, isValidWipLimit } from './wipLimit'
import type { Column } from './types'

function column(cardIds: string[], wipLimit: number | null): Column {
  return { id: 'backlog', title: 'Backlog', accent: '#000', cardIds, wipLimit }
}

describe('isValidWipLimit', () => {
  it('accepts integers in range', () => {
    expect(isValidWipLimit(1)).toBe(true)
    expect(isValidWipLimit(4)).toBe(true)
    expect(isValidWipLimit(999)).toBe(true)
  })

  it('rejects other values', () => {
    for (const value of [0, -1, 2.5, NaN, '3', null, undefined, 1000]) {
      expect(isValidWipLimit(value)).toBe(false)
    }
  })
})

describe('isColumnFull', () => {
  it('is never full without a limit', () => {
    expect(isColumnFull(column(['KB-1', 'KB-2'], null))).toBe(false)
    expect(isColumnFull(column([], null))).toBe(false)
  })

  it('is not full under the limit', () => {
    expect(isColumnFull(column(['KB-1'], 2))).toBe(false)
  })

  it('is full at the limit', () => {
    expect(isColumnFull(column(['KB-1', 'KB-2'], 2))).toBe(true)
  })

  it('is full over the limit', () => {
    expect(isColumnFull(column(['KB-1', 'KB-2', 'KB-3'], 2))).toBe(true)
  })
})
