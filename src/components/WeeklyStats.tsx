import { useLayoutEffect, useRef, useState } from 'react'
import { formatDueDate, fromDateKey } from '../dueDate'
import type { WeeklyStats as Stats } from '../weeklyStats'

const HEIGHT = 200
const PAD = { top: 16, right: 12, bottom: 34, left: 32 }
const PLOT_H = HEIGHT - PAD.top - PAD.bottom

function niceMax(value: number) {
  if (value <= 4) return Math.max(value, 1)
  const half = Math.max(1, 10 ** Math.floor(Math.log10(value)) / 2)
  const max = Math.ceil(value / half) * half
  return max % 2 ? max + half : max
}

function useWidth<T extends Element>(fallback: number) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, Math.round(entry.contentRect.width))),
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function weekRangeLabel(stats: Stats, today: Date) {
  const start = formatDueDate(stats.weekStartKey, today)
  const end = formatDueDate(stats.weekEndKey, today)
  return `${start} – ${end}`
}

export function WeeklyStats({
  stats,
  todayKey,
}: {
  stats: Stats
  todayKey: string
}) {
  const [chartRef, WIDTH] = useWidth<HTMLDivElement>(640)
  const BAND = (WIDTH - PAD.left - PAD.right) / 7
  const today = fromDateKey(todayKey)
  const yMax = niceMax(stats.startRemaining)
  const x = (boundary: number) => PAD.left + boundary * BAND
  const y = (value: number) => PAD.top + PLOT_H - (value / yMax) * PLOT_H
  const ticks = Number.isInteger(yMax / 2) ? [0, yMax / 2, yMax] : [0, yMax]

  const actual = [
    { boundary: 0, value: stats.startRemaining },
    ...stats.days.flatMap((day, index) =>
      day.remaining === null ? [] : [{ boundary: index + 1, value: day.remaining }],
    ),
  ]
  const actualPath = actual
    .map((point, index) => `${index ? 'L' : 'M'}${x(point.boundary)},${y(point.value)}`)
    .join(' ')
  const idealPath = `M${x(0)},${y(stats.startRemaining)} L${x(7)},${y(0)}`
  const last = actual[actual.length - 1]
  const maxCompleted = Math.max(1, ...stats.days.map((day) => day.completed))
  const barMaxH = PLOT_H * 0.25

  const delta = stats.completedThisWeek - stats.completedLastWeek
  const activeDays = stats.days.filter((day) => day.remaining !== null).length

  return (
    <div className="overview-panel weekly-stats" aria-labelledby="weekly-stats-title">
      <div className="section-heading">
        <h3 id="weekly-stats-title">This week</h3>
        <span>{weekRangeLabel(stats, today)}</span>
      </div>
      <div className="weekly-stats-figures">
        <div>
          <span>Completed</span>
          <strong>{stats.completedThisWeek}</strong>
          <small
            className={
              delta > 0 ? 'weekly-delta weekly-delta--up' : 'weekly-delta'
            }
          >
            {delta === 0
              ? 'Same as last week'
              : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} vs last week`}
          </small>
        </div>
        <div>
          <span>Remaining</span>
          <strong>{stats.remaining}</strong>
          <small>of {stats.startRemaining} open on Monday</small>
        </div>
        <div>
          <span>Daily average</span>
          <strong>
            {(stats.completedThisWeek / Math.max(activeDays, 1)).toFixed(1)}
          </strong>
          <small>Cards per day so far</small>
        </div>
      </div>
      <div ref={chartRef} className="burndown-wrap">
      <svg
        className="burndown"
        width={WIDTH}
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Burndown: ${stats.remaining} of ${stats.startRemaining} cards remaining, ${stats.completedThisWeek} completed this week`}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="burndown-grid"
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="burndown-axis" x={PAD.left - 8} y={y(tick) + 3} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}
        {stats.days.map((day, index) => {
          const barH = (day.completed / maxCompleted) * barMaxH
          const isToday = day.key === todayKey
          return (
            <g key={day.key}>
              {isToday && (
                <rect
                  className="burndown-today"
                  x={x(index)}
                  y={PAD.top}
                  width={BAND}
                  height={PLOT_H}
                  rx={4}
                />
              )}
              {day.completed > 0 && (
                <>
                  <rect
                    className="burndown-bar"
                    x={x(index) + BAND * 0.3}
                    y={PAD.top + PLOT_H - barH}
                    width={BAND * 0.4}
                    height={barH}
                    rx={2}
                  >
                    <title>{`${day.completed} completed ${day.label}`}</title>
                  </rect>
                  <text
                    className="burndown-bar-label"
                    x={x(index) + BAND / 2}
                    y={PAD.top + PLOT_H - barH - 4}
                    textAnchor="middle"
                  >
                    {day.completed}
                  </text>
                </>
              )}
              <text
                className={isToday ? 'burndown-axis burndown-axis--today' : 'burndown-axis'}
                x={x(index) + BAND / 2}
                y={HEIGHT - PAD.bottom + 18}
                textAnchor="middle"
              >
                {isToday ? 'Today' : day.label}
              </text>
            </g>
          )
        })}
        <path className="burndown-ideal" d={idealPath} />
        <path className="burndown-actual" d={actualPath} />
        <circle className="burndown-point" cx={x(last.boundary)} cy={y(last.value)} r={4} />
      </svg>
      </div>
      <div className="progress-legend weekly-legend">
        <span>
          <i className="legend-swatch legend-swatch--actual" />
          Remaining
        </span>
        <span>
          <i className="legend-swatch legend-swatch--ideal" />
          Ideal pace
        </span>
        <span>
          <i className="legend-swatch legend-swatch--bar" />
          Completed per day
        </span>
      </div>
    </div>
  )
}
