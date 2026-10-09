import type { ReactNode } from 'react'
import { useReveal } from '../useReveal'

interface RevealChunkProps {
  priority: number
  eager: boolean
  children: ReactNode
}

/** Renders `children` once the reveal scheduler gets to this chunk. */
export function RevealChunk({ priority, eager, children }: RevealChunkProps) {
  return useReveal(priority, eager) ? children : null
}
