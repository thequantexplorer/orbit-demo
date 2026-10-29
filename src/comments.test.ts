import { describe, expect, it } from 'vitest'
import { createComment, formatCommentTime, isValidComment } from './comments'

describe('createComment', () => {
  it('trims the body and stamps an id and ISO time', () => {
    const now = new Date('2026-10-12T09:30:00Z')
    const comment = createComment('ava', '  Looks good  ', now)
    expect(comment).toMatchObject({
      authorId: 'ava',
      body: 'Looks good',
      createdAt: '2026-10-12T09:30:00.000Z',
    })
    expect(comment.id).toMatch(/^c-/)
    expect(createComment('ava', 'x', now).id).not.toBe(comment.id)
  })
})

describe('isValidComment', () => {
  const valid = {
    id: 'c-1',
    authorId: 'ava',
    body: 'Hi',
    createdAt: '2026-10-12T09:30:00.000Z',
  }

  it('accepts a well-formed comment', () => {
    expect(isValidComment(valid)).toBe(true)
  })

  it('rejects malformed comments', () => {
    for (const value of [
      null,
      'hi',
      { ...valid, id: '' },
      { ...valid, id: 1 },
      { ...valid, authorId: null },
      { ...valid, body: '   ' },
      { ...valid, body: 42 },
      { ...valid, createdAt: 'yesterday' },
      { id: 'c-1', authorId: 'ava', body: 'Hi' },
    ])
      expect(isValidComment(value)).toBe(false)
  })
})

describe('formatCommentTime', () => {
  const now = new Date('2026-10-12T12:00:00')
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

  it('uses short relative times for the last week', () => {
    expect(formatCommentTime(ago(20_000), now)).toBe('just now')
    expect(formatCommentTime(ago(-5_000), now)).toBe('just now')
    expect(formatCommentTime(ago(5 * 60_000), now)).toBe('5m ago')
    expect(formatCommentTime(ago(3 * 3_600_000), now)).toBe('3h ago')
    expect(formatCommentTime(ago(2 * 86_400_000), now)).toBe('2d ago')
  })

  it('falls back to a short date, adding the year when it differs', () => {
    expect(formatCommentTime(new Date('2026-09-01T10:00:00').toISOString(), now)).toBe('Sep 1')
    expect(formatCommentTime(new Date('2025-12-24T10:00:00').toISOString(), now)).toBe(
      'Dec 24, 2025',
    )
  })
})
