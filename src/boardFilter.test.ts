import { describe, expect, it } from 'vitest'
import {
  diffBoard,
  filterCardIds,
  isEmptyFilter,
  matchesFilter,
  reconcileCardIds,
  type BoardFilter,
} from './boardFilter'
import { boardReducer } from './boardReducer'
import { createGeneratedBoard } from './seed'
import type { Card } from './types'

const none: BoardFilter = { query: '', labels: [], assigneeId: '', view: 'project' }

const card: Card = {
  id: 'KB-7',
  title: 'Fix Onboarding flow',
  description: 'Reproduce on Safari',
  labels: ['bug', 'urgent'],
  assigneeId: 'ava',
  dueDate: null,
}

describe('isEmptyFilter', () => {
  it('is empty only without query, labels, assignee or a filtering view', () => {
    expect(isEmptyFilter(none)).toBe(true)
    expect(isEmptyFilter({ ...none, view: 'all' })).toBe(true)
    expect(isEmptyFilter({ ...none, query: 'a' })).toBe(false)
    expect(isEmptyFilter({ ...none, labels: ['bug'] })).toBe(false)
    expect(isEmptyFilter({ ...none, assigneeId: 'ava' })).toBe(false)
    expect(isEmptyFilter({ ...none, view: 'mine' })).toBe(false)
    expect(isEmptyFilter({ ...none, view: 'completed' })).toBe(false)
  })
})

describe('matchesFilter', () => {
  it('searches title, id and description case-insensitively', () => {
    expect(matchesFilter(card, 'backlog', { ...none, query: 'onboarding' })).toBe(true)
    expect(matchesFilter(card, 'backlog', { ...none, query: 'kb-7' })).toBe(true)
    expect(matchesFilter(card, 'backlog', { ...none, query: 'SAFARI' })).toBe(true)
    expect(matchesFilter(card, 'backlog', { ...none, query: 'billing' })).toBe(false)
  })

  it('matches any selected label and the assignee', () => {
    expect(matchesFilter(card, 'backlog', { ...none, labels: ['docs', 'bug'] })).toBe(true)
    expect(matchesFilter(card, 'backlog', { ...none, labels: ['docs'] })).toBe(false)
    expect(matchesFilter(card, 'backlog', { ...none, assigneeId: 'ava' })).toBe(true)
    expect(matchesFilter(card, 'backlog', { ...none, assigneeId: 'leo' })).toBe(false)
  })

  it('applies the My issues and Completed views', () => {
    expect(matchesFilter(card, 'backlog', { ...none, view: 'mine' })).toBe(true)
    expect(
      matchesFilter({ ...card, assigneeId: null }, 'backlog', { ...none, view: 'mine' }),
    ).toBe(false)
    expect(matchesFilter(card, 'backlog', { ...none, view: 'completed' })).toBe(false)
    expect(matchesFilter(card, 'done', { ...none, view: 'completed' })).toBe(true)
  })
})

describe('filterCardIds', () => {
  it('keeps board order per column and skips missing cards', () => {
    const board = createGeneratedBoard(300)
    const filter: BoardFilter = { ...none, query: 'on' }
    const result = filterCardIds(board.columns, board.cards, filter)
    for (const column of board.columns)
      expect(result[column.id]).toEqual(
        column.cardIds.filter((id) => matchesFilter(board.cards[id], column.id, filter)),
      )
    const columns = [{ id: 'backlog' as const, cardIds: ['missing', card.id] }]
    expect(filterCardIds(columns, { [card.id]: card }, none)).toEqual({
      backlog: [card.id],
    })
  })
})

describe('reconcileCardIds', () => {
  it('applies a previous result to the current column order', () => {
    const previous = { backlog: ['a', 'c'], done: ['x'] }
    const columns = [
      { id: 'backlog' as const, cardIds: ['c', 'b'] },
      { id: 'done' as const, cardIds: ['x', 'a'] },
    ]
    expect(reconcileCardIds(columns, previous)).toEqual({
      backlog: ['c'],
      done: ['x', 'a'],
    })
  })
})

describe('diffBoard', () => {
  it('sends the whole board first', () => {
    const board = createGeneratedBoard(20)
    const sync = diffBoard(null, board)
    expect(sync?.upserts).toHaveLength(20)
    expect(sync?.removed).toEqual([])
    expect(sync?.columns?.map((column) => column.cardIds)).toEqual(
      board.columns.map((column) => column.cardIds),
    )
  })

  it('sends only what changed', () => {
    const board = createGeneratedBoard(20)
    expect(diffBoard(board, board)).toBeNull()

    const id = board.columns[0].cardIds[0]
    const updated = boardReducer(board, {
      type: 'update-card',
      cardId: id,
      patch: { title: 'Renamed' },
    })
    expect(diffBoard(board, updated)).toEqual({
      type: 'sync',
      columns: null,
      upserts: [updated.cards[id]],
      removed: [],
    })

    const moved = boardReducer(board, { type: 'move-card', cardId: id, toColumn: 'done', toIndex: 0 })
    const moveSync = diffBoard(board, moved)
    expect(moveSync?.upserts).toEqual([])
    expect(moveSync?.columns?.find((column) => column.id === 'done')?.cardIds[0]).toBe(id)

    const deleted = boardReducer(board, { type: 'delete-card', cardId: id })
    expect(diffBoard(board, deleted)?.removed).toEqual([id])
  })
})
