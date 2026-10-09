import { describe, expect, it } from 'vitest'
import { buildListRows, rangeWithPinned } from './virtualList'
import type { Card, Column } from './types'

const range = { startIndex: 10, endIndex: 12, overscan: 1, count: 100 }

describe('rangeWithPinned', () => {
  it('returns the overscanned visible range', () => {
    expect(rangeWithPinned(range, -1)).toEqual([9, 10, 11, 12, 13])
  })

  it('adds a pinned index outside the range in order', () => {
    expect(rangeWithPinned(range, 50)).toEqual([9, 10, 11, 12, 13, 50])
    expect(rangeWithPinned(range, 2)).toEqual([2, 9, 10, 11, 12, 13])
  })

  it('does not duplicate a pinned index inside the range', () => {
    expect(rangeWithPinned(range, 11)).toEqual([9, 10, 11, 12, 13])
  })

  it('ignores a pinned index past the end', () => {
    expect(rangeWithPinned(range, 100)).toEqual([9, 10, 11, 12, 13])
  })
})

const card = (id: string): Card => ({
  id,
  title: id,
  description: '',
  labels: [],
  assigneeId: null,
  dueDate: null,
})
const column = (id: Column['id'], cards: Card[]) => ({
  id,
  title: id,
  accent: '',
  cardIds: cards.map((entry) => entry.id),
  cards,
})

describe('buildListRows', () => {
  it('emits a header per group, then its cards or an empty row', () => {
    const rows = buildListRows([
      column('backlog', [card('A-1'), card('A-2')]),
      column('done', []),
    ])
    expect(rows.map((row) => `${row.type}:${row.key}`)).toEqual([
      'header:header-backlog',
      'card:A-1',
      'card:A-2',
      'header:header-done',
      'empty:empty-done',
    ])
    expect(rows[0]).toMatchObject({ type: 'header', count: 2 })
  })
})
