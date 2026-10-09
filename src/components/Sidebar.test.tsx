import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ASSIGNEES, createSeedBoard } from '../data'
import type { WorkspaceView } from '../types'
import { Sidebar } from './Sidebar'

type SidebarProps = ComponentProps<typeof Sidebar>

const board = createSeedBoard()
const seedTotal = Object.keys(board.cards).length
const seedDone = board.columns.find((column) => column.id === 'done')!.cardIds.length
const seedMine = Object.values(board.cards).filter(
  (card) => card.assigneeId === ASSIGNEES.ava.id,
).length

function renderSidebar(overrides: Partial<SidebarProps> = {}) {
  const props: SidebarProps = {
    view: 'project',
    onNavigate: vi.fn(),
    onSearch: vi.fn(),
    onCreate: vi.fn(),
    onReset: vi.fn(),
    onHelp: vi.fn(),
    dark: false,
    onTheme: vi.fn(),
    total: seedTotal,
    mine: seedMine,
    done: seedDone,
    starred: false,
    expanded: false,
    ...overrides,
  }
  const user = userEvent.setup()
  const utils = render(<Sidebar {...props} />)
  return { ...utils, props, user }
}

const workspaceNav = () => screen.getByRole('navigation', { name: 'Workspace navigation' })

const navButton = (name: string | RegExp) => within(workspaceNav()).getByRole('button', { name })

const workspaceItems: { view: WorkspaceView; label: string }[] = [
  { view: 'overview', label: 'Overview' },
  { view: 'all', label: 'All issues' },
  { view: 'mine', label: 'My issues' },
  { view: 'completed', label: 'Completed' },
]

