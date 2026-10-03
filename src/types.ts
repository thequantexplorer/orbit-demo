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
}
