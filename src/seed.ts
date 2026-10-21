import { ASSIGNEES, LABEL_ORDER } from './data'
import type { BoardState, Card, Column, ColumnId, LabelId } from './types'

export const MAX_SEED_CARDS = 100_000
const RANDOM_SEED = 0x0b17

const VERBS = [
  'Fix', 'Add', 'Refactor', 'Design', 'Document', 'Migrate', 'Optimize',
  'Investigate', 'Implement', 'Remove', 'Update', 'Test', 'Polish', 'Audit',
]
const SUBJECTS = [
  'login redirect', 'onboarding flow', 'billing page', 'search results',
  'notification settings', 'API rate limiter', 'CSV export', 'dark mode',
  'dashboard charts', 'user avatars', 'webhook retries', 'session timeout',
  'invite emails', 'audit log', 'file uploads', 'pricing table',
  'mobile navigation', 'cache invalidation', 'SSO callback', 'error boundary',
  'keyboard shortcuts', 'empty states', 'date picker', 'release notes',
]
const CONTEXTS = [
  'on Safari', 'for enterprise plans', 'in the admin panel', 'for new users',
  'behind a feature flag', 'on slow networks', 'in the mobile app',
  'for the EU region', 'after sign-up', 'in staging',
]
const DESCRIPTIONS = [
  'Reported by several customers this week; reproduce and fix before the release.',
  'Follow the spec in the design doc and keep the existing behaviour as a fallback.',
  'Add tests that cover the edge cases we hit in the last incident.',
  'Coordinate with support so the help center article stays accurate.',
  'Measure before and after so we can share the improvement in the changelog.',
  '',
]
const COLUMNS: { id: ColumnId; title: string; accent: string; weight: number }[] = [
  { id: 'backlog', title: 'Backlog', accent: '#94a3b8', weight: 0.4 },
  { id: 'in-progress', title: 'In Progress', accent: '#3b82f6', weight: 0.25 },
  { id: 'review', title: 'Review', accent: '#a855f7', weight: 0.15 },
  { id: 'done', title: 'Done', accent: '#22c55e', weight: 0.2 },
]

/** Card count from a `?seed=N` query string, or null when absent/invalid. */
export function parseSeedCount(search: string): number | null {
  const raw = new URLSearchParams(search).get('seed')
  if (raw === null || !/^\d+$/.test(raw)) return null
  const count = Number(raw)
  return count > 0 ? Math.min(count, MAX_SEED_CARDS) : null
}

// mulberry32: tiny deterministic PRNG so every run produces the same board.
function createRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A board with `count` generated cards spread over the four columns. */
export function createGeneratedBoard(count: number): BoardState {
  const random = createRandom(RANDOM_SEED)
  const pick = <T,>(items: readonly T[]) =>
    items[Math.floor(random() * items.length)]
  const assigneeIds = Object.keys(ASSIGNEES)
  const cards: Record<string, Card> = {}
  const columns: Column[] = COLUMNS.map(({ id, title, accent }) => ({
    id,
    title,
    accent,
    cardIds: [],
  }))

  for (let index = 0; index < count; index++) {
    const id = `KB-${index + 1}`
    const labels = new Set<LabelId>([pick(LABEL_ORDER)])
    if (random() < 0.3) labels.add(pick(LABEL_ORDER))
    const dueRoll = random()
    const month = 1 + Math.floor(random() * 12)
    const day = 1 + Math.floor(random() * 28)
    cards[id] = {
      id,
      title: `${pick(VERBS)} ${pick(SUBJECTS)}${random() < 0.5 ? ` ${pick(CONTEXTS)}` : ''}`,
      description: pick(DESCRIPTIONS),
      labels: LABEL_ORDER.filter((label) => labels.has(label)),
      assigneeId: random() < 0.1 ? null : pick(assigneeIds),
      dueDate:
        dueRoll < 0.25
          ? `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          : null,
      completedAt: null,
    }

    let roll = random()
    const column =
      columns.find((_, columnIndex) => {
        roll -= COLUMNS[columnIndex].weight
        return roll < 0
      }) ?? columns[0]
    column.cardIds.push(id)
  }

  return { columns, cards, nextCardNumber: count + 1 }
}
