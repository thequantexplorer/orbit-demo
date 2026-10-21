import { useState } from 'react'
import { formatDueDate, fromDateKey } from '../dueDate'
import type { BoardState } from '../types'
import { useTodayKey } from '../useToday'
import { getWeeklyStats } from '../weeklyStats'

const WIDTH = 640
const HEIGHT = 170
const PAD = { top: 14, right: 12, bottom: 26, left: 30 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom

function niceStep(max: number) {
  const raw = max / 4
  if (raw <= 1) return 1
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].find((m) => m * magnitude >= raw) ?? 10
  return step * magnitude
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function WeeklyStats({ board }: { board: BoardState }) {
  const todayKey = useTodayKey()
  const [weekOffset, setWeekOffset] = useState<0 | -1>(0)
  const stats = getWeeklyStats(board, todayKey, weekOffset)
  const today = fromDateKey(todayKey)

  const peak = Math.max(
    1,
    stats.startRemaining,
    ...stats.days.map((day) => Math.max(day.remaining ?? 0, day.completed)),
  )
  const step = niceStep(peak)
  const yMax = Math.ceil(peak / step) * step
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step)
  const x = (index: number) => PAD.left + (index / 7) * PLOT_W
  const y = (value: number) => PAD.top + PLOT_H - (value / yMax) * PLOT_H
  const band = PLOT_W / 7

  const elapsed = stats.days.filter((day) => day.remaining !== null)
  const actualPoints = [
    [x(0), y(stats.startRemaining)],
    ...elapsed.map((day, index) => [x(index + 1), y(day.remaining ?? 0)]),
  ]
  const delta = stats.completed - stats.previousCompleted
  const range = `${formatDueDate(stats.weekStart, today)} – ${formatDueDate(stats.weekEnd, today)}`
  const summary = `Burndown for ${range}: ${stats.startRemaining} open at the start of the week, ${stats.remaining} open now, ${plural(stats.completed, 'issue')} completed.`

  return (
    <div className="overview-panel weekly-stats">
      <div className="section-heading">
        <div className="weekly-stats__title">
          <h3>Weekly stats</h3>
          <span>{range}</span>
        </div>
        <div className="view-switch" aria-label="Stats week">
          <button
            className={weekOffset === 0 ? 'is-selected' : ''}
            aria-pressed={weekOffset === 0}
            onClick={() => setWeekOffset(0)}
          >
            This week
          </button>
          <button
            className={weekOffset === -1 ? 'is-selected' : ''}
            aria-pressed={weekOffset === -1}
            onClick={() => setWeekOffset(-1)}
          >
            Last week
          </button>
        </div>
      </div>
      <div className="weekly-stats__tiles">
        <div>
          <span>Completed</span>
          <strong>{stats.completed}</strong>
          <small
            className={
              delta > 0
                ? 'weekly-delta weekly-delta--up'
                : delta < 0
                  ? 'weekly-delta weekly-delta--down'
                  : 'weekly-delta'
            }
          >
            {delta === 0
              ? 'Same as the week before'
              : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} vs the week before`}
          </small>
        </div>
        <div>
          <span>Added</span>
          <strong>{stats.added}</strong>
          <small>New issues {weekOffset === 0 ? 'this' : 'that'} week</small>
        </div>
        <div>
          <span>{weekOffset === 0 ? 'Still open' : 'Open at week end'}</span>
          <strong>
            {stats.remaining}
            <em> / {stats.startRemaining}</em>
          </strong>
          <small>
            {weekOffset === 0 ? 'Open now' : 'At week end'} vs. at the start
          </small>
        </div>
        <div>
          <span>Daily average</span>
          <strong>{stats.dailyAverage}</strong>
          <small>Completed per day</small>
        </div>
      </div>
      <figure className="burndown">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={summary}
        >
          {ticks.map((tick) => (
            <g key={tick} className="burndown__grid">
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} />
              <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                {tick}
              </text>
            </g>
          ))}
          {stats.days.map((day, index) => {
            const isToday = day.day === todayKey
            const height = y(0) - y(Math.max(0, day.completed))
            return (
              <g key={day.day}>
                {isToday && (
                  <rect
                    className="burndown__today"
                    x={x(index)}
                    y={PAD.top}
                    width={band}
                    height={PLOT_H}
                  />
                )}
                {day.completed > 0 && (
                  <rect
                    className="burndown__bar"
                    x={x(index) + band * 0.3}
                    y={y(0) - height}
                    width={band * 0.4}
                    height={height}
                    rx={2}
                  >
                    <title>
                      {`${day.label}: ${plural(day.completed, 'issue')} completed`}
                    </title>
                  </rect>
                )}
                <text
                  className={`burndown__day${isToday ? ' burndown__day--today' : ''}${day.future ? ' burndown__day--future' : ''}`}
                  x={x(index) + band / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                >
                  {isToday ? 'Today' : day.label}
                </text>
              </g>
            )
          })}
          <line
            className="burndown__ideal"
            x1={x(0)}
            y1={y(stats.startRemaining)}
            x2={x(7)}
            y2={y(0)}
          />
          <polyline
            className="burndown__actual"
            points={actualPoints.map((point) => point.join(',')).join(' ')}
          />
          {elapsed.map((day, index) => (
            <circle
              key={day.day}
              className="burndown__point"
              cx={x(index + 1)}
              cy={y(day.remaining ?? 0)}
              r={3}
            >
              <title>{`End of ${day.label}: ${day.remaining} open`}</title>
            </circle>
          ))}
        </svg>
        <figcaption className="burndown__legend">
          <span>
            <i className="legend-swatch legend-swatch--actual" />
            Open issues
          </span>
          <span>
            <i className="legend-swatch legend-swatch--ideal" />
            Ideal burndown
          </span>
          <span>
            <i className="legend-swatch legend-swatch--bar" />
            Completed per day
          </span>
        </figcaption>
      </figure>
    </div>
  )
}
