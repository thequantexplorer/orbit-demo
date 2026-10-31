import { describe, expect, it } from 'vitest'
import {
  TITLE_MAX_LENGTH,
  isTitleTooLong,
  isTitleValid,
  titleLength,
} from './titleLimit'

describe('titleLength', () => {
  it('counts trimmed characters', () => {
    expect(titleLength('')).toBe(0)
    expect(titleLength('  Fix login  ')).toBe(9)
    expect(titleLength('Ship 🚀')).toBe(6)
  })
})

describe('isTitleValid', () => {
  it('accepts titles up to the limit', () => {
    expect(isTitleValid('a')).toBe(true)
    expect(isTitleValid('a'.repeat(TITLE_MAX_LENGTH))).toBe(true)
    expect(isTitleValid(` ${'a'.repeat(TITLE_MAX_LENGTH)} `)).toBe(true)
  })

  it('rejects empty and over-limit titles', () => {
    expect(isTitleValid('')).toBe(false)
    expect(isTitleValid('   ')).toBe(false)
    expect(isTitleValid('a'.repeat(TITLE_MAX_LENGTH + 1))).toBe(false)
  })
})

describe('isTitleTooLong', () => {
  it('flags titles past the limit only', () => {
    expect(isTitleTooLong('a'.repeat(TITLE_MAX_LENGTH))).toBe(false)
    expect(isTitleTooLong('a'.repeat(TITLE_MAX_LENGTH + 1))).toBe(true)
  })
})
