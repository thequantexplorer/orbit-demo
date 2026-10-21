export type LabelId =
  | 'bug'
  | 'feature'
  | 'design'
  | 'docs'
  | 'devops'
  | 'urgent'

export interface Label {
  id: LabelId
  name: string
  color: string
}

export interface Assignee {
  id: string
  name: string
  initials: string
  color: string
}

export interface Card {
  id: string
  title: string
  description: string
  labels: LabelId[]
  assigneeId: string | null
  /** Optional due day as `YYYY-MM-DD` (local calendar date). */
  dueDate: string | null
  /** Creation time as epoch milliseconds, or null when unknown. */
  createdAt: number | null
  /** Completion time as epoch milliseconds, or null when unknown. */
  completedAt: number | null
}

export interface CompletionRecord {
  id: string
  createdAt: number | null
  completedAt: number
}

export type ColumnId = 'backlog' | 'in-progress' | 'review' | 'done'
export type WorkspaceView =
  | 'project'
  | 'overview'
  | 'all'
  | 'mine'
  | 'completed'

export interface Column {
  id: ColumnId
  title: string
  accent: string
  cardIds: string[]
}

export interface BoardState {
  columns: Column[]
  cards: Record<string, Card>
  nextCardNumber: number
  archivedCompletions: CompletionRecord[]
}
