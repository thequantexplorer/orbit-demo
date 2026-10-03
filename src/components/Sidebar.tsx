import type { WorkspaceView } from '../types'
import { Avatar } from './Avatar'
import { Icon, type IconName } from './Icon'

interface SidebarProps {
  view: WorkspaceView
  onNavigate: (view: WorkspaceView) => void
  onSearch: () => void
  onCreate: () => void
  onReset: () => void
  onHelp: () => void
  dark: boolean
  onTheme: () => void
  total: number
  mine: number
  done: number
  starred: boolean
  expanded: boolean
}

export function Sidebar({
  view,
  onNavigate,
  onSearch,
  onCreate,
  onReset,
  onHelp,
  dark,
  onTheme,
  total,
  mine,
  done,
  starred,
  expanded,
}: SidebarProps) {
  const navItem = (
    target: WorkspaceView,
    icon: IconName,
    label: string,
    count?: number,
  ) => (
    <button
      className={`nav-item${view === target ? ' nav-item--active' : ''}`}
      onClick={() => onNavigate(target)}
      aria-current={view === target ? 'page' : undefined}
    >
      <Icon name={icon} />
      <span>{label}</span>
      {count !== undefined && <span className="nav-item__count">{count}</span>}
    </button>
  )

  return (
    <aside className={`sidebar${expanded ? ' sidebar--expanded' : ''}`}>
      <div className="workspace-brand">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          Orbit<span className="workspace-plan">Workspace</span>
        </span>
        <span className="workspace-monogram">A</span>
      </div>
      <div className="sidebar__quick-actions">
        <button className="quick-search" onClick={onSearch}>
          <Icon name="search" />
          <span>Search anything</span>
          <kbd>⌘ K</kbd>
        </button>
        <button
          className="icon-button create-shortcut"
          onClick={onCreate}
          aria-label="Create issue"
          title="Create issue (C)"
        >
          <Icon name="plus" />
        </button>
      </div>
      <nav aria-label="Workspace navigation">
        <div className="nav-group">
          <span className="nav-heading">Workspace</span>
          {navItem('overview', 'layers', 'Overview')}
          {navItem('all', 'box', 'All issues', total)}
          {navItem('mine', 'user', 'My issues', mine)}
          {navItem('completed', 'circleCheck', 'Completed', done)}
        </div>
        <div className="nav-group">
          <span className="nav-heading">
            Your projects <span>1</span>
          </span>
          <button
            className={`nav-item project-nav${view === 'project' ? ' nav-item--active' : ''}`}
            onClick={() => onNavigate('project')}
            aria-current={view === 'project' ? 'page' : undefined}
          >
            <span className="project-mini">
              <Icon name="layers" size={13} />
            </span>
            <span>Product launch</span>
            <span className="project-active-dot" />
          </button>
          <div className="nav-project-caption">
            <span />
            Sprint 42
          </div>
        </div>
        {starred && (
          <div className="nav-group">
            <span className="nav-heading">Favorites</span>
            <button className="nav-item" onClick={() => onNavigate('project')}>
              <Icon name="star" />
              <span>Product launch</span>
            </button>
          </div>
        )}
      </nav>
      <div className="sidebar__bottom">
        <div className="workspace-note">
          <div className="workspace-note__icon">
            <Icon name="command" size={17} />
          </div>
          <strong>A little less clicking.</strong>
          <p>Your next action is a shortcut away.</p>
          <button onClick={onHelp}>
            Explore shortcuts <Icon name="arrow" size={13} />
          </button>
        </div>
        <button className="nav-item reset-button" onClick={onReset}>
          <Icon name="reset" />
          <span>Reset board</span>
        </button>
        <div className="sidebar__profile">
          <Avatar assigneeId="ava" size="md" />
          <div>
            <strong>Ava Chen</strong>
            <span>Personal workspace</span>
          </div>
          <button
            className="icon-button"
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            title={dark ? 'Light theme' : 'Dark theme'}
            onClick={onTheme}
          >
            <Icon name={dark ? 'sun' : 'moon'} />
          </button>
        </div>
      </div>
    </aside>
  )
}
