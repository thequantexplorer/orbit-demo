import { describe, expect, it } from 'vitest'
import { matchesSearch } from './search'

const card = {
  id: 'ORB-12',
  title: 'Fix login redirect',
  description: 'Users land on the billing page after signing in.',
}

describe('matchesSearch', () => {
  it('matches titles case-insensitively', () => {
    expect(matchesSearch(card, 'login')).toBe(true)
    expect(matchesSearch(card, 'LOGIN Redirect')).toBe(true)
    expect(matchesSearch(card, '  redirect ')).toBe(true)
  })

  it('matches every card for an empty query', () => {
    expect(matchesSearch(card, '')).toBe(true)
  })

  it('ignores descriptions and IDs', () => {
    expect(matchesSearch(card, 'billing')).toBe(false)
    expect(matchesSearch(card, 'ORB-12')).toBe(false)
    expect(matchesSearch(card, 'redirect ORB')).toBe(false)
  })
})
