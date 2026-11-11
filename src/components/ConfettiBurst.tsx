import { useEffect, useMemo, type CSSProperties } from 'react'
import { CONFETTI_DURATION_MS, createConfetti } from '../celebration'

interface Props {
  id: number
  x: number
  y: number
  onDone: (id: number) => void
}

export function ConfettiBurst({ id, x, y, onDone }: Props) {
  const pieces = useMemo(() => createConfetti(), [])

  useEffect(() => {
    const timer = window.setTimeout(
      () => onDone(id),
      CONFETTI_DURATION_MS + 200,
    )
    return () => window.clearTimeout(timer)
  }, [id, onDone])

  return (
    <div className="confetti" style={{ left: x, top: y }} aria-hidden="true">
      {pieces.map((piece, index) => (
        <span
          key={index}
          className={`confetti-piece${piece.round ? ' confetti-piece--round' : ''}`}
          style={
            {
              '--dx': `${piece.dx}px`,
              '--dy': `${piece.dy}px`,
              '--spin': `${piece.rotate}deg`,
              '--size': `${piece.size}px`,
              '--color': piece.color,
              animationDelay: `${piece.delay}ms`,
              animationDuration: `${CONFETTI_DURATION_MS}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
