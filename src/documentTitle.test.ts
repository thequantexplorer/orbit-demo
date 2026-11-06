import { describe, expect, it } from 'vitest'
import { documentTitle } from './documentTitle'

describe('documentTitle', () => {
  it('names the project view by its layout', () => {
    expect(documentTitle('project', 'board')).toBe('Board · Orbit')
    expect(documentTitle('project', 'list')).toBe('List · Orbit')
  })

  it('names the other views', () => {
    expect(documentTitle('all', 'board')).toBe('All issues · Orbit')
    expect(documentTitle('mine', 'list')).toBe('My issues · Orbit')
    expect(documentTitle('completed', 'board')).toBe('Completed issues · Orbit')
    expect(documentTitle('overview', 'list')).toBe('Overview · Orbit')
  })
})
