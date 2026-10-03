import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { boardReducer, findColumnOfCard } from './boardReducer'
import { ASSIGNEES, LABELS, LABEL_ORDER, createSeedBoard } from './data'
import { loadBoard, saveBoard } from './storage'
import type {
  BoardState,
  Card,
  ColumnId,
  LabelId,
  WorkspaceView,
} from './types'
import { CardModal } from './components/CardModal'
import { CardView } from './components/CardView'
import { ColumnView } from './components/ColumnView'
import { Avatar } from './components/Avatar'
import { CommandMenu } from './components/CommandMenu'
import { Dialog } from './components/Dialog'
import { Icon, ProgressRing, StatusIcon } from './components/Icon'
import { LabelPill } from './components/LabelPill'
import { Sidebar } from './components/Sidebar'

const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args)
  const cardHits = within.filter(
    (hit) => hit.data?.droppableContainer?.data.current?.type === 'card',
  )
  if (cardHits.length > 0) return cardHits
  if (within.length > 0) return within
  return closestCorners(args)
}

function issueCountLabel(count: number) {
  return `${count} ${count === 1 ? 'issue' : 'issues'}`
}

export default function App() {
  const [board, dispatch] = useReducer(
    boardReducer,
    undefined,
    () => loadBoard() ?? createSeedBoard(),
  )
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [overColumnId, setOverColumnId] = useState<ColumnId | null>(null)
  const [openCardId, setOpenCardId] = useState<string | null>(null)
  const [view, setView] = useState<WorkspaceView>('project')
  const [layout, setLayout] = useState<'board' | 'list'>('board')
  const [query, setQuery] = useState('')
  const [labelFilter, setLabelFilter] = useState<LabelId[]>([])
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [descriptions, setDescriptions] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [starred, setStarred] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [saved, setSaved] = useState(true)
  const [toast, setToast] = useState('')
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('kanban-theme') === 'dark'
    } catch {
      return false
    }
  })
  const dragSnapshot = useRef<BoardState | null>(null)

  useEffect(() => {
    if (!activeCardId) setSaved(saveBoard(board))
  }, [board, activeCardId])

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try {
      localStorage.setItem('kanban-theme', dark ? 'dark' : 'light')
    } catch {
      /* The theme still works without storage. */
    }
  }, [dark])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (activeCardId || document.querySelector('dialog[open]')) return
      const target = event.target
      const editing =
        target instanceof HTMLElement &&
        (target.matches('input, textarea, select') || target.isContentEditable)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      } else if (
        !editing &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        if (event.key.toLowerCase() === 'c') {
          event.preventDefault()
          setOpenCardId('new')
        }
        if (event.key === '/') {
          event.preventDefault()
          document.getElementById('board-search')?.focus()
        }
        if (event.key === '?') setHelpOpen(true)
      }
      if (event.key === 'Escape') {
        document
          .querySelectorAll<HTMLDetailsElement>('details[open]')
          .forEach((details) => {
            details.open = false
          })
        setSidebarOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [activeCardId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const resolveColumn = useCallback(
    (id: UniqueIdentifier): ColumnId | undefined => {
      const asColumn = board.columns.find((column) => column.id === id)
      return asColumn ? asColumn.id : findColumnOfCard(board, String(id))
    },
    [board],
  )

  function handleDragStart({ active }: DragStartEvent) {
    dragSnapshot.current = board
    setActiveCardId(String(active.id))
    setOverColumnId(resolveColumn(active.id) ?? null)
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const fromColumn = resolveColumn(active.id)
    const toColumn = resolveColumn(over.id)
    if (!fromColumn || !toColumn) return
    setOverColumnId(toColumn)
    if (fromColumn === toColumn) return

    const target = board.columns.find((column) => column.id === toColumn)
    if (!target) return

    let toIndex = target.cardIds.length
    if (over.id !== toColumn) {
      const overIndex = target.cardIds.indexOf(String(over.id))
      const translated = active.rect.current.translated
      const isBelowOver = translated
        ? translated.top + translated.height / 2 >
          over.rect.top + over.rect.height / 2
        : false
      toIndex = overIndex + (isBelowOver ? 1 : 0)
    }
    dispatch({
      type: 'move-card',
      cardId: String(active.id),
      toColumn,
      toIndex,
    })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) {
      handleDragCancel()
      return
    }
    dragSnapshot.current = null
    setActiveCardId(null)
    setOverColumnId(null)
    const fromColumn = resolveColumn(active.id)
    const toColumn = resolveColumn(over.id)
    if (!fromColumn || !toColumn || fromColumn !== toColumn) return

    const column = board.columns.find((entry) => entry.id === fromColumn)
    if (!column) return
    const fromIndex = column.cardIds.indexOf(String(active.id))
    const toIndex =
      over.id === toColumn
        ? column.cardIds.length - 1
        : column.cardIds.indexOf(String(over.id))
    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      dispatch({
        type: 'reorder-card',
        columnId: fromColumn,
        fromIndex,
        toIndex,
      })
    }
  }

  function handleDragCancel() {
    if (dragSnapshot.current)
      dispatch({ type: 'restore', board: dragSnapshot.current })
    dragSnapshot.current = null
    setActiveCardId(null)
    setOverColumnId(null)
  }

  const closeModal = useCallback(() => setOpenCardId(null), [])
  const navigate = (next: WorkspaceView) => {
    setView(next)
    setQuery('')
    setLabelFilter([])
    setAssigneeFilter('')
    setSidebarOpen(false)
  }

  const activeCard = activeCardId ? board.cards[activeCardId] : undefined
  const creating = openCardId === 'new'
  const openCard: Card | undefined = creating
    ? { id: 'new', title: '', description: '', labels: [], assigneeId: null }
    : openCardId
      ? board.cards[openCardId]
      : undefined
  const openCardColumn = openCardId
    ? board.columns.find((column) => column.cardIds.includes(openCardId))
    : undefined
  const totalCards = Object.keys(board.cards).length
  const doneCount =
    board.columns.find((column) => column.id === 'done')?.cardIds.length ?? 0
  const mineCount = Object.values(board.cards).filter(
    (card) => card.assigneeId === 'ava',
  ).length
  const percentDone = totalCards
    ? Math.round((doneCount / totalCards) * 100)
    : 0
  const filterCount = labelFilter.length + (assigneeFilter ? 1 : 0)
  const hasFilters = Boolean(
    query || filterCount || view === 'mine' || view === 'completed',
  )
  const titles: Record<WorkspaceView, string> = {
    project: 'Product launch',
    all: 'All issues',
    mine: 'My issues',
    completed: 'Completed issues',
    overview: 'Project overview',
  }
  const subtitles: Record<WorkspaceView, string> = {
    project: 'The details that make the difference. Let’s ship them.',
    all: 'Everything the team is working on, in one place.',
    mine: 'Your space to focus. Issues assigned to Ava Chen.',
    completed: 'Small wins. Meaningful progress. A little closer to launch.',
    overview: 'A clear view of where we are, and what comes next.',
  }
  const visibleColumns = board.columns.map((column) => ({
    ...column,
    cards: column.cardIds
      .map((id) => board.cards[id])
      .filter(
        (card) =>
          card &&
          `${card.title} ${card.id} ${card.description}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (!labelFilter.length ||
            labelFilter.some((label) => card.labels.includes(label))) &&
          (!assigneeFilter || card.assigneeId === assigneeFilter) &&
          (view !== 'mine' || card.assigneeId === 'ava') &&
          (view !== 'completed' || column.id === 'done'),
      ),
  }))
  const visibleCount = visibleColumns.reduce(
    (sum, column) => sum + column.cards.length,
    0,
  )
  const clearFilters = () => {
    setQuery('')
    setLabelFilter([])
    setAssigneeFilter('')
  }
  const themeToggle = () => setDark((current) => !current)

  return (
    <div className={`app${descriptions ? '' : ' app--compact'}`}>
      <Sidebar
        view={view}
        onNavigate={navigate}
        onSearch={() => setCommandOpen(true)}
        onCreate={() => setOpenCardId('new')}
        onReset={() => setResetOpen(true)}
        onHelp={() => setHelpOpen(true)}
        dark={dark}
        onTheme={themeToggle}
        total={totalCards}
        mine={mineCount}
        done={doneCount}
        starred={starred}
        expanded={sidebarOpen}
      />
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation"
              aria-expanded={sidebarOpen}
            >
              <Icon name="sidebar" />
            </button>
            <span className="breadcrumb-workspace">Workspace</span>
            <Icon name="chevron" size={12} />
            <span>Projects</span>
            <Icon name="chevron" size={12} />
            <span className="breadcrumb-current">
              <span className="project-mini">
                <Icon name="layers" size={12} />
              </span>
              Product launch
            </span>
          </div>
          <button
            className="icon-button"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
            onClick={() => setHelpOpen(true)}
          >
            <Icon name="help" size={17} />
          </button>
        </header>
        <section className="project-header">
          <div className="project-heading">
            <div className="project-emblem">
              <Icon name="layers" size={25} />
            </div>
            <div className="project-heading__copy">
              <div className="project-title-row">
                <h1>{titles[view]}</h1>
                <button
                  className={`icon-button favorite-button${starred ? ' favorite-button--active' : ''}`}
                  aria-label={
                    starred
                      ? 'Remove project from favorites'
                      : 'Add project to favorites'
                  }
                  aria-pressed={starred}
                  onClick={() => setStarred(!starred)}
                  title="Favorite project"
                >
                  <Icon name="star" size={17} />
                </button>
              </div>
              <p>{subtitles[view]}</p>
            </div>
            <button
              className="button button--primary new-issue-button"
              onClick={() => setOpenCardId('new')}
            >
              <Icon name="plus" size={15} />
              New issue<kbd>C</kbd>
            </button>
          </div>
          <div className="project-properties">
            <span className="project-status">
              <span />
              {percentDone === 100 ? 'Complete' : 'In progress'}
            </span>
            <span className="property-divider" />
            <span className="project-property">
              <Icon name="cycle" size={14} />
              Sprint 42
            </span>
            <span className="property-divider" />
            <span className="project-property">
              <Icon name="box" size={14} />
              {issueCountLabel(totalCards)}
            </span>
            <div className="project-team">
              <div className="avatar-group">
                {Object.values(ASSIGNEES).map((assignee) => (
                  <Avatar key={assignee.id} assigneeId={assignee.id} />
                ))}
              </div>
              <span>{Object.keys(ASSIGNEES).length} members</span>
            </div>
          </div>
          <div className="project-tabs">
            <button
              className={
                view !== 'overview'
                  ? 'project-tab project-tab--active'
                  : 'project-tab'
              }
              onClick={() => navigate('project')}
            >
              <Icon name="board" size={15} />
              Issues<span>{totalCards}</span>
            </button>
            <button
              className={
                view === 'overview'
                  ? 'project-tab project-tab--active'
                  : 'project-tab'
              }
              onClick={() => navigate('overview')}
            >
              <Icon name="layers" size={15} />
              Overview
            </button>
            <div className="project-progress">
              <ProgressRing value={percentDone} />
              <span>{percentDone}% complete</span>
            </div>
          </div>
        </section>
        {view === 'overview' ? (
          <section className="overview">
            <div className="overview-intro">
              <span className="eyebrow">PRODUCT / SPRINT 42</span>
              <h2>
                Great work is a series
                <br />
                of small steps.
              </h2>
              <p>
                A shared space for the ideas, fixes, and finishing touches
                <br className="desktop-break" /> that bring the next release to
                life.
              </p>
              <button className="button" onClick={() => navigate('project')}>
                Open project board <Icon name="arrow" size={14} />
              </button>
            </div>
            <div className="overview-stats">
              <div>
                <span>Total issues</span>
                <strong>{totalCards}</strong>
                <small>Across all four stages</small>
              </div>
              <div>
                <span>In progress</span>
                <strong>
                  {board.columns.find((column) => column.id === 'in-progress')
                    ?.cardIds.length ?? 0}
                </strong>
                <small>Moving the project forward</small>
              </div>
              <div>
                <span>Completed</span>
                <strong>
                  {doneCount}
                  <em> / {totalCards}</em>
                </strong>
                <small>{percentDone}% of the way there</small>
              </div>
            </div>
            <div className="overview-panel">
              <div className="section-heading">
                <h3>Project progress</h3>
                <span>{percentDone}% complete</span>
              </div>
              <div className="progress-track">
                {board.columns.map((column) => (
                  <span
                    key={column.id}
                    className={`progress-segment progress-segment--${column.id}`}
                    style={{
                      width: `${totalCards ? (column.cardIds.length / totalCards) * 100 : 0}%`,
                    }}
                  />
                ))}
              </div>
              <div className="progress-legend">
                {board.columns.map((column) => (
                  <span key={column.id}>
                    <StatusIcon status={column.id} />
                    {column.title}
                    <strong>{column.cardIds.length}</strong>
                  </span>
                ))}
              </div>
            </div>
            <div className="overview-panel">
              <div className="section-heading">
                <h3>The team</h3>
                <span>{Object.keys(ASSIGNEES).length} members</span>
              </div>
              <div className="team-grid">
                {Object.values(ASSIGNEES).map((person) => (
                  <button
                    key={person.id}
                    className="team-member"
                    onClick={() => {
                      navigate('project')
                      setAssigneeFilter(person.id)
                    }}
                  >
                    <Avatar assigneeId={person.id} size="md" />
                    <span>
                      <strong>{person.name}</strong>
                      <small>
                        {issueCountLabel(
                          Object.values(board.cards).filter(
                            (card) => card.assigneeId === person.id,
                          ).length,
                        )}{' '}
                        assigned
                      </small>
                    </span>
                    <Icon name="arrow" size={14} />
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <>
            <div className="board-toolbar">
              <div className="toolbar-left">
                <div className="view-switch" aria-label="Issue layout">
                  <button
                    className={layout === 'board' ? 'is-selected' : ''}
                    aria-pressed={layout === 'board'}
                    onClick={() => setLayout('board')}
                  >
                    <Icon name="board" size={14} />
                    <span>Board</span>
                  </button>
                  <button
                    className={layout === 'list' ? 'is-selected' : ''}
                    aria-pressed={layout === 'list'}
                    onClick={() => setLayout('list')}
                  >
                    <Icon name="list" size={15} />
                    <span>List</span>
                  </button>
                </div>
                <span className="toolbar-divider" />
                <details
                  className="popover"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget))
                      event.currentTarget.open = false
                  }}
                >
                  <summary
                    className={`toolbar-button${filterCount ? ' toolbar-button--active' : ''}`}
                  >
                    <Icon name="filter" size={15} />
                    Filter
                    {filterCount > 0 && (
                      <span className="filter-badge">{filterCount}</span>
                    )}
                  </summary>
                  <div className="popover-panel">
                    <h3>Filter issues</h3>
                    <span className="popover-label">Labels</span>
                    {LABEL_ORDER.map((label) => (
                      <label key={label} className="filter-option">
                        <input
                          type="checkbox"
                          checked={labelFilter.includes(label)}
                          onChange={() =>
                            setLabelFilter((current) =>
                              current.includes(label)
                                ? current.filter((entry) => entry !== label)
                                : [...current, label],
                            )
                          }
                        />
                        <LabelPill labelId={label} />
                        <span className="filter-option__count">
                          {
                            Object.values(board.cards).filter((card) =>
                              card.labels.includes(label),
                            ).length
                          }
                        </span>
                      </label>
                    ))}
                    <label className="popover-label" htmlFor="filter-assignee">
                      Assignee
                    </label>
                    <select
                      id="filter-assignee"
                      className="filter-select"
                      value={assigneeFilter}
                      onChange={(event) =>
                        setAssigneeFilter(event.target.value)
                      }
                    >
                      <option value="">All members</option>
                      {Object.values(ASSIGNEES).map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="button clear-filter-button"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  </div>
                </details>
              </div>
              <div className="toolbar-right">
                <div className="board-search">
                  <Icon name="search" size={14} />
                  <input
                    id="board-search"
                    placeholder="Search issues…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Search board"
                  />
                  {query ? (
                    <button
                      className="icon-button"
                      aria-label="Clear search"
                      onClick={() => setQuery('')}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  ) : (
                    <kbd>/</kbd>
                  )}
                </div>
                <details
                  className="popover popover--right"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget))
                      event.currentTarget.open = false
                  }}
                >
                  <summary className="toolbar-button">
                    <Icon name="sliders" size={15} />
                    <span>Display</span>
                  </summary>
                  <div className="popover-panel">
                    <h3>Display options</h3>
                    <label className="display-option">
                      <span>Show descriptions</span>
                      <input
                        type="checkbox"
                        role="switch"
                        checked={descriptions}
                        onChange={(event) =>
                          setDescriptions(event.target.checked)
                        }
                      />
                    </label>
                    <label className="display-option">
                      <span>Dark appearance</span>
                      <input
                        type="checkbox"
                        role="switch"
                        checked={dark}
                        onChange={(event) => setDark(event.target.checked)}
                      />
                    </label>
                  </div>
                </details>
              </div>
            </div>
            {(query || filterCount > 0) && (
              <div className="active-filters">
                <span>
                  {visibleCount} matching{' '}
                  {visibleCount === 1 ? 'issue' : 'issues'}
                </span>
                {labelFilter.map((label) => (
                  <button
                    key={label}
                    onClick={() =>
                      setLabelFilter(
                        labelFilter.filter((entry) => entry !== label),
                      )
                    }
                  >
                    {LABELS[label].name}
                    <Icon name="close" size={11} />
                  </button>
                ))}
                {assigneeFilter && (
                  <button onClick={() => setAssigneeFilter('')}>
                    {ASSIGNEES[assigneeFilter]?.name}
                    <Icon name="close" size={11} />
                  </button>
                )}
                <button className="clear-all" onClick={clearFilters}>
                  Clear all
                </button>
              </div>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetection}
              measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              {layout === 'board' ? (
                <div className="board" aria-label="Issue board">
                  {visibleColumns.map((column) => (
                    <ColumnView
                      key={column.id}
                      column={column}
                      cards={column.cards}
                      filtered={hasFilters}
                      isDropTarget={
                        activeCardId !== null && overColumnId === column.id
                      }
                      onAddCard={(title) => {
                        dispatch({
                          type: 'add-card',
                          columnId: column.id,
                          title,
                        })
                        setToast('Issue created')
                      }}
                      onOpenCard={setOpenCardId}
                    />
                  ))}
                </div>
              ) : (
                <div className="issue-list" aria-label="Issue list">
                  {visibleColumns.map((column) => (
                    <section className="list-group" key={column.id}>
                      <header>
                        <StatusIcon status={column.id} />
                        <h2>{column.title}</h2>
                        <span>{column.cards.length}</span>
                      </header>
                      {column.cards.map((card) => (
                        <button
                          className="issue-row"
                          key={card.id}
                          onClick={() => setOpenCardId(card.id)}
                        >
                          <span className="card__id">{card.id}</span>
                          <StatusIcon status={column.id} />
                          <strong>{card.title}</strong>
                          <span className="issue-row__labels">
                            {card.labels.map((label) => (
                              <LabelPill key={label} labelId={label} />
                            ))}
                          </span>
                          <Avatar assigneeId={card.assigneeId} />
                          <Icon name="chevron" size={12} />
                        </button>
                      ))}
                      {column.cards.length === 0 && (
                        <p className="list-empty">No issues in this view</p>
                      )}
                    </section>
                  ))}
                </div>
              )}
              <DragOverlay
                dropAnimation={{
                  duration: 200,
                  easing: 'cubic-bezier(0.2, 0, 0, 1)',
                }}
              >
                {activeCard ? <CardView card={activeCard} overlay /> : null}
              </DragOverlay>
            </DndContext>
          </>
        )}
        <footer className="workspace-footer">
          <span className={`save-state${saved ? '' : ' save-state--error'}`}>
            <span />
            {activeCardId
              ? 'Moving issue…'
              : saved
                ? 'All changes saved locally'
                : 'Storage unavailable — changes won’t survive refresh'}
          </span>
          <span className="footer-tip">
            {view === 'overview'
              ? 'Built for the way you work.'
              : 'Drag to move · Click to edit'}
            <span className="footer-divider" />
            <button onClick={() => setHelpOpen(true)}>
              <kbd>?</kbd> Shortcuts
            </button>
          </span>
        </footer>
      </main>
      {openCard && (
        <CardModal
          key={openCard.id}
          card={openCard}
          columnId={openCardColumn?.id ?? 'backlog'}
          columns={board.columns}
          creating={creating}
          onSave={(patch, columnId) => {
            if (creating) {
              dispatch({
                type: 'add-card',
                columnId,
                title: patch.title,
                details: patch,
              })
              navigate('project')
            } else {
              dispatch({ type: 'update-card', cardId: openCard.id, patch })
              if (columnId !== openCardColumn?.id)
                dispatch({
                  type: 'move-card',
                  cardId: openCard.id,
                  toColumn: columnId,
                  toIndex:
                    board.columns.find((column) => column.id === columnId)
                      ?.cardIds.length ?? 0,
                })
            }
            setToast(creating ? 'Issue created' : 'Issue updated')
          }}
          onDelete={() => {
            dispatch({ type: 'delete-card', cardId: openCard.id })
            closeModal()
            setToast('Issue deleted')
          }}
          onClose={closeModal}
        />
      )}
      {commandOpen && (
        <CommandMenu
          cards={Object.values(board.cards)}
          onClose={() => setCommandOpen(false)}
          onOpen={setOpenCardId}
          onCreate={() => setOpenCardId('new')}
          onTheme={themeToggle}
        />
      )}
      {resetOpen && (
        <Dialog
          className="small-dialog"
          labelledBy="reset-title"
          onClose={() => setResetOpen(false)}
        >
          <span className="dialog-symbol">
            <Icon name="reset" size={23} />
          </span>
          <h2 id="reset-title">A fresh start?</h2>
          <p>
            This will replace your current board with the nine original issues.
            Your edits and new issues will be removed.
          </p>
          <footer>
            <button
              className="button"
              autoFocus
              onClick={() => setResetOpen(false)}
            >
              Keep working
            </button>
            <button
              className="button button--primary"
              onClick={() => {
                dispatch({ type: 'reset' })
                navigate('project')
                setResetOpen(false)
                setToast('Board reset to the original issues')
              }}
            >
              Reset board
            </button>
          </footer>
        </Dialog>
      )}
      {helpOpen && (
        <Dialog
          className="small-dialog shortcuts-dialog"
          labelledBy="shortcuts-title"
          onClose={() => setHelpOpen(false)}
        >
          <div className="section-heading">
            <span className="dialog-symbol">
              <Icon name="command" size={23} />
            </span>
            <button
              className="icon-button"
              aria-label="Close shortcuts"
              onClick={() => setHelpOpen(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <h2 id="shortcuts-title">Stay in your flow.</h2>
          <p>A few shortcuts to make room for the work that matters.</p>
          <dl>
            {[
              ['Search issues & commands', 'Ctrl / ⌘ K'],
              ['Create an issue', 'C'],
              ['Search this board', '/'],
              ['Save an issue', 'Ctrl / ⌘ ↵'],
              ['Pick up / drop a focused card', 'Space'],
              ['Move a picked-up card', '↑ ↓ ← →'],
              ['Close / cancel a drag', 'Esc'],
              ['Show shortcuts', '?'],
            ].map(([label, key]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <kbd>{key}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </Dialog>
      )}
      {toast && (
        <div className="toast" role="status">
          <Icon name="circleCheck" size={17} />
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <Icon name="close" size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
