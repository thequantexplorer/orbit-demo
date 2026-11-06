import { describe, expect, it } from 'vitest'
import {
  DESCRIPTION_LIMIT,
  countCharacters,
  isOverDescriptionLimit,
} from './descriptionLimit'

describe('countCharacters', () => {
  it('counts code points, not UTF-16 units', () => {
    expect(countCharacters('')).toBe(0)
    expect(countCharacters('hello')).toBe(5)
    expect(countCharacters('ship it 🚀')).toBe(9)
  })
})

describe('isOverDescriptionLimit', () => {
  it('allows up to the limit and flags anything past it', () => {
    expect(isOverDescriptionLimit('a'.repeat(DESCRIPTION_LIMIT))).toBe(false)
    expect(isOverDescriptionLimit('a'.repeat(DESCRIPTION_LIMIT + 1))).toBe(true)
  })
})
