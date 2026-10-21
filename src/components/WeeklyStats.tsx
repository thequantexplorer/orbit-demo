import { formatDueDate, fromDateKey } from '../dueDate'
import type { BoardState } from '../types'
import { computeWeeklyStats } from '../weeklyStats'

interface WeeklyStatsProps {
  board: BoardState
  todayKey: string
}

const CHART_WIDTH = 720
const CHART_HEIGHT = 260
const PLOT_LEFT = 42
const PLOT_RIGHT = 704
const PLOT_TOP = 20
const PLOT_BOTTOM = 194

export function WeeklyStats({ board, todayKey }: WeeklyStatsProps) {
  const stats = computeWeeklyStats(board, todayKey)
  const today = fromDateKey(todayKey)
  const dateRange = `${formatDueDate(stats.weekStart, today)} – ${formatDueDate(stats.weekEnd, today)}`
  const xFor = (index: number) =>
    PLOT_LEFT + ((PLOT_RIGHT - PLOT_LEFT) / 7) * index
  const yFor = (remaining: number) =>
    stats.scope === 0
      ? PLOT_BOTTOM
      : PLOT_TOP +
        ((stats.scope - remaining) / stats.scope) * (PLOT_BOTTOM - PLOT_TOP)
  const actualPoints = [
    `${xFor(0)},${yFor(stats.scope)}`,
    ...stats.days.flatMap((day, index) =>
      day.remaining === null
        ? []
        : [`${xFor(index + 1)},${yFor(day.remaining)}`],
    ),
  ].join(' ')
  const maxDailyCompletions = Math.max(
    1,
    ...stats.days.map((day) => day.completed),
  )
  const gridLevels =
    stats.scope === 0
      ? [{ value: 0, y: PLOT_BOTTOM }]
      : [
          { value: stats.scope, y: PLOT_TOP },
          { value: 0, y: PLOT_BOTTOM },
        ]

  return (
    <div className="overview-panel">
      <div className="section-heading">
        <h3>This week</h3>
        <span>{dateRange}</span>
      </div>
      <div className="weekly-summary">
        <div>
          <span>Completed</span>
          <strong>{stats.completedThisWeek}</strong>
        </div>
        <div>
          <span>Remaining</span>
          <strong>{stats.remaining}</strong>
        </div>
        <div>
          <span>Scope</span>
          <strong>{stats.scope}</strong>
        </div>
      </div>
      <svg
        className="burndown"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label={`Burndown: ${stats.remaining} of ${stats.scope} issues remaining`}
        data-testid="burndown-chart"
      >
        {gridLevels.map(({ value, y }) => (
          <g key={`${value}-${y}`}>
            <line
              className="burndown__grid"
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={y}
              y2={y}
            />
            <text className="burndown__axis-label" x="4" y={y + 4}>
              {value}
            </text>
          </g>
        ))}
        {stats.days.map((day, index) => {
          const height =
            day.completed === 0
              ? 0
              : Math.max(3, (day.completed / maxDailyCompletions) * 20)
          return (
            <rect
              key={day.key}
              className="burndown__bar"
              x={xFor(index + 1) - 9}
              y={PLOT_BOTTOM - height}
              width="18"
              height={height}
            >
              <title>{`${day.completed} completed on ${day.label}`}</title>
            </rect>
          )
        })}
        <line
          className="burndown__ideal"
          x1={xFor(0)}
          y1={yFor(stats.scope)}
          x2={xFor(7)}
          y2={yFor(0)}
        />
        <polyline className="burndown__actual" points={actualPoints} />
        {[
          { x: xFor(0), y: yFor(stats.scope) },
          ...stats.days.flatMap((day, index) =>
            day.remaining === null
              ? []
              : [{ x: xFor(index + 1), y: yFor(day.remaining) }],
          ),
        ].map((point, index) => (
          <circle
            key={`${point.x}-${index}`}
            className="burndown__point"
            cx={point.x}
            cy={point.y}
            r="3.5"
          />
        ))}
        {stats.days.map((day, index) => (
          <text
            key={day.key}
            className={`burndown__day${day.key === todayKey ? ' burndown__day--today' : ''}`}
            textAnchor="middle"
            x={xFor(index + 1)}
            y={PLOT_BOTTOM + 32}
          >
            {day.label}
          </text>
        ))}
      </svg>
      <div className="burndown-legend" aria-hidden="true">
        <span>
          <i className="burndown-legend__ideal" />
          Ideal
        </span>
        <span>
          <i className="burndown-legend__remaining" />
          Remaining
        </span>
        <span>
          <i className="burndown-legend__completed" />
          Completed
        </span>
      </div>
    </div>
  )
}