describe('Sidebar', () => {
  describe('layout', () => {
    it('renders as a complementary landmark with the workspace brand', () => {
      renderSidebar()
      const aside = screen.getByRole('complementary')
      expect(aside).toHaveTextContent('Orbit')
      expect(aside).toHaveTextContent('Workspace')
    })

    it('shows the signed-in profile using the seeded assignee', () => {
      renderSidebar()
      const ava = ASSIGNEES.ava
      expect(screen.getByText(ava.name)).toBeInTheDocument()
      expect(screen.getByText('Personal workspace')).toBeInTheDocument()
      const avatar = screen.getByLabelText(ava.name)
      expect(avatar).toHaveTextContent(ava.initials)
    })

    it('renders every workspace navigation item and the project link', () => {
      renderSidebar()
      for (const { label } of workspaceItems) {
        expect(navButton(new RegExp(`^${label}`))).toBeInTheDocument()
      }
      expect(within(workspaceNav()).getAllByRole('button', { name: /Product launch/ })).toHaveLength(1)
      expect(within(workspaceNav()).getByText('Sprint 42')).toBeInTheDocument()
    })
  })

  describe('expanded state', () => {
    it('is collapsed by default', () => {
      renderSidebar({ expanded: false })
      expect(screen.getByRole('complementary')).not.toHaveClass('sidebar--expanded')
      expect(screen.getByRole('complementary')).toHaveClass('sidebar')
    })

    it('adds the expanded modifier when expanded', () => {
      renderSidebar({ expanded: true })
      expect(screen.getByRole('complementary')).toHaveClass('sidebar', 'sidebar--expanded')
    })
  })

  describe('counts', () => {
    it('shows seed board counts on All issues, My issues and Completed', () => {
      renderSidebar()
      expect(navButton(/^All issues/)).toHaveTextContent(`All issues${seedTotal}`)
      expect(navButton(/^My issues/)).toHaveTextContent(`My issues${seedMine}`)
      expect(navButton(/^Completed/)).toHaveTextContent(`Completed${seedDone}`)
    })

    it('does not render a count badge on Overview', () => {
      renderSidebar()
      expect(navButton(/^Overview/)).toHaveTextContent(/^Overview$/)
    })

    it('renders a zero count rather than hiding it', () => {
      renderSidebar({ total: 0, mine: 0, done: 0 })
      expect(navButton(/^All issues/)).toHaveTextContent('All issues0')
      expect(navButton(/^My issues/)).toHaveTextContent('My issues0')
      expect(navButton(/^Completed/)).toHaveTextContent('Completed0')
    })

    it('updates counts when props change', () => {
      const { rerender, props } = renderSidebar()
      rerender(<Sidebar {...props} total={42} mine={7} done={3} />)
      expect(navButton(/^All issues/)).toHaveTextContent('All issues42')
      expect(navButton(/^My issues/)).toHaveTextContent('My issues7')
      expect(navButton(/^Completed/)).toHaveTextContent('Completed3')
    })
  })

  describe('active state', () => {
    it.each(workspaceItems)('marks $label as the current page when view is $view', ({ view, label }) => {
      renderSidebar({ view })
      const active = navButton(new RegExp(`^${label}`))
      expect(active).toHaveAttribute('aria-current', 'page')
      expect(active).toHaveClass('nav-item--active')

      for (const other of workspaceItems.filter((item) => item.view !== view)) {
        const button = navButton(new RegExp(`^${other.label}`))
        expect(button).not.toHaveAttribute('aria-current')
        expect(button).not.toHaveClass('nav-item--active')
      }
      const project = navButton(/Product launch/)
      expect(project).not.toHaveAttribute('aria-current')
      expect(project).not.toHaveClass('nav-item--active')
    })

    it('marks the project link as the current page when view is project', () => {
      renderSidebar({ view: 'project' })
      const project = navButton(/Product launch/)
      expect(project).toHaveAttribute('aria-current', 'page')
      expect(project).toHaveClass('project-nav', 'nav-item--active')
      for (const { label } of workspaceItems) {
        expect(navButton(new RegExp(`^${label}`))).not.toHaveAttribute('aria-current')
      }
    })

    it('has exactly one current page', () => {
      renderSidebar({ view: 'mine' })
      const current = within(workspaceNav())
        .getAllByRole('button')
        .filter((button) => button.getAttribute('aria-current') === 'page')
      expect(current).toHaveLength(1)
    })
  })

  describe('navigation callbacks', () => {
    it.each(workspaceItems)('calls onNavigate("$view") when $label is clicked', async ({ view, label }) => {
      const { props, user } = renderSidebar()
      await user.click(navButton(new RegExp(`^${label}`)))
      expect(props.onNavigate).toHaveBeenCalledTimes(1)
      expect(props.onNavigate).toHaveBeenCalledWith(view)
    })

    it('calls onNavigate("project") when the project link is clicked', async () => {
      const { props, user } = renderSidebar({ view: 'overview' })
      await user.click(navButton(/Product launch/))
      expect(props.onNavigate).toHaveBeenCalledTimes(1)
      expect(props.onNavigate).toHaveBeenCalledWith('project')
    })

    it('still calls onNavigate when the already-active item is clicked', async () => {
      const { props, user } = renderSidebar({ view: 'all' })
      await user.click(navButton(/^All issues/))
      expect(props.onNavigate).toHaveBeenCalledWith('all')
    })

    it('does not fire other callbacks when navigating', async () => {
      const { props, user } = renderSidebar()
      await user.click(navButton(/^Completed/))
      expect(props.onSearch).not.toHaveBeenCalled()
      expect(props.onCreate).not.toHaveBeenCalled()
      expect(props.onReset).not.toHaveBeenCalled()
      expect(props.onHelp).not.toHaveBeenCalled()
      expect(props.onTheme).not.toHaveBeenCalled()
    })
  })

  describe('favorites', () => {
    it('hides the Favorites group when the project is not starred', () => {
      renderSidebar({ starred: false })
      expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
      expect(within(workspaceNav()).getAllByRole('button', { name: /Product launch/ })).toHaveLength(1)
    })

    it('shows the Favorites group with a project shortcut when starred', () => {
      renderSidebar({ starred: true })
      expect(screen.getByText('Favorites')).toBeInTheDocument()
      expect(within(workspaceNav()).getAllByRole('button', { name: /Product launch/ })).toHaveLength(2)
    })

    it('navigates to the project from the favorite shortcut', async () => {
      const { props, user } = renderSidebar({ starred: true, view: 'all' })
      const favoritesGroup = screen.getByText('Favorites').parentElement!
      const favorite = within(favoritesGroup).getByRole('button', { name: 'Product launch' })
      expect(favorite).not.toHaveAttribute('aria-current')
      expect(favorite).not.toHaveClass('nav-item--active')
      await user.click(favorite)
      expect(props.onNavigate).toHaveBeenCalledTimes(1)
      expect(props.onNavigate).toHaveBeenCalledWith('project')
    })
  })

  describe('quick actions', () => {
    it('calls onSearch when the search button is clicked', async () => {
      const { props, user } = renderSidebar()
      const search = screen.getByRole('button', { name: /Search anything/ })
      expect(search).toHaveTextContent('⌘ K')
      await user.click(search)
      expect(props.onSearch).toHaveBeenCalledTimes(1)
      expect(props.onCreate).not.toHaveBeenCalled()
    })

    it('calls onCreate when the create button is clicked', async () => {
      const { props, user } = renderSidebar()
      const create = screen.getByRole('button', { name: 'Create issue' })
      expect(create).toHaveAttribute('title', 'Create issue (C)')
      await user.click(create)
      expect(props.onCreate).toHaveBeenCalledTimes(1)
      expect(props.onSearch).not.toHaveBeenCalled()
    })

    it('calls onHelp from the shortcuts note', async () => {
      const { props, user } = renderSidebar()
      expect(screen.getByText('A little less clicking.')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Explore shortcuts' }))
      expect(props.onHelp).toHaveBeenCalledTimes(1)
    })

    it('calls onReset when Reset board is clicked', async () => {
      const { props, user } = renderSidebar()
      await user.click(screen.getByRole('button', { name: 'Reset board' }))
      expect(props.onReset).toHaveBeenCalledTimes(1)
      expect(props.onNavigate).not.toHaveBeenCalled()
    })

    it('is operable from the keyboard', async () => {
      const { props, user } = renderSidebar()
      screen.getByRole('button', { name: 'Reset board' }).focus()
      await user.keyboard('{Enter}')
      expect(props.onReset).toHaveBeenCalledTimes(1)
      navButton(/^My issues/).focus()
      await user.keyboard(' ')
      expect(props.onNavigate).toHaveBeenCalledWith('mine')
    })
  })

  describe('theme toggle', () => {
    it('offers dark theme when currently light', async () => {
      const { props, user } = renderSidebar({ dark: false })
      const toggle = screen.getByRole('button', { name: 'Switch to dark theme' })
      expect(toggle).toHaveAttribute('title', 'Dark theme')
      expect(screen.queryByRole('button', { name: 'Switch to light theme' })).not.toBeInTheDocument()
      await user.click(toggle)
      expect(props.onTheme).toHaveBeenCalledTimes(1)
    })

    it('offers light theme when currently dark', async () => {
      const { props, user } = renderSidebar({ dark: true })
      const toggle = screen.getByRole('button', { name: 'Switch to light theme' })
      expect(toggle).toHaveAttribute('title', 'Light theme')
      expect(screen.queryByRole('button', { name: 'Switch to dark theme' })).not.toBeInTheDocument()
      await user.click(toggle)
      expect(props.onTheme).toHaveBeenCalledTimes(1)
    })

    it('renders a different icon for each theme', () => {
      const { rerender, props } = renderSidebar({ dark: false })
      const lightIcon = screen.getByRole('button', { name: 'Switch to dark theme' }).innerHTML
      rerender(<Sidebar {...props} dark />)
      const darkIcon = screen.getByRole('button', { name: 'Switch to light theme' }).innerHTML
      expect(darkIcon).not.toBe(lightIcon)
    })
  })
})
