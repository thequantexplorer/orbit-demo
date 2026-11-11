import { findColumnOfCard } from './boardReducer'
import type { BoardState, ColumnId } from './types'

/** True when a card that started outside Done ends up in Done. */
export function isShipped(
  before: BoardState,
  after: BoardState,
  cardId: string,
): boolean {
  const from: ColumnId | undefined = findColumnOfCard(before, cardId)
  return (
    from !== undefined &&
    from !== 'done' &&
    findColumnOfCard(after, cardId) === 'done'
  )
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export const CONFETTI_COLORS = [
  'var(--primary)',
  'var(--green)',
  'var(--warning)',
  'var(--danger)',
] as const

export interface ConfettiPiece {
  /** Horizontal travel in px. */
  dx: number
  /** Vertical travel in px; negative is up, before gravity pulls it down. */
  dy: number
  /** Final spin in degrees. */
  rotate: number
  size: number
  delay: number
  color: (typeof CONFETTI_COLORS)[number]
  round: boolean
}

export const CONFETTI_DURATION_MS = 900

/** Builds an upward fan of confetti pieces; `random` is injectable for tests. */
export function createConfetti(
  count = 26,
  random: () => number = Math.random,
): ConfettiPiece[] {
  return Array.from({ length: count }, (_, index) => {
    const spread = (index / Math.max(count - 1, 1) - 0.5) * Math.PI * 0.9
    const angle = spread + (random() - 0.5) * 0.35 - Math.PI / 2
    const distance = 70 + random() * 70
    return {
      dx: Math.round(Math.cos(angle) * distance),
      dy: Math.round(Math.sin(angle) * distance),
      rotate: Math.round((random() - 0.5) * 720),
      size: 5 + Math.round(random() * 3),
      delay: Math.round(random() * 80),
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      round: random() < 0.3,
    }
  })
}
