import { useEffect, useRef, useState } from 'react'
import { formatDueDate, fromDateKey } from '../dueDate'
import type { WeeklyStats } from '../weeklyStats'

interface WeeklyStatsPanelProps {
  stats: WeeklyStats
}

const CHART = {
  left: 38,
  top: 14,
  bottom: 154,
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function WeeklyStatsPanel({ stats }: WeeklyStatsPanelProps) {
  const hasScope = stats.scope > 0
  const [chartWidth, setChartWidth] = useState(640)
  const chartContainer = useRef<HTMLDivElement>(null)
  const weekStartDate = fromDateKey(stats.weekStart)
  const range = `${formatDueDate(stats.weekStart, weekStartDate)} – ${formatDueDate(stats.weekEnd, weekStartDate)}`
  const chart = { ...CHART, right: chartWidth - 12 }
  const step = Math.max(1, Math.ceil(stats.scope / 4))
  const axisMax = step * Math.ceil(Math.max(stats.scope, 1) / step)
  const xFor = (position: number) =>
    chart.left + ((chart.right - chart.left) * position) / 7
  const yFor = (value: number) =>
    chart.bottom - ((chart.bottom - chart.top) * value) / axisMax
  const todayIndex = stats.days.reduce(
    (today, day, index) => (day.remaining !== null ? index : today),
    -1,
  )
  const actualPoints = [
    { x: xFor(0), y: yFor(stats.scope) },
    ...stats.days.flatMap((day, index) =>
      day.remaining === null
        ? []
        : [{ x: xFor(index + 1), y: yFor(day.remaining) }],
    ),
  ]
  const actualPath = actualPoints
    .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`)
    .join(' ')
  const lastPoint = actualPoints[actualPoints.length - 1]
  const areaPath = `${actualPath} L ${lastPoint.x} ${chart.bottom} L ${chart.left} ${chart.bottom} Z`
  const idealPath = `M ${xFor(0)} ${yFor(stats.scope)} L ${xFor(7)} ${yFor(0)}`
  const tickValues = Array.from(
    { length: axisMax / step + 1 },
    (_, index) => index * step,
  )
  const ariaLabel = `Burndown for this week: ${stats.remaining} of ${stats.scope} issues remaining, ${stats.completedThisWeek} completed`

  useEffect(() => {
    if (!hasScope) return
    const element = chartContainer.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0
      if (width > 0) setChartWidth(width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasScope])

  return (
    <div className="overview-panel weekly-stats">
      <div className="section-heading">
        <h3>This week</h3>
        <span>{range}</span>
      </div>
      <div className="weekly-stats__summary">
        <div>
          <span>Completed this week</span>
          <strong>{stats.completedThisWeek}</strong>
        </div>
        <div>
          <span>Completed today</span>
          <strong>{stats.completedToday}</strong>
        </div>
        <div>
          <span>Remaining</span>
          <strong>
            {stats.remaining} <em>/ {stats.scope}</em>
          </strong>
        </div>
      </div>
      {!hasScope ? (
        <p className="weekly-stats__empty">
          Nothing on the board this week yet.
        </p>
      ) : (
        <>
          <div className="weekly-stats__chart-container" ref={chartContainer}>
            <svg
              className="weekly-stats__chart"
              viewBox={`0 0 ${chartWidth} 200`}
              width={chartWidth}
              height={200}
              role="img"
              aria-label={ariaLabel}
            >
              {tickValues.map((value) => (
                <g key={value}>
                  <line
                    x1={chart.left}
                    x2={chart.right}
                    y1={yFor(value)}
                    y2={yFor(value)}
                    className="weekly-stats__grid"
                  />
                  <text
                    x={chart.left - 9}
                    y={yFor(value) + 3}
                    textAnchor="end"
                    className="weekly-stats__tick"
                  >
                    {value}
                  </text>
                </g>
              ))}
              <path d={areaPath} className="weekly-stats__area" />
              <path d={idealPath} className="weekly-stats__ideal" />
              <path d={actualPath} className="weekly-stats__actual" />
              {actualPoints.map((point, index) => {
                const day = index > 0 ? stats.days[index - 1] : undefined
                const date = day ? fromDateKey(day.key) : undefined
                const isToday = day?.key === stats.days[todayIndex]?.key
                const title =
                  day && date
                    ? `${WEEKDAYS[date.getDay()]} ${formatDueDate(day.key, date)}: ${day.remaining} remaining, ${day.completed} completed`
                    : `Start of week: ${stats.scope} remaining`
                return (
                  <circle
                    key={day?.key ?? 'start'}
                    cx={point.x}
                    cy={point.y}
                    r={isToday ? 4 : 3}
                    className={`weekly-stats__marker${isToday ? ' weekly-stats__marker--today' : ''}`}
                  >
                    <title>{title}</title>
                  </circle>
                )
              })}
              {stats.days.map((day, index) => (
                <text
                  key={day.key}
                  x={xFor(index + 1)}
                  y="184"
                  textAnchor="middle"
                  className={`weekly-stats__day${day.key === stats.days[todayIndex]?.key ? ' weekly-stats__day--today' : ''}`}
                >
                  {day.label}
                </text>
              ))}
            </svg>
          </div>
          <div className="weekly-stats__legend">
            <span>
              <i className="weekly-stats__legend-line" />
              Actual
            </span>
            <span>
              <i className="weekly-stats__legend-line weekly-stats__legend-line--ideal" />
              Ideal
            </span>
          </div>
        </>
      )}
    </div>
  )
}
