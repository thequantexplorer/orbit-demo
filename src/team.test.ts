import { describe, expect, it } from 'vitest'
import { boardReducer } from './boardReducer'
import { createSeedBoard } from './data'
import { getTeamWorkload } from './team'

function summary(board = createSeedBoard()) {
  return getTeamWorkload(board).members.map(({ person, openCount, labels }) => [
    person.id,
    openCount,
    labels,
  ])
}

describe('getTeamWorkload', () => {
  it('counts open issues and their labels per person from the seed board', () => {
    expect(summary()).toEqual([
      ['ava', 2, ['feature', 'docs']],
      ['marcus', 2, ['feature', 'devops']],
      ['priya', 1, ['design']],
      ['leo', 1, ['bug', 'urgent']],
      ['sofia', 1, ['feature']],
    ])
    expect(getTeamWorkload(createSeedBoard()).totalOpen).toBe(7)
  })

  it('drops issues once they move to Done', () => {
    const board = boardReducer(createSeedBoard(), {
      type: 'move-card',
      cardId: 'KB-4',
      toColumn: 'done',
      toIndex: 0,
    })
    const leo = getTeamWorkload(board).members.find(
      (member) => member.person.id === 'leo',
    )
    expect(leo).toMatchObject({ openCount: 0, labels: [] })
    expect(getTeamWorkload(board).totalOpen).toBe(6)
  })
})
