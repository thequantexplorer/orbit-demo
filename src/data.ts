import type { Assignee, BoardState, Card, Label, LabelId } from './types'

export const LABELS: Record<LabelId, Label> = {
  bug: { id: 'bug', name: 'Bug', color: '#ef4444' },
  feature: { id: 'feature', name: 'Feature', color: '#22c55e' },
  design: { id: 'design', name: 'Design', color: '#a855f7' },
  docs: { id: 'docs', name: 'Docs', color: '#3b82f6' },
  devops: { id: 'devops', name: 'DevOps', color: '#f59e0b' },
  urgent: { id: 'urgent', name: 'Urgent', color: '#f43f5e' },
}

export const LABEL_ORDER: LabelId[] = ['bug', 'feature', 'design', 'docs', 'devops', 'urgent']

export const ASSIGNEES: Record<string, Assignee> = {
  ava: { id: 'ava', name: 'Ava Chen', initials: 'AC', color: '#6366f1' },
  marcus: { id: 'marcus', name: 'Marcus Reed', initials: 'MR', color: '#0ea5e9' },
  priya: { id: 'priya', name: 'Priya Patel', initials: 'PP', color: '#ec4899' },
  leo: { id: 'leo', name: 'Leo Martins', initials: 'LM', color: '#14b8a6' },
  sofia: { id: 'sofia', name: 'Sofia Novak', initials: 'SN', color: '#f97316' },
}

const seedCards: Card[] = [
  {
    id: 'KB-1',
    title: 'Set up CI pipeline',
    description: 'Run lint, typecheck and tests on every pull request using GitHub Actions.',
    labels: ['devops'],
    assigneeId: 'marcus',
  },
  {
    id: 'KB-2',
    title: 'Design onboarding flow',
    description: 'Three-step welcome tour with progress dots and a skip option.',
    labels: ['design'],
    assigneeId: 'priya',
  },
  {
    id: 'KB-3',
    title: 'Write API documentation',
    description: 'Document the public REST endpoints with request/response examples.',
    labels: ['docs'],
    assigneeId: 'ava',
  },
  {
    id: 'KB-4',
    title: 'Fix login redirect bug',
    description: 'After signing in with SSO the user lands on a blank page instead of the dashboard.',
    labels: ['bug', 'urgent'],
    assigneeId: 'leo',
  },
  {
    id: 'KB-5',
    title: 'Implement dark mode',
    description: 'Respect the OS preference and add a manual toggle in settings.',
    labels: ['feature'],
    assigneeId: 'sofia',
  },
  {
    id: 'KB-6',
    title: 'Migrate build to Vite',
    description: 'Replace the legacy webpack config and update the dev scripts.',
    labels: ['devops', 'feature'],
    assigneeId: 'marcus',
  },
  {
    id: 'KB-7',
    title: 'Refactor auth middleware',
    description: 'Split token validation from session lookup so both can be unit tested.',
    labels: ['feature'],
    assigneeId: 'ava',
  },
  {
    id: 'KB-8',
    title: 'Landing page copy',
    description: 'Final copy for the hero, features and pricing sections.',
    labels: ['docs', 'design'],
    assigneeId: 'priya',
  },
  {
    id: 'KB-9',
    title: 'Add unit tests for cart',
    description: 'Cover quantity changes, coupon codes and empty-cart edge cases.',
    labels: ['feature'],
    assigneeId: 'leo',
  },
]

export function createSeedBoard(): BoardState {
  return {
    columns: [
      { id: 'backlog', title: 'Backlog', accent: '#94a3b8', cardIds: ['KB-1', 'KB-2', 'KB-3', 'KB-4'] },
      { id: 'in-progress', title: 'In Progress', accent: '#3b82f6', cardIds: ['KB-5', 'KB-6'] },
      { id: 'review', title: 'Review', accent: '#a855f7', cardIds: ['KB-7'] },
      { id: 'done', title: 'Done', accent: '#22c55e', cardIds: ['KB-8', 'KB-9'] },
    ],
    cards: Object.fromEntries(seedCards.map((card) => [card.id, card])),
    nextCardNumber: seedCards.length + 1,
  }
}
