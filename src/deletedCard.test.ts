import { describe, expect, it } from 'vitest'
import { createSeedBoard } from './data'
import {
  captureDeletedCard,
  deletedCardMessage,
  isUndoShortcut,
  truncateTitle,
} from './deletedCard'

const keys = { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false }

describe('captureDeletedCard', () => {
  it('records the card, its column, and index', () => {
    const board = createSeedBoard()
    expect(captureDeletedCard(board, 'KB-3')).toEqual({
      card: board.cards['KB-3'],
      columnId: 'backlog',
      index: 2,
    })
  })

  it('returns null for an unknown card', () => {
    expect(captureDeletedCard(createSeedBoard(), 'KB-404')).toBeNull()
  })
})

describe('deletedCardMessage', () => {
  it('includes the id and a truncated title', () => {
    const card = createSeedBoard().cards['KB-1']
    expect(deletedCardMessage({ ...card, id: 'KB-12', title: 'Fix login' })).toBe(
      'Deleted KB-12 Fix login',
    )
    const long = deletedCardMessage({ ...card, title: 'x'.repeat(60) })
    expect(long).toBe(`Deleted KB-1 ${'x'.repeat(39)}…`)
  })

  it('leaves short titles alone and trims whitespace', () => {
    expect(truncateTitle('  Short  ')).toBe('Short')
    expect(truncateTitle('a'.repeat(40))).toBe('a'.repeat(40))
    expect(truncateTitle('abcdef', 4)).toBe('abc…')
  })
})

describe('isUndoShortcut', () => {
  it('accepts Ctrl+Z and Cmd+Z outside text fields', () => {
    expect(isUndoShortcut({ ...keys, key: 'z', ctrlKey: true }, false)).toBe(true)
    expect(isUndoShortcut({ ...keys, key: 'Z', metaKey: true }, false)).toBe(true)
  })

  it('ignores redo, plain Z, other modifiers, and text fields', () => {
    expect(
      isUndoShortcut({ ...keys, key: 'z', ctrlKey: true, shiftKey: true }, false),
    ).toBe(false)
    expect(isUndoShortcut({ ...keys, key: 'z' }, false)).toBe(false)
    expect(
      isUndoShortcut({ ...keys, key: 'z', ctrlKey: true, altKey: true }, false),
    ).toBe(false)
    expect(isUndoShortcut({ ...keys, key: 'z', ctrlKey: true }, true)).toBe(false)
  })
})
