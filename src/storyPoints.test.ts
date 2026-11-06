import { describe, expect, it } from 'vitest'
import { formatStoryPoints, isValidStoryPoints } from './storyPoints'

describe('isValidStoryPoints', () => {
  it('accepts the Fibonacci scale', () => {
    for (const value of [1, 2, 3, 5, 8, 13]) {
      expect(isValidStoryPoints(value)).toBe(true)
    }
  })

  it('rejects other values', () => {
    for (const value of [0, 4, 21, 2.5, -1, '3', null, undefined]) {
      expect(isValidStoryPoints(value)).toBe(false)
    }
  })
})

describe('formatStoryPoints', () => {
  it('pluralizes', () => {
    expect(formatStoryPoints(1)).toBe('1 point')
    expect(formatStoryPoints(5)).toBe('5 points')
  })
})
