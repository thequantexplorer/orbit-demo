import { describe, expect, it } from 'vitest'
import { diffCards, indexCard, matchesCriteria, type FilterCriteria } from './boardFilter'
import type { Card } from './types'

const card = (id: string, extra: Partial<Card> = {}): Card => ({
  id,
  title: `Title ${id}`,
  description: '',
  labels: [],
  assigneeId: null,
  dueDate: null,
  ...extra,
})
const criteria = (extra: Partial<FilterCriteria> = {}): FilterCriteria => ({
  query: '',
  labels: [],
  assigneeId: '',
  mineOnly: false,
  ...extra,
})

describe('matchesCriteria', () => {
  it('matches the lowercased title, id and description', () => {
    const indexed = indexCard(card('KB-1', { description: 'Onboarding copy' }))
    expect(matchesCriteria(indexed, criteria({ query: 'onboarding' }))).toBe(true)
    expect(matchesCriteria(indexed, criteria({ query: 'kb-1' }))).toBe(true)
    expect(matchesCriteria(indexed, criteria({ query: 'billing' }))).toBe(false)
  })

  it('applies label, assignee and "mine" filters', () => {
    const indexed = indexCard(card('KB-1', { labels: ['bug'], assigneeId: 'ava' }))
    expect(matchesCriteria(indexed, criteria({ labels: ['bug', 'docs'] }))).toBe(true)
    expect(matchesCriteria(indexed, criteria({ labels: ['docs'] }))).toBe(false)
    expect(matchesCriteria(indexed, criteria({ assigneeId: 'ava' }))).toBe(true)
    expect(matchesCriteria(indexed, criteria({ assigneeId: 'leo' }))).toBe(false)
    expect(matchesCriteria(indexed, criteria({ mineOnly: true }))).toBe(true)
    expect(
      matchesCriteria(indexCard(card('KB-2')), criteria({ mineOnly: true })),
    ).toBe(false)
  })
})

describe('diffCards', () => {
  it('sends every card on the first sync', () => {
    const cards = { 'KB-1': card('KB-1') }
    expect(diffCards(null, cards)).toEqual({
      type: 'sync',
      reset: true,
      upserts: [cards['KB-1']],
      removes: [],
    })
  })

  it('sends only added, edited and removed cards', () => {
    const kept = card('KB-1')
    const prev = { 'KB-1': kept, 'KB-2': card('KB-2'), 'KB-3': card('KB-3') }
    const edited = card('KB-2', { title: 'New' })
    const added = card('KB-4')
    const next = { 'KB-1': kept, 'KB-2': edited, 'KB-4': added }
    expect(diffCards(prev, next)).toEqual({
      type: 'sync',
      reset: false,
      upserts: [edited, added],
      removes: ['KB-3'],
    })
  })
})
