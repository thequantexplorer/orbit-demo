import { describe, expect, it } from 'vitest'
import { issueLink, parseIssueParam, withoutIssueParam } from './issueLink'

describe('issueLink', () => {
  it('adds the issue ID as a query param', () => {
    expect(issueLink('KB-12', 'http://localhost:5173/')).toBe(
      'http://localhost:5173/?issue=KB-12',
    )
  })

  it('keeps other params, replaces an existing issue, and drops the hash', () => {
    expect(
      issueLink('KB-3', 'https://orbit.test/app?seed=50&issue=KB-1#top'),
    ).toBe('https://orbit.test/app?seed=50&issue=KB-3')
  })

  it('round-trips through parseIssueParam', () => {
    const url = new URL(issueLink('KB-7', 'http://localhost:5173/'))
    expect(parseIssueParam(url.search)).toBe('KB-7')
  })
})

describe('parseIssueParam', () => {
  it('returns null when the param is missing or blank', () => {
    expect(parseIssueParam('')).toBeNull()
    expect(parseIssueParam('?seed=10')).toBeNull()
    expect(parseIssueParam('?issue=%20')).toBeNull()
  })
})

describe('withoutIssueParam', () => {
  it('removes only the issue param', () => {
    expect(
      withoutIssueParam('http://localhost:5173/?seed=5&issue=KB-2'),
    ).toBe('http://localhost:5173/?seed=5')
  })

  it('returns null when there is nothing to remove', () => {
    expect(withoutIssueParam('http://localhost:5173/?seed=5')).toBeNull()
  })
})
