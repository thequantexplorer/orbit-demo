import { startTransition, useEffect, useState } from 'react'

/** Cards per chunk; the first chunk of every list mounts with the list. */
export const CHUNK_SIZE = 25
/** Chunks mounted per step; each step is one interruptible transition. */
const CHUNKS_PER_STEP = 4

/** Splits `items` into consecutive `CHUNK_SIZE` chunks. */
export function toChunks<T>(items: T[]): T[][] {
  const chunks: T[][] = []
  for (let start = 0; start < items.length; start += CHUNK_SIZE)
    chunks.push(items.slice(start, start + CHUNK_SIZE))
  return chunks
}

interface PendingReveal {
  priority: number
  reveal: () => void
}

/**
 * Mounts deferred chunks a few at a time, lowest priority first. The next step
 * starts only after the previous one committed (or was dropped), so the main
 * thread gets a turn between steps.
 */
export function createRevealScheduler(
  defer: (run: () => void) => void,
  perStep: number,
) {
  const queue: PendingReveal[] = []
  const inFlight = new Set<PendingReveal>()
  let scheduled = false
  let paused = false

  function schedule() {
    if (scheduled || paused || inFlight.size > 0 || queue.length === 0) return
    scheduled = true
    defer(step)
  }

  function step() {
    scheduled = false
    if (paused || inFlight.size > 0) return
    const batch = queue.splice(0, perStep)
    for (const entry of batch) inFlight.add(entry)
    startTransition(() => {
      for (const entry of batch) entry.reveal()
    })
  }

  return {
    /** Queues `reveal`; call the returned function once it committed or unmounted. */
    enqueue(priority: number, reveal: () => void): () => void {
      const entry = { priority, reveal }
      const index = queue.findIndex((queued) => queued.priority > priority)
      queue.splice(index === -1 ? queue.length : index, 0, entry)
      schedule()
      return () => {
        const queued = queue.indexOf(entry)
        if (queued !== -1) queue.splice(queued, 1)
        if (inFlight.delete(entry)) schedule()
      }
    },
    setPaused(value: boolean) {
      paused = value
      schedule()
    },
  }
}

const scheduler = createRevealScheduler(
  (run) => setTimeout(run, 0),
  CHUNKS_PER_STEP,
)

/** Holds back chunk mounting, e.g. while a card is being dragged. */
export const setRevealPaused = scheduler.setPaused

/**
 * Whether a chunk should render. `eager` chunks render right away (and stay);
 * the rest are revealed by the shared scheduler in `priority` order.
 */
export function useReveal(priority: number, eager: boolean): boolean {
  const [revealed, setRevealed] = useState(eager)
  if (eager && !revealed) setRevealed(true)

  useEffect(() => {
    if (revealed) return
    return scheduler.enqueue(priority, () => setRevealed(true))
  }, [priority, revealed])

  return revealed
}
