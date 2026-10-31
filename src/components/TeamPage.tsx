import type { BoardState } from '../types'
import { getTeamWorkload } from '../team'
import { Avatar } from './Avatar'
import { LabelPill } from './LabelPill'

interface TeamPageProps {
  board: BoardState
  onSelectMember: (assigneeId: string) => void
}

export function TeamPage({ board, onSelectMember }: TeamPageProps) {
  const { members, totalOpen } = getTeamWorkload(board)
  return (
    <section className="team-page" aria-label="Open issues per person">
      <div className="team-cards">
        {members.map(({ person, openCount, labels }) => (
          <button
            key={person.id}
            className="team-card"
            onClick={() => onSelectMember(person.id)}
            title={`Show ${person.name}’s issues on the board`}
          >
            <span className="team-card__header">
              <Avatar assigneeId={person.id} size="lg" />
              <span className="team-card__name">
                <strong>{person.name}</strong>
                <small>{openCount} open</small>
              </span>
            </span>
            <span className="team-card__bar" aria-hidden="true">
              <span
                style={{
                  width: `${totalOpen ? (openCount / totalOpen) * 100 : 0}%`,
                }}
              />
            </span>
            <span className="team-card__labels">
              {labels.length ? (
                labels.map((label) => <LabelPill key={label} labelId={label} />)
              ) : (
                <span className="team-card__empty">No open issues</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
