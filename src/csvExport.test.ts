import { describe, expect, it } from 'vitest'
import { boardToCsv, csvFileName, escapeCsvField } from './csvExport'
import { createSeedBoard } from './data'
import type { BoardState } from './types'

describe('escapeCsvField', () => {
  it('leaves plain values alone', () => {
    expect(escapeCsvField('Set up CI')).toBe('Set up CI')
    expect(escapeCsvField('')).toBe('')
  })

  it('quotes commas, quotes and newlines', () => {
    expect(escapeCsvField('a, b')).toBe('"a, b"')
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvField('line 1\nline 2')).toBe('"line 1\nline 2"')
  })

  it('neutralizes spreadsheet formulas', () => {
    expect(escapeCsvField('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)")
    expect(escapeCsvField('+1')).toBe("'+1")
    expect(escapeCsvField('-1')).toBe("'-1")
    expect(escapeCsvField('@cmd')).toBe("'@cmd")
    expect(escapeCsvField('=A1,B1')).toBe(`"'=A1,B1"`)
  })
})

describe('boardToCsv', () => {
  it('exports every issue in column order with a header row', () => {
    const board = createSeedBoard()
    const lines = boardToCsv(board).split('\r\n')
    const ids = board.columns.flatMap((column) => column.cardIds)
    expect(lines[0]).toBe('ID,Title,Status,Labels,Assignee,Due date,Description')
    expect(lines).toHaveLength(ids.length + 1)
    expect(lines.slice(1).map((line) => line.split(',')[0])).toEqual(ids)
  })

  it('maps status, labels, assignee and due date to readable values', () => {
    const board: BoardState = {
      nextCardNumber: 3,
      columns: [
        { id: 'backlog', title: 'Backlog', accent: '', cardIds: ['KB-1'], wipLimit: null },
        { id: 'done', title: 'Done', accent: '', cardIds: ['KB-2', 'KB-missing'], wipLimit: null },
      ],
      cards: {
        'KB-1': {
          id: 'KB-1',
          title: 'Fix login, again',
          description: 'Users see "Oops"',
          labels: ['bug', 'urgent'],
          assigneeId: 'ava',
          dueDate: '2026-11-10',
        },
        'KB-2': {
          id: 'KB-2',
          title: 'Docs',
          description: '',
          labels: [],
          assigneeId: null,
          dueDate: null,
        },
      },
    }
    expect(boardToCsv(board).split('\r\n').slice(1)).toEqual([
      'KB-1,"Fix login, again",Backlog,Bug; Urgent,Ava Chen,2026-11-10,"Users see ""Oops"""',
      'KB-2,Docs,Done,,,,',
    ])
  })
})

describe('csvFileName', () => {
  it('uses the local calendar date', () => {
    expect(csvFileName(new Date(2026, 0, 5, 23, 30))).toBe('orbit-issues-2026-01-05.csv')
  })
})
