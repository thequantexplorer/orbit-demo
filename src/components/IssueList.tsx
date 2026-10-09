import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Card, Column } from '../types'
import { buildListRows } from '../virtualList'
import { Avatar } from './Avatar'
import { Icon, StatusIcon } from './Icon'
import { LabelPill } from './LabelPill'

const ESTIMATED_ROW_HEIGHT = { header: 37, card: 49, empty: 42 }

interface IssueListProps {
  columns: (Column & { cards: Card[] })[]
  onOpenCard: (cardId: string) => void
}

export function IssueList({ columns, onOpenCard }: IssueListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const rows = buildListRows(columns)
  // No React Compiler here; useVirtualizer re-renders on scroll itself.
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => ESTIMATED_ROW_HEIGHT[rows[index].type],
    getItemKey: (index) => rows[index].key,
    overscan: 8,
  })

  return (
    <div ref={scrollRef} className="issue-list" aria-label="Issue list">
      <div
        className="issue-list__virtual"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index]
          return (
            <div
              key={item.key}
              ref={virtualizer.measureElement}
              data-index={item.index}
              className="issue-list__item"
              style={{ top: item.start }}
            >
              {row.type === 'header' ? (
                <header className="list-group-header">
                  <StatusIcon status={row.column.id} />
                  <h2>{row.column.title}</h2>
                  <span>{row.count}</span>
                </header>
              ) : row.type === 'card' ? (
                <button
                  className="issue-row"
                  onClick={() => onOpenCard(row.card.id)}
                >
                  <span className="card__id">{row.card.id}</span>
                  <StatusIcon status={row.columnId} />
                  <strong>{row.card.title}</strong>
                  <span className="issue-row__labels">
                    {row.card.labels.map((label) => (
                      <LabelPill key={label} labelId={label} />
                    ))}
                  </span>
                  <Avatar assigneeId={row.card.assigneeId} />
                  <Icon name="chevron" size={12} />
                </button>
              ) : (
                <p className="list-empty">No issues in this view</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
