import type { Card, LabelId } from './types'

export interface CardFilter {
  /** Already lowercased. */
  query: string
  labels: LabelId[]
  assigneeId: string
}

// Cards are immutable (the reducer replaces them on edit), so the lowercased
// search text can be cached per card object.
const searchTextCache = new WeakMap<Card, string>()

export function searchText(card: Card): string {
  let text = searchTextCache.get(card)
  if (text === undefined) {
    text = `${card.title} ${card.id} ${card.description}`.toLowerCase()
    searchTextCache.set(card, text)
  }
  return text
}

export function cardMatches(card: Card, filter: CardFilter): boolean {
  return (
    (!filter.query || searchText(card).includes(filter.query)) &&
    (!filter.labels.length ||
      filter.labels.some((label) => card.labels.includes(label))) &&
    (!filter.assigneeId || card.assigneeId === filter.assigneeId)
  )
}

/** Returns `previous` when it holds the same items, so memoized children can bail out. */
export function reuseIfSame<T>(previous: T[] | undefined, next: T[]): T[] {
  if (
    previous &&
    previous.length === next.length &&
    previous.every((item, index) => item === next[index])
  )
    return previous
  return next
}
