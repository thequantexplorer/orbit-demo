import { describe, expect, it } from 'vitest'
import { isValidPriority, PRIORITY_ORDER } from './priority'

describe('isValidPriority', () => {
  it('accepts each priority level', () => {
    for (const priority of PRIORITY_ORDER)
      expect(isValidPriority(priority)).toBe(true)
  })

  it('rejects anything else', () => {
    for (const value of [null, undefined, '', 'High', 'urgent', 2, {}])
      expect(isValidPriority(value)).toBe(false)
  })
})
