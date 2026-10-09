import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSeedBoard } from '../data'
import type { Card } from '../types'
import { CommandMenu } from './CommandMenu'

const seedCards: Card[] = Object.values(createSeedBoard().cards)

// jsdom 26 implements neither HTMLDialogElement#showModal/close nor
// Element#scrollIntoView, both of which CommandMenu (via Dialog) relies on.
const originalShowModal = HTMLDialogElement.prototype.showModal
const originalClose = HTMLDialogElement.prototype.close
const originalScrollIntoView = Element.prototype.scrollIntoView
const scrollIntoView = vi.fn()

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
  Element.prototype.scrollIntoView = scrollIntoView
})

afterAll(() => {
  HTMLDialogElement.prototype.showModal = originalShowModal
  HTMLDialogElement.prototype.close = originalClose
  Element.prototype.scrollIntoView = originalScrollIntoView
})

beforeEach(() => {
  scrollIntoView.mockClear()
})

function renderMenu(cards: Card[] = seedCards) {
  const props = {
    cards,
    onOpen: vi.fn<(id: string) => void>(),
    onCreate: vi.fn<() => void>(),
    onTheme: vi.fn<() => void>(),
    onClose: vi.fn<() => void>(),
  }
  const user = userEvent.setup()
  const view = render(<CommandMenu {...props} />)
  const input = screen.getByRole('combobox', {
    name: 'Search issues and commands',
  })
  return { ...props, ...view, user, input }
}

function optionNames() {
  return screen
    .queryAllByRole('option')
    .map((option) => within(option).getAllByText(/./)[0].textContent)
}

function selectedOption() {
  return screen.getByRole('option', { selected: true })
}

