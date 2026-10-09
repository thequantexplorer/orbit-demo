import { describe, expect, it } from 'vitest'
import {
  countCards,
  filterColumns,
  searchTextOf,
  type BoardFilter,
} from './boardFilter'
import { createGeneratedBoard } from './seed'
import type { BoardState, Card } from './types'

function card(id: string, patch: Partial<Card> = {}): Card {
  return {
    id,
    title: `Card ${id}`,
    description: '',
    labels: [],
    assigneeId: null,
    dueDate: null,
    ...patch,
  }
}

const board: BoardState = {
  nextCardNumber: 5,
  cards: {
    'KB-1': card('KB-1', {
      title: 'Fix Login',
      labels: ['bug'],
      assigneeId: 'ava',
    }),
    'KB-2': card('KB-2', {
      description: 'Onboarding flow',
      labels: ['bug', 'design'],
    }),
    'KB-3': card('KB-3', { labels: ['docs'], assigneeId: 'ava' }),
    'KB-4': card('KB-4', { title: 'Ship it', assigneeId: 'liam' }),
  },
  columns: [
    { id: 'backlog', title: 'Backlog', accent: '', cardIds: ['KB-1', 'KB-2'] },
    { id: 'in-progress', title: 'In Progress', accent: '', cardIds: ['KB-3'] },
    { id: 'review', title: 'Review', accent: '', cardIds: [] },
    { id: 'done', title: 'Done', accent: '', cardIds: ['KB-4', 'KB-missing'] },
  ],
}

const all: BoardFilter = {
  query: '',
  labels: [],
  assigneeId: '',
  view: 'project',
}
const ids = (cards: Card[]) => cards.map((entry) => entry.id)

describe('searchTextOf', () => {
  it('lowercases title, id and description', () => {
    expect(searchTextOf(board.cards['KB-2'])).toBe(
      'card kb-2 kb-2 onboarding flow',
    )
  })
})

describe('filterColumns', () => {
  it('keeps every existing card without filters', () => {
    const result = filterColumns(board, all)
    expect(ids(result.backlog)).toEqual(['KB-1', 'KB-2'])
    expect(ids(result['in-progress'])).toEqual(['KB-3'])
    expect(result.review).toEqual([])
    expect(ids(result.done)).toEqual(['KB-4'])
  })

  it('matches the query case-insensitively against title, id and description', () => {
    expect(
      ids(filterColumns(board, { ...all, query: 'LOGIN' }).backlog),
    ).toEqual(['KB-1'])
    expect(
      ids(filterColumns(board, { ...all, query: 'onboard' }).backlog),
    ).toEqual(['KB-2'])
    expect(ids(filterColumns(board, { ...all, query: 'kb-4' }).done)).toEqual([
      'KB-4',
    ])
  })

  it('applies label, assignee and view filters', () => {
    expect(
      ids(filterColumns(board, { ...all, labels: ['design', 'docs'] }).backlog),
    ).toEqual(['KB-2'])
    const liam = filterColumns(board, { ...all, assigneeId: 'liam' })
    expect(ids(liam.done)).toEqual(['KB-4'])
    expect(liam.backlog).toEqual([])
    const mine = filterColumns(board, { ...all, view: 'mine' })
    expect(ids(mine.backlog)).toEqual(['KB-1'])
    expect(ids(mine['in-progress'])).toEqual(['KB-3'])
    const completed = filterColumns(board, { ...all, view: 'completed' })
    expect(completed.backlog).toEqual([])
    expect(ids(completed.done)).toEqual(['KB-4'])
  })

  it('matches a naive filter on a generated board', () => {
    const generated = createGeneratedBoard(600)
    const filter: BoardFilter = {
      query: 'On',
      labels: ['bug', 'feature'],
      assigneeId: '',
      view: 'project',
    }
    const result = filterColumns(generated, filter)
    for (const column of generated.columns) {
      const expected = column.cardIds
        .map((id) => generated.cards[id])
        .filter(
          (entry) =>
            `${entry.title} ${entry.id} ${entry.description}`
              .toLowerCase()
              .includes('on') &&
            filter.labels.some((label) => entry.labels.includes(label)),
        )
      expect(result[column.id]).toEqual(expected)
    }
  })

  it('reuses previous arrays for columns whose matches did not change', () => {
    const before = filterColumns(board, all)
    const edited: BoardState = {
      ...board,
      cards: {
        ...board.cards,
        'KB-3': { ...board.cards['KB-3'], title: 'Edited' },
      },
    }
    const after = filterColumns(edited, all, before)
    expect(after.backlog).toBe(before.backlog)
    expect(after.done).toBe(before.done)
    expect(after['in-progress']).not.toBe(before['in-progress'])
    expect(after['in-progress'][0].title).toBe('Edited')
  })
})

describe('countCards', () => {
  it('counts cards per label and per assignee', () => {
    const counts = countCards(board.cards)
    expect(counts.labels).toEqual({
      bug: 2,
      feature: 0,
      design: 1,
      docs: 1,
      devops: 0,
      urgent: 0,
    })
    expect(counts.assignees).toEqual({ ava: 2, liam: 1 })
  })
})
