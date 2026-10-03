import type { CSSProperties } from 'react'
import type { ColumnId } from '../types'

const paths = {
  search: 'm16 16 4 4 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  plus: 'M12 5v14 M5 12h14',
  close: 'm6 6 12 12 M6 18 18 6',
  chevron: 'm8 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  board: 'M4 4h16v16H4z M9 4v16 M15 4v16',
  list: 'M8 6h12 M8 12h12 M8 18h12 M3 6h.01 M3 12h.01 M3 18h.01',
  layers: 'm12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5',
  box: 'M4 6h16v15H4z M3 3h18v3H3z M9 10h6',
  user: 'M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  check: 'm5 12 4 4L19 6',
  circleCheck: 'm8 12 3 3 5-6 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  filter: 'M4 7h16 M7 12h10 M10 17h4',
  sliders: 'M4 7h7 M15 7h5 M4 17h13 M21 17h-1 M11 4v6 M17 14v6',
  star: 'm12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2L12 17.3l-5.7 2.9 1.1-6.2L3 9.6l6.3-.9z',
  more: 'M4 12h.01 M12 12h.01 M20 12h.01',
  moon: 'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13',
  sun: 'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  help: 'M9 8a3 3 0 1 1 5 2.2c-1.1.8-2 1.3-2 2.8 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  reset: 'M3 10a9 9 0 1 1 2 8 M3 3v7h7',
  arrow: 'M4 12h16 m-6-6 6 6-6 6',
  cycle: 'M20 8a9 9 0 0 0-16-2 M4 3v4h4 M4 16a9 9 0 0 0 16 2 M20 21v-4h-4',
  calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 11h16',
  flag: 'M5 21V3 M5 3c5-4 9 4 14 0v10c-5 4-9-4-14 0',
  signal: 'M4 19v-3 M9 19v-7 M14 19V8 M19 19V4',
  text: 'M4 6h16 M4 12h16 M4 18h10',
  command:
    'M9 7V5a2 2 0 1 0-2 2h10a2 2 0 1 0-2-2v14a2 2 0 1 0 2-2H7a2 2 0 1 0 2 2V7',
  sidebar: 'M3 4h18v16H3z M9 4v16',
} as const

export type IconName = keyof typeof paths

export function Icon({
  name,
  size = 16,
  className = '',
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

export function StatusIcon({ status }: { status: ColumnId }) {
  return (
    <span className={`status-icon status-icon--${status}`} aria-hidden="true">
      {status === 'done' && <Icon name="check" size={10} />}
    </span>
  )
}

export function ProgressRing({ value }: { value: number }) {
  return (
    <span
      className="progress-ring"
      style={{ '--progress': `${value}%` } as CSSProperties}
      aria-hidden="true"
    />
  )
}
