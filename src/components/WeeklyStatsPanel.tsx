import { useLayoutEffect, useRef, useState } from 'react'
import { formatDueDate, fromDateKey } from '../dueDate'
import type { WeeklyStats } from '../weeklyStats'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const HEIGHT = 190
const PAD = { top: 12, right: 8, bottom: 26, left: 28 }
const PLOT_HEIGHT = HEIGHT - PAD.top - PAD.bottom

// Render at the real pixel width so text and strokes don't scale with the panel.
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, Math.round(entry.contentRect.width))),
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function niceMax(value: number) {
  if (value <= 4) return 4
  const step = value <= 20 ? 2 : 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / step) * step
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function deltaLabel(completed: number, previous: number) {
  const delta = completed - previous
  if (delta === 0) return 'Same as the prior 7 days'
  return `${delta > 0 ? '+' : '−'}${Math.abs(delta)} vs the prior 7 days`
}

export function WeeklyStatsPanel({ stats }: { stats: WeeklyStats }) {
  const { days } = stats
  const [figureRef, width] = useWidth<HTMLElement>(640)
  const plotWidth = width - PAD.left - PAD.right
  const today = fromDateKey(days[days.length - 1].key)
  const range = `${formatDueDate(days[0].key, today)} – ${formatDueDate(days[days.length - 1].key, today)}`
  const yMax = niceMax(
    Math.max(
      stats.startRemaining,
      ...days.map((day) => Math.max(day.remaining, day.completed)),
    ),
  )
  const ticks = [0, yMax / 4, yMax / 2, (yMax * 3) / 4, yMax].filter(
    (tick) => Number.isInteger(tick),
  )
  const slot = plotWidth / days.length
  const x = (index: number) => PAD.left + slot * (index + 0.5)
  const y = (value: number) => PAD.top + PLOT_HEIGHT * (1 - value / yMax)
  const barWidth = Math.min(28, slot * 0.42)
  const points = [
    [PAD.left, y(stats.startRemaining)],
    ...days.map((day, index) => [x(index), y(day.remaining)]),
  ]
  const linePath = points
    .map(([px, py], index) => `${index ? 'L' : 'M'}${px} ${py}`)
    .join(' ')
  const areaPath = `${linePath} L${points[points.length - 1][0]} ${y(0)} L${PAD.left} ${y(0)} Z`
  const dayLabel = (key: string, index: number) =>
    index === days.length - 1 ? 'Today' : WEEKDAYS[fromDateKey(key).getDay()]
  const summary = `Burndown for ${range}: ${stats.startRemaining} open at the start, ${stats.remaining} open now, ${plural(stats.completed, 'issue')} completed.`

  return (
    <div className="overview-panel weekly-stats">
      <div className="section-heading">
        <h3>This week</h3>
        <span>Last 7 days · {range}</span>
      </div>
      <div className="weekly-stats__figures">
        <div>
          <span>Completed</span>
          <strong>{stats.completed}</strong>
          <small
            className={
              stats.completed > stats.previousCompleted
                ? 'weekly-stats__delta--up'
                : undefined
            }
          >
            {deltaLabel(stats.completed, stats.previousCompleted)}
          </small>
        </div>
        <div>
          <span>Added</span>
          <strong>{stats.added}</strong>
          <small>New issues this week</small>
        </div>
        <div>
          <span>Remaining</span>
          <strong>{stats.remaining}</strong>
          <small>
            {stats.remaining === stats.startRemaining
              ? 'No change this week'
              : `${stats.remaining < stats.startRemaining ? 'Down' : 'Up'} from ${stats.startRemaining} a week ago`}
          </small>
        </div>
      </div>
      <figure className="burndown" ref={figureRef}>
        <figcaption className="burndown__legend">
          <span>
            <i className="burndown__swatch burndown__swatch--remaining" />
            Remaining
          </span>
          <span>
            <i className="burndown__swatch burndown__swatch--completed" />
            Completed
          </span>
        </figcaption>
        <svg
          className="burndown__chart"
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={summary}
        >
          {ticks.map((tick) => (
            <g key={tick} className="burndown__grid">
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} />
              <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                {tick}
              </text>
            </g>
          ))}
          {days.map((day, index) =>
            day.completed > 0 ? (
              <rect
                key={day.key}
                className="burndown__bar"
                x={x(index) - barWidth / 2}
                y={y(day.completed)}
                width={barWidth}
                height={y(0) - y(day.completed)}
                rx={3}
              />
            ) : null,
          )}
          <path className="burndown__area" d={areaPath} />
          <path className="burndown__line" d={linePath} />
          {days.map((day, index) => (
            <circle
              key={day.key}
              className="burndown__point"
              cx={x(index)}
              cy={y(day.remaining)}
              r={index === days.length - 1 ? 4 : 3}
            />
          ))}
          {days.map((day, index) => (
            <text
              key={day.key}
              className={`burndown__day${index === days.length - 1 ? ' burndown__day--today' : ''}`}
              x={x(index)}
              y={HEIGHT - 8}
              textAnchor="middle"
            >
              {dayLabel(day.key, index)}
            </text>
          ))}
          {days.map((day, index) => (
            <rect
              key={day.key}
              className="burndown__hit"
              x={PAD.left + slot * index}
              y={PAD.top}
              width={slot}
              height={PLOT_HEIGHT}
            >
              <title>
                {`${formatDueDate(day.key, today)}: ${day.completed} completed, ${day.remaining} remaining`}
              </title>
            </rect>
          ))}
        </svg>
      </figure>
      <table className="visually-hidden">
        <caption>Completed and remaining issues per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Completed</th>
            <th scope="col">Remaining</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.key}>
              <th scope="row">{formatDueDate(day.key, today, { withYear: true })}</th>
              <td>{day.completed}</td>
              <td>{day.remaining}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
