import { describe, expect, it } from 'vitest'
import { cardMatches, reuseIfSame, searchText } from './boardFilter'
import type { Card } from './types'

const card: Card = {
  id: 'KB-12',
  title: 'Polish Onboarding',
  description: 'First-run Tour',
  labels: ['design', 'docs'],
  assigneeId: 'ava',
  dueDate: null,
}
const noFilter = { query: '', labels: [], assigneeId: '' }

describe('searchText', () => {
  it('lowercases title, id and description', () => {
    expect(searchText(card)).toBe('polish onboarding kb-12 first-run tour')
  })

  it('reflects edits, which produce a new card object', () => {
    expect(searchText({ ...card, title: 'Renamed' })).toContain('renamed')
  })
})

describe('cardMatches', () => {
  it('matches everything without filters', () => {
    expect(cardMatches(card, noFilter)).toBe(true)
  })

  it('matches the lowercased query against title, id and description', () => {
    expect(cardMatches(card, { ...noFilter, query: 'onboarding' })).toBe(true)
    expect(cardMatches(card, { ...noFilter, query: 'kb-12' })).toBe(true)
    expect(cardMatches(card, { ...noFilter, query: 'tour' })).toBe(true)
    expect(cardMatches(card, { ...noFilter, query: 'billing' })).toBe(false)
  })

  it('matches any selected label and the assignee', () => {
    expect(cardMatches(card, { ...noFilter, labels: ['bug', 'docs'] })).toBe(
      true,
    )
    expect(cardMatches(card, { ...noFilter, labels: ['bug'] })).toBe(false)
    expect(cardMatches(card, { ...noFilter, assigneeId: 'ava' })).toBe(true)
    expect(cardMatches(card, { ...noFilter, assigneeId: 'leo' })).toBe(false)
  })
})

describe('reuseIfSame', () => {
  it('keeps the previous array when the items are identical', () => {
    const previous = [card]
    expect(reuseIfSame(previous, [card])).toBe(previous)
    const empty: Card[] = []
    expect(reuseIfSame(empty, [])).toBe(empty)
  })

  it('returns the new array when anything differs', () => {
    const next = [{ ...card }]
    expect(reuseIfSame([card], next)).toBe(next)
    expect(reuseIfSame(undefined, next)).toBe(next)
    expect(reuseIfSame([card, card], [card])).not.toHaveLength(2)
  })
})
