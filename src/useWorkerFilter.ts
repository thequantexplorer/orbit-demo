import { useEffect, useRef, useState } from 'react'
import {
  diffCards,
  indexCard,
  matchesCriteria,
  type FilterCriteria,
  type FromWorker,
  type ToWorker,
} from './boardFilter'
import type { BoardState, Card } from './types'

type Cards = BoardState['cards']

interface FilterRequest {
  criteria: FilterCriteria | null
  /** The cards object the worker had indexed when it ran this request. */
  cards: Cards
}

interface FilterResult extends FilterRequest {
  matched: Set<string>
}

const workerSupported = typeof Worker !== 'undefined'

/**
 * Filters cards in a Web Worker. Returns a synchronous visibility check that
 * uses the latest worker result; until a result for the current criteria
 * arrives it keeps showing the previous one (or the unfiltered board).
 * Cards added or edited since the worker last ran are checked on the main
 * thread so board mutations never show stale card contents.
 */
export function useWorkerFilter(
  cards: Cards,
  criteria: FilterCriteria | null,
): (card: Card) => boolean {
  const criteriaKey = criteria ? JSON.stringify(criteria) : ''
  const [result, setResult] = useState<FilterResult | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const sentCards = useRef<Cards | null>(null)
  const sentKey = useRef('')
  const lastRequestId = useRef(0)
  const appliedRequestId = useRef(0)
  const pending = useRef(new Map<number, FilterRequest>())

  useEffect(() => {
    if (!workerSupported) return
    const worker = new Worker(new URL('./filterWorker.ts', import.meta.url), {
      type: 'module',
    })
    const requests = pending.current
    worker.onmessage = ({ data }: MessageEvent<FromWorker>) => {
      const request = requests.get(data.requestId)
      for (const id of requests.keys()) if (id <= data.requestId) requests.delete(id)
      if (
        !request ||
        data.requestId !== lastRequestId.current ||
        data.requestId <= appliedRequestId.current
      ) return
      appliedRequestId.current = data.requestId
      setResult(
        request.criteria ? { ...request, matched: new Set(data.matched) } : null,
      )
    }
    workerRef.current = worker
    return () => {
      worker.terminate()
      workerRef.current = null
      sentCards.current = null
      requests.clear()
    }
  }, [])

  useEffect(() => {
    const worker = workerRef.current
    if (!worker) return
    const post = (message: ToWorker) => worker.postMessage(message)
    const cardsChanged = sentCards.current !== cards
    if (cardsChanged) {
      post(diffCards(sentCards.current, cards))
      sentCards.current = cards
    }
    const keyChanged = sentKey.current !== criteriaKey
    sentKey.current = criteriaKey
    if (criteriaKey ? !cardsChanged && !keyChanged : !keyChanged) return
    const request: FilterRequest = {
      criteria: criteriaKey ? JSON.parse(criteriaKey) : null,
      cards,
    }
    const requestId = ++lastRequestId.current
    pending.current.set(requestId, request)
    post({ type: 'filter', requestId, criteria: request.criteria })
  }, [cards, criteriaKey])

  return (card) => {
    if (!criteria) return true
    if (!workerSupported) return matchesCriteria(indexCard(card), criteria)
    if (!result?.criteria) return true
    if (result.cards[card.id] === card) return result.matched.has(card.id)
    return matchesCriteria(indexCard(card), result.criteria)
  }
}
