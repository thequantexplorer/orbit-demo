import type { BoardState, Card, LabelId } from './types'

/** Card-level filter criteria; `null` means "no filter, show everything". */
export interface FilterCriteria {
  query: string
  labels: LabelId[]
  assigneeId: string
  mineOnly: boolean
}

export type IndexedCard = Pick<Card, 'id' | 'labels' | 'assigneeId'> & {
  text: string
}

export type ToWorker =
  | { type: 'sync'; reset: boolean; upserts: Card[]; removes: string[] }
  | { type: 'filter'; requestId: number; criteria: FilterCriteria | null }

export interface FromWorker {
  requestId: number
  matched: string[]
}

export function indexCard(card: Card): IndexedCard {
  return {
    id: card.id,
    labels: card.labels,
    assigneeId: card.assigneeId,
    text: `${card.title} ${card.id} ${card.description}`.toLowerCase(),
  }
}

export function matchesCriteria(card: IndexedCard, criteria: FilterCriteria) {
  return (
    card.text.includes(criteria.query) &&
    (!criteria.labels.length ||
      criteria.labels.some((label) => card.labels.includes(label))) &&
    (!criteria.assigneeId || card.assigneeId === criteria.assigneeId) &&
    (!criteria.mineOnly || card.assigneeId === 'ava')
  )
}

/** The delta that brings a worker holding `prev` up to date with `next`. */
export function diffCards(
  prev: BoardState['cards'] | null,
  next: BoardState['cards'],
): Extract<ToWorker, { type: 'sync' }> {
  if (!prev) {
    return {
      type: 'sync',
      reset: true,
      upserts: Object.values(next),
      removes: [],
    }
  }
  const upserts: Card[] = []
  const removes: string[] = []
  for (const id in next) if (next[id] !== prev[id]) upserts.push(next[id])
  for (const id in prev) if (!(id in next)) removes.push(id)
  return { type: 'sync', reset: false, upserts, removes }
}
