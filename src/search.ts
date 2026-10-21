import type { Card } from './types'

/** Case-insensitive substring match against the card title only. */
export function matchesSearch(card: Pick<Card, 'title'>, query: string): boolean {
  return card.title.toLowerCase().includes(query.trim().toLowerCase())
}
