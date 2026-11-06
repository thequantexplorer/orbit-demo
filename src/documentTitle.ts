import type { WorkspaceView } from './types'

export type IssueLayout = 'board' | 'list'

const VIEW_NAMES: Record<Exclude<WorkspaceView, 'project'>, string> = {
  all: 'All issues',
  mine: 'My issues',
  completed: 'Completed issues',
  overview: 'Overview',
}

const LAYOUT_NAMES: Record<IssueLayout, string> = {
  board: 'Board',
  list: 'List',
}

/** Browser tab title for the current view, e.g. "Board · Orbit". */
export function documentTitle(view: WorkspaceView, layout: IssueLayout) {
  const name = view === 'project' ? LAYOUT_NAMES[layout] : VIEW_NAMES[view]
  return `${name} · Orbit`
}
