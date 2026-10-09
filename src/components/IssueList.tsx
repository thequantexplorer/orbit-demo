import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Card, Column } from '../types'
import { Avatar } from './Avatar'
import { Icon, StatusIcon } from './Icon'
import { LabelPill } from './LabelPill'

interface IssueListProps {
  columns: (Column & { cards: Card[] })[]
  onOpenCard: (cardId: string) => void
}

type Row =
  | { kind: 'header'; key: string; column: Column; count: number }
  | { kind: 'issue'; key: string; column: Column; card: Card }
  | { kind: 'empty'; key: string }

export function IssueList({ columns, onOpenCard }: IssueListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const rows: Row[] = columns.flatMap((column): Row[] => [
    {
      kind: 'header',
      key: `header-${column.id}`,
      column,
      count: column.cards.length,
    },
    ...column.cards.map(
      (card): Row => ({ kind: 'issue', key: card.id, column, card }),
    ),
    ...(column.cards.length === 0
      ? [{ kind: 'empty' as const, key: `empty-${column.id}` }]
      : []),
  ])

  // The app doesn't use React Compiler, so its auto-memoization caveat for
  // useVirtualizer's returned functions doesn't apply here.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (rows[index].kind === 'issue' ? 48 : 37),
    getItemKey: (index) => rows[index].key,
    overscan: 10,
  })

  return (
    <div ref={scrollRef} className="issue-list" aria-label="Issue list">
      <div
        className="issue-list__window"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index]
          return (
            <div
              key={row.key}
              ref={virtualizer.measureElement}
              className="issue-list__item"
              data-index={item.index}
              style={{ transform: `translateY(${item.start}px)` }}
            >
              {row.kind === 'header' && (
                <header className="list-group__header">
                  <StatusIcon status={row.column.id} />
                  <h2>{row.column.title}</h2>
                  <span>{row.count}</span>
                </header>
              )}
              {row.kind === 'issue' && (
                <button
                  className="issue-row"
                  onClick={() => onOpenCard(row.card.id)}
                >
                  <span className="card__id">{row.card.id}</span>
                  <StatusIcon status={row.column.id} />
                  <strong>{row.card.title}</strong>
                  <span className="issue-row__labels">
                    {row.card.labels.map((label) => (
                      <LabelPill key={label} labelId={label} />
                    ))}
                  </span>
                  <Avatar assigneeId={row.card.assigneeId} />
                  <Icon name="chevron" size={12} />
                </button>
              )}
              {row.kind === 'empty' && (
                <p className="list-empty">No issues in this view</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
