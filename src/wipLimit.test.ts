import { describe, expect, it } from 'vitest'
import { isOverWipLimit, isValidWipLimit, parseWipLimit } from './wipLimit'

describe('parseWipLimit', () => {
  it('clears an empty limit and parses positive integers', () => {
    expect(parseWipLimit('')).toBeNull()
    expect(parseWipLimit('  ')).toBeNull()
    expect(parseWipLimit('3')).toBe(3)
    expect(parseWipLimit(' 12 ')).toBe(12)
  })

  it('rejects invalid limits', () => {
    for (const input of ['0', '-1', '2.5', 'abc']) {
      expect(parseWipLimit(input)).toBeUndefined()
    }
  })
})

describe('isValidWipLimit', () => {
  it('accepts positive integers', () => {
    expect(isValidWipLimit(1)).toBe(true)
    expect(isValidWipLimit(4)).toBe(true)
  })

  it('rejects other values', () => {
    for (const value of [0, -1, 2.5, '3', null, undefined]) {
      expect(isValidWipLimit(value)).toBe(false)
    }
  })
})

describe('isOverWipLimit', () => {
  it('is true only when the count exceeds a configured limit', () => {
    expect(isOverWipLimit(4, 3)).toBe(true)
    expect(isOverWipLimit(3, 3)).toBe(false)
    expect(isOverWipLimit(10, null)).toBe(false)
  })
})
