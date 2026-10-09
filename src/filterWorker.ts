/// <reference lib="webworker" />
import {
  indexCard,
  matchesCriteria,
  type FromWorker,
  type IndexedCard,
  type ToWorker,
} from './boardFilter'

const index = new Map<string, IndexedCard>()

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const message = event.data
  if (message.type === 'sync') {
    if (message.reset) index.clear()
    for (const id of message.removes) index.delete(id)
    for (const card of message.upserts) index.set(card.id, indexCard(card))
    return
  }
  const { criteria } = message
  const matched: string[] = []
  if (criteria)
    for (const card of index.values())
      if (matchesCriteria(card, criteria)) matched.push(card.id)
  const response: FromWorker = { requestId: message.requestId, matched }
  self.postMessage(response)
}