describe('CommandMenu', () => {
  describe('opening', () => {
    it('renders as an open modal dialog labelled by its hidden heading', () => {
      renderMenu()
      const dialog = screen.getByRole('dialog', {
        name: 'Search issues and commands',
      })
      expect(dialog).toHaveAttribute('open')
      expect(dialog).toHaveClass('dialog', 'command-dialog')
      expect(
        screen.getByRole('heading', { name: 'Search issues and commands' }),
      ).toHaveClass('visually-hidden')
    })

    it('focuses the search input when opened', () => {
      const { input } = renderMenu()
      expect(input).toHaveFocus()
      expect(input).toHaveValue('')
      expect(input).toHaveAttribute(
        'placeholder',
        'Search issues or type a command…',
      )
    })

    it('wires the combobox to the results listbox', () => {
      const { input } = renderMenu()
      const listbox = screen.getByRole('listbox')
      expect(input).toHaveAttribute('aria-controls', listbox.id)
      expect(input).toHaveAttribute('aria-expanded', 'true')
    })

    it('lists both quick actions followed by every issue when the query is empty', () => {
      renderMenu()
      expect(screen.getByText('Quick actions & issues')).toBeInTheDocument()
      expect(optionNames()).toEqual([
        'Create a new issue',
        'Toggle appearance',
        ...seedCards.map((card) => card.title),
      ])
    })

    it('labels actions as "Action" and issues by their ID', () => {
      renderMenu()
      const create = screen.getByRole('option', { name: /Create a new issue/ })
      const theme = screen.getByRole('option', { name: /Toggle appearance/ })
      const issue = screen.getByRole('option', { name: /Fix login redirect bug/ })
      expect(within(create).getByText('Action')).toBeInTheDocument()
      expect(within(theme).getByText('Action')).toBeInTheDocument()
      expect(within(issue).getByText('KB-4')).toBeInTheDocument()
      expect(within(issue).queryByText('Action')).not.toBeInTheDocument()
    })

    it('gives each option a distinct icon for create, theme and issues', () => {
      renderMenu()
      const iconPath = (name: RegExp) =>
        screen
          .getByRole('option', { name })
          .querySelector('svg path')
          ?.getAttribute('d')
      const create = iconPath(/Create a new issue/)
      const theme = iconPath(/Toggle appearance/)
      const issueA = iconPath(/Set up CI pipeline/)
      const issueB = iconPath(/Implement dark mode/)
      expect(create).toBeTruthy()
      expect(theme).toBeTruthy()
      expect(issueA).toBeTruthy()
      expect(new Set([create, theme, issueA]).size).toBe(3)
      expect(issueB).toBe(issueA)
    })

    it('only shows quick actions when there are no issues', () => {
      renderMenu([])
      expect(optionNames()).toEqual(['Create a new issue', 'Toggle appearance'])
      expect(screen.queryByText('No results found')).not.toBeInTheDocument()
    })

    it('renders the keyboard hint footer', () => {
      renderMenu()
      expect(screen.getByText(/to navigate/)).toBeInTheDocument()
      expect(screen.getByText(/to open/)).toBeInTheDocument()
      expect(screen.getByText(/to close/)).toBeInTheDocument()
    })
  })

  describe('closing', () => {
    it('calls onClose when the esc button is clicked', async () => {
      const { user, onClose, onOpen, onCreate, onTheme } = renderMenu()
      await user.click(screen.getByRole('button', { name: 'esc' }))
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onOpen).not.toHaveBeenCalled()
      expect(onCreate).not.toHaveBeenCalled()
      expect(onTheme).not.toHaveBeenCalled()
    })

    it('calls onClose when the dialog is cancelled (browser Escape)', () => {
      const { onClose } = renderMenu()
      const cancel = new Event('cancel', { cancelable: true })
      fireEvent(screen.getByRole('dialog'), cancel)
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(cancel.defaultPrevented).toBe(true)
    })

    it('does not run any command when Escape is pressed in the input', async () => {
      const { user, onOpen, onCreate, onTheme } = renderMenu()
      await user.keyboard('{Escape}')
      expect(onOpen).not.toHaveBeenCalled()
      expect(onCreate).not.toHaveBeenCalled()
      expect(onTheme).not.toHaveBeenCalled()
    })

    it('closes the dialog element when unmounted', () => {
      const { unmount } = renderMenu()
      const dialog = screen.getByRole('dialog')
      unmount()
      expect(dialog).not.toHaveAttribute('open')
    })
  })

  describe('search filtering', () => {
    it('filters issues by title, case-insensitively', async () => {
      const { user, input } = renderMenu()
      await user.type(input, 'VITE')
      expect(optionNames()).toEqual(['Migrate build to Vite'])
      expect(screen.getByText('1 result')).toBeInTheDocument()
    })

    it('filters issues by ID', async () => {
      const { user, input } = renderMenu()
      await user.type(input, 'kb-4')
      expect(optionNames()).toEqual(['Fix login redirect bug'])
    })

    it('filters issues by description', async () => {
      const { user, input } = renderMenu()
      await user.type(input, 'coupon')
      expect(optionNames()).toEqual(['Add unit tests for cart'])
    })

    it('filters quick actions by title', async () => {
      const { user, input } = renderMenu()
      await user.type(input, 'create')
      expect(optionNames()).toEqual(['Create a new issue'])
    })

    it('shows matching actions before matching issues with a pluralised count', async () => {
      const { user, input } = renderMenu()
      await user.type(input, 'toggle')
      // "Toggle appearance" action + KB-5 ("…add a manual toggle in settings.")
      expect(optionNames()).toEqual(['Toggle appearance', 'Implement dark mode'])
      expect(screen.getByText('2 results')).toBeInTheDocument()
      expect(screen.queryByText('Quick actions & issues')).not.toBeInTheDocument()
    })

    it('restores the full list when the query is cleared', async () => {
      const { user, input } = renderMenu()
      await user.type(input, 'vite')
      await user.clear(input)
      expect(screen.getByText('Quick actions & issues')).toBeInTheDocument()
      expect(screen.getAllByRole('option')).toHaveLength(seedCards.length + 2)
    })

    it('resets the selection to the first result when the query changes', async () => {
      const { user, input } = renderMenu()
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
      expect(selectedOption()).toHaveAccessibleName(/Design onboarding flow/)
      await user.type(input, 'e')
      expect(screen.getAllByRole('option')[0]).toHaveAttribute(
        'aria-selected',
        'true',
      )
    })
  })

  describe('empty results', () => {
    it('shows an empty state and "0 results" when nothing matches', async () => {
      const { user, input } = renderMenu()
      await user.type(input, 'zzzz')
      expect(screen.queryAllByRole('option')).toHaveLength(0)
      expect(screen.getByText('0 results')).toBeInTheDocument()
      expect(screen.getByText('No results found')).toBeInTheDocument()
      expect(
        screen.getByText('Try another title, issue ID, or command.'),
      ).toBeInTheDocument()
    })

    it('clears aria-activedescendant when there is nothing to select', async () => {
      const { user, input } = renderMenu()
      await user.type(input, 'zzzz')
      expect(input).not.toHaveAttribute('aria-activedescendant')
    })

    it('does nothing when Enter or arrows are pressed with no results', async () => {
      const { user, input, onClose, onOpen, onCreate, onTheme } = renderMenu()
      await user.type(input, 'zzzz')
      await user.keyboard('{ArrowDown}{ArrowUp}{Enter}')
      expect(onClose).not.toHaveBeenCalled()
      expect(onOpen).not.toHaveBeenCalled()
      expect(onCreate).not.toHaveBeenCalled()
      expect(onTheme).not.toHaveBeenCalled()
      expect(input).not.toHaveAttribute('aria-activedescendant')
    })
  })

  describe('keyboard navigation', () => {
    it('selects the first item initially', () => {
      const { input } = renderMenu()
      const first = selectedOption()
      expect(first).toHaveAccessibleName(/Create a new issue/)
      expect(first).toHaveClass('command-result--selected')
      expect(within(first).getByText('↵')).toBeInTheDocument()
      expect(input).toHaveAttribute('aria-activedescendant', 'command-create')
      expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1)
    })

    it('moves the selection down and up with the arrow keys', async () => {
      const { user, input } = renderMenu()
      await user.keyboard('{ArrowDown}')
      expect(selectedOption()).toHaveAccessibleName(/Toggle appearance/)
      expect(input).toHaveAttribute('aria-activedescendant', 'command-theme')

      await user.keyboard('{ArrowDown}')
      expect(selectedOption()).toHaveAccessibleName(/Set up CI pipeline/)
      expect(input).toHaveAttribute('aria-activedescendant', 'command-KB-1')

      await user.keyboard('{ArrowUp}')
      expect(selectedOption()).toHaveAccessibleName(/Toggle appearance/)
    })

    it('moves the ↵ hint and selected styling with the selection', async () => {
      const { user } = renderMenu()
      const [first, second] = screen.getAllByRole('option')
      await user.keyboard('{ArrowDown}')
      expect(first).toHaveAttribute('aria-selected', 'false')
      expect(first).not.toHaveClass('command-result--selected')
      expect(within(first).queryByText('↵')).not.toBeInTheDocument()
      expect(second).toHaveClass('command-result--selected')
      expect(within(second).getByText('↵')).toBeInTheDocument()
    })

    it('does not move above the first item', async () => {
      const { user, input } = renderMenu()
      await user.keyboard('{ArrowUp}{ArrowUp}')
      expect(selectedOption()).toHaveAccessibleName(/Create a new issue/)
      expect(input).toHaveAttribute('aria-activedescendant', 'command-create')
    })

    it('does not move past the last item', async () => {
      const { user, input } = renderMenu()
      await user.type(input, 'toggle')
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
      expect(selectedOption()).toHaveAccessibleName(/Implement dark mode/)
      expect(input).toHaveAttribute('aria-activedescendant', 'command-KB-5')
    })

    it('scrolls the newly selected option into view', async () => {
      const { user } = renderMenu()
      const options = screen.getAllByRole('option')
      await user.keyboard('{ArrowDown}')
      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' })
      expect(scrollIntoView.mock.contexts[0]).toBe(options[1])
    })

    it('prevents the default action of navigation keys', () => {
      const { input } = renderMenu()
      expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(false)
      expect(fireEvent.keyDown(input, { key: 'ArrowUp' })).toBe(false)
      expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false)
      expect(fireEvent.keyDown(input, { key: 'a' })).toBe(true)
    })

    it('ignores unrelated keys', async () => {
      const { user, onClose } = renderMenu()
      await user.keyboard('{ArrowRight}{Tab}')
      expect(selectedOption()).toHaveAccessibleName(/Create a new issue/)
      expect(scrollIntoView).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('selecting with Enter', () => {
    it('runs the create action and closes the menu first', async () => {
      const { user, onClose, onCreate, onTheme, onOpen } = renderMenu()
      await user.keyboard('{Enter}')
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onCreate).toHaveBeenCalledTimes(1)
      expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
        onCreate.mock.invocationCallOrder[0],
      )
      expect(onTheme).not.toHaveBeenCalled()
      expect(onOpen).not.toHaveBeenCalled()
    })

    it('runs the theme action', async () => {
      const { user, onClose, onCreate, onTheme, onOpen } = renderMenu()
      await user.keyboard('{ArrowDown}{Enter}')
      expect(onTheme).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onCreate).not.toHaveBeenCalled()
      expect(onOpen).not.toHaveBeenCalled()
    })

    it('opens the selected issue by ID', async () => {
      const { user, onClose, onCreate, onTheme, onOpen } = renderMenu()
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}')
      expect(onOpen).toHaveBeenCalledTimes(1)
      expect(onOpen).toHaveBeenCalledWith('KB-2')
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
        onOpen.mock.invocationCallOrder[0],
      )
      expect(onCreate).not.toHaveBeenCalled()
      expect(onTheme).not.toHaveBeenCalled()
    })

    it('opens the top search result', async () => {
      const { user, input, onOpen } = renderMenu()
      await user.type(input, 'login{Enter}')
      expect(onOpen).toHaveBeenCalledWith('KB-4')
    })
  })

  describe('selecting with the mouse', () => {
    it('highlights the option under the pointer', async () => {
      const { user, input } = renderMenu()
      await user.hover(screen.getByRole('option', { name: /Write API documentation/ }))
      expect(selectedOption()).toHaveAccessibleName(/Write API documentation/)
      expect(input).toHaveAttribute('aria-activedescendant', 'command-KB-3')
    })

    it('opens an issue when it is clicked', async () => {
      const { user, onClose, onOpen } = renderMenu()
      await user.click(screen.getByRole('option', { name: /Landing page copy/ }))
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onOpen).toHaveBeenCalledTimes(1)
      expect(onOpen).toHaveBeenCalledWith('KB-8')
    })

    it('runs a quick action when it is clicked', async () => {
      const { user, onClose, onCreate, onTheme } = renderMenu()
      await user.click(screen.getByRole('option', { name: /Toggle appearance/ }))
      expect(onTheme).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onCreate).not.toHaveBeenCalled()
    })

    it('continues keyboard navigation from the hovered option', async () => {
      const { user, onOpen } = renderMenu()
      await user.hover(screen.getByRole('option', { name: /Write API documentation/ }))
      await user.keyboard('{ArrowDown}{Enter}')
      expect(onOpen).toHaveBeenCalledWith('KB-4')
    })

    it('opens the clicked option from a filtered list', async () => {
      const { user, input, onOpen, onTheme } = renderMenu()
      await user.type(input, 'toggle')
      await user.click(screen.getByRole('option', { name: /Implement dark mode/ }))
      expect(onOpen).toHaveBeenCalledWith('KB-5')
      expect(onTheme).not.toHaveBeenCalled()
    })
  })
})
