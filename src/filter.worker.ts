import { filterCardIds, type FilterRequest, type FilterResponse } from './boardFilter'
import type { Card, Column } from './types'

let columns: Pick<Column, 'id' | 'cardIds'>[] = []
const cards: Record<string, Card> = {}

self.onmessage = (event: MessageEvent<FilterRequest>) => {
  const message = event.data
  if (message.type === 'sync') {
    if (message.columns) columns = message.columns
    for (const card of message.upserts) cards[card.id] = card
    for (const id of message.removed) delete cards[id]
    return
  }
  const response: FilterResponse = {
    seq: message.seq,
    columns: filterCardIds(columns, cards, message.filter),
  }
  self.postMessage(response)
}
