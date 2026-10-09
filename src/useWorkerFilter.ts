import { useEffect, useRef, useState } from 'react'
import {
  diffBoard,
  isEmptyFilter,
  reconcileCardIds,
  type BoardFilter,
  type FilterRequest,
  type FilterResponse,
  type VisibleCardIds,
} from './boardFilter'
import type { BoardState } from './types'

interface FilterResult {
  board: BoardState
  columns: VisibleCardIds
}

/**
 * Filters the board in a web worker. Returns the visible card ids per column,
 * or null when every card is visible (no filter, or the first result for a
 * new filter is still pending). While a newer result is pending the previous
 * one is shown, applied to the current board.
 */
export function useWorkerFilter(
  board: BoardState,
  filter: BoardFilter,
): VisibleCardIds | null {
  const [result, setResult] = useState<FilterResult | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const syncedRef = useRef<BoardState | null>(null)
  const seqRef = useRef(0)
  const latestRef = useRef<{ seq: number; board: BoardState } | null>(null)
  const empty = isEmptyFilter(filter)
  const filterKey = JSON.stringify(filter)

  useEffect(() => {
    const worker = new Worker(new URL('./filter.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (event: MessageEvent<FilterResponse>) => {
      const latest = latestRef.current
      if (!latest || event.data.seq !== latest.seq) return
      setResult({ board: latest.board, columns: event.data.columns })
    }
    workerRef.current = worker
    syncedRef.current = null
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    const worker = workerRef.current
    if (!worker) return
    const sync = diffBoard(syncedRef.current, board)
    if (sync) worker.postMessage(sync satisfies FilterRequest)
    syncedRef.current = board
    const seq = ++seqRef.current
    if (empty) {
      latestRef.current = null
      return
    }
    latestRef.current = { seq, board }
    worker.postMessage({
      type: 'filter',
      seq,
      filter: JSON.parse(filterKey) as BoardFilter,
    } satisfies FilterRequest)
  }, [board, filterKey, empty])

  if (empty) {
    // Forget the old result so the next filter starts from the full board.
    if (result) setResult(null)
    return null
  }
  if (!result) return null
  return result.board === board
    ? result.columns
    : reconcileCardIds(board.columns, result.columns)
}
