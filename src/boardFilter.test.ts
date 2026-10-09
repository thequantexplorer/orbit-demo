import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { diffCards, indexCard, matchesCriteria, type FilterCriteria } from './boardFilter'
import type { FromWorker, ToWorker } from './boardFilter'
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

describe('worker protocol', () => {
  const worker = {
    onmessage: null as ((event: { data: ToWorker }) => void) | null,
    postMessage: vi.fn<(response: FromWorker) => void>(),
  }
  const send = (data: ToWorker) => worker.onmessage!({ data })
  const filter = (requestId: number, query: string) => {
    send({ type: 'filter', requestId, criteria: criteria({ query }) })
    return worker.postMessage.mock.lastCall?.[0]
  }

  beforeAll(async () => {
    vi.stubGlobal('self', worker)
    await import('./filterWorker')
  })
  afterAll(() => vi.unstubAllGlobals())

  it('updates the index for add/edit/delete without retaining removed matches', () => {
    const initial = { 'KB-1': card('KB-1', { title: 'Onboarding' }) }
    send(diffCards(null, initial))
    expect(filter(1, 'onboarding')).toEqual({ requestId: 1, matched: ['KB-1'] })
    const added = {
      ...initial,
      'KB-2': card('KB-2', { title: 'ONBOARDING' }),
      'KB-3': card('KB-3', { title: 'Unrelated' }),
    }
    send(diffCards(initial, added))
    expect(filter(2, 'onboarding')?.matched).toEqual(['KB-1', 'KB-2'])
    const edited = { ...added, 'KB-1': card('KB-1', { title: 'Other' }) }
    send(diffCards(added, edited))
    expect(filter(3, 'onboarding')?.matched).toEqual(['KB-2'])
    const removed = { 'KB-1': edited['KB-1'], 'KB-3': edited['KB-3'] }
    send(diffCards(edited, removed))
    expect(filter(4, 'onboarding')?.matched).toEqual([])
  })

  it('reindexes restored cards and a full reset; echoes request ids', () => {
    const original = { 'KB-1': card('KB-1', { title: 'Onboarding' }) }
    send(diffCards(null, original))
    const changed = { 'KB-1': card('KB-1', { title: 'Changed' }) }
    send(diffCards(original, changed))
    send(diffCards(changed, original))
    expect(filter(99, 'onboarding')).toEqual({ requestId: 99, matched: ['KB-1'] })
    send(diffCards(null, { 'KB-10': card('KB-10') }))
    expect(filter(100, '')).toEqual({ requestId: 100, matched: ['KB-10'] })
  })
})
