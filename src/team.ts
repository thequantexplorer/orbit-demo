import { ASSIGNEES, LABEL_ORDER } from './data'
import type { Assignee, BoardState, LabelId } from './types'

export interface TeamMemberWorkload {
  person: Assignee
  openCount: number
  labels: LabelId[]
}

export interface TeamWorkload {
  members: TeamMemberWorkload[]
  totalOpen: number
}

/** Open issues are every card outside the Done column. */
export function getTeamWorkload(board: BoardState): TeamWorkload {
  const openCards = board.columns
    .filter((column) => column.id !== 'done')
    .flatMap((column) => column.cardIds.map((id) => board.cards[id]))
    .filter(Boolean)
  const members = Object.values(ASSIGNEES).map((person) => {
    const cards = openCards.filter((card) => card.assigneeId === person.id)
    const used = new Set(cards.flatMap((card) => card.labels))
    return {
      person,
      openCount: cards.length,
      labels: LABEL_ORDER.filter((label) => used.has(label)),
    }
  })
  return { members, totalOpen: openCards.length }
}
