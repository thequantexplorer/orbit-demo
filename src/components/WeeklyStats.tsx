import { formatDueDate, fromDateKey } from '../dueDate'
import type { BoardState } from '../types'
import { useTodayKey } from '../useToday'
import { getWeeklyStats } from '../weeklyStats'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function WeeklyStats({ board }: { board: BoardState }) {
  const todayKey = useTodayKey()
  const today = fromDateKey(todayKey)
  const stats = getWeeklyStats(board, todayKey)
  const { days, startRemaining } = stats
  const elapsed = days.filter((day) => day.remaining !== null).length
  const average = elapsed ? stats.completedThisWeek / elapsed : 0
  const delta = stats.completedThisWeek - stats.completedLastWeek
  const max = Math.max(startRemaining, 1)
  // Plot units: 100 per weekday horizontally, 0–100 (top to bottom) vertically.
  const x = (index: number) => (index + 0.5) * 100
  const y = (value: number) => 100 * (1 - value / max)
  const ticks = [...new Set([0, Math.round(max / 2), max])]
  const actual = days.flatMap((day, index) =>
    day.remaining === null ? [] : [{ ...day, index, remaining: day.remaining }],
  )
  const line = actual.map((point) => `${x(point.index)},${y(point.remaining)}`)
  const area =
    actual.length > 1
      ? `M${x(0)},${y(0)} L${line.join(' L')} L${x(actual[actual.length - 1].index)},${y(0)} Z`
      : ''
  const range = `${formatDueDate(days[0].day, today)} – ${formatDueDate(days[6].day, today)}`
  const summary = `Burndown for ${range}: ${startRemaining} open at the start of the week, ${stats.remaining} open now, ${plural(stats.completedThisWeek, 'issue')} completed this week.`

  return (
    <div className="overview-panel weekly-stats">
      <div className="section-heading">
        <h3>This week</h3>
        <span>{range}</span>
      </div>
      <div className="weekly-stats__numbers">
        <div>
          <span>Completed</span>
          <strong>{stats.completedThisWeek}</strong>
          <small
            className={
              delta > 0 ? 'weekly-stats__delta--up' : delta < 0 ? 'weekly-stats__delta--down' : ''
            }
          >
            {delta === 0 ? 'Same as' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} vs`} last week
          </small>
        </div>
        <div>
          <span>Remaining</span>
          <strong>
            {stats.remaining}
            <em> / {stats.scope}</em>
          </strong>
          <small>Open across the board</small>
        </div>
        <div>
          <span>Daily average</span>
          <strong>{average.toFixed(1)}</strong>
          <small>Issues completed per day</small>
        </div>
      </div>
      {stats.scope === 0 ? (
        <p className="weekly-stats__empty">No issues yet. Add one to start the burndown.</p>
      ) : (
        <figure className="burndown">
          <div className="burndown__chart" role="img" aria-label={summary}>
            <div className="burndown__axis" aria-hidden="true">
              {ticks.map((tick) => (
                <span key={tick} style={{ top: `${y(tick)}%` }}>
                  {tick}
                </span>
              ))}
            </div>
            <div className="burndown__plot" aria-hidden="true">
              <svg viewBox="0 0 700 100" preserveAspectRatio="none">
                {ticks.map((tick) => (
                  <line key={tick} className="burndown__grid" x1={0} x2={700} y1={y(tick)} y2={y(tick)} />
                ))}
                <line
                  className="burndown__ideal"
                  x1={x(0)}
                  y1={y(startRemaining)}
                  x2={x(6)}
                  y2={y(0)}
                />
                {area && <path className="burndown__area" d={area} />}
                <polyline className="burndown__actual" points={line.join(' ')} />
              </svg>
              {actual.map((point) => (
                <span
                  key={point.day}
                  className={`burndown__point${point.day === todayKey ? ' burndown__point--today' : ''}`}
                  style={{ left: `${x(point.index) / 7}%`, top: `${y(point.remaining)}%` }}
                  title={`${WEEKDAYS[point.index]} ${formatDueDate(point.day, today)}: ${point.remaining} remaining, ${point.completed} completed`}
                />
              ))}
            </div>
            <div className="burndown__days" aria-hidden="true">
              {days.map((day, index) => (
                <span
                  key={day.day}
                  className={day.day === todayKey ? 'burndown__day--today' : undefined}
                >
                  {day.day === todayKey ? 'Today' : WEEKDAYS[index]}
                </span>
              ))}
            </div>
          </div>
          <figcaption className="burndown__legend">
            <span>
              <i className="burndown__swatch" />
              Remaining issues
            </span>
            <span>
              <i className="burndown__swatch burndown__swatch--ideal" />
              Ideal pace
            </span>
          </figcaption>
        </figure>
      )}
    </div>
  )
}
