import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card } from '../types'
import { CommandMenu } from './CommandMenu'

const cards: Card[] = [
  {
    id: 'KB-1',
    title: 'Fix login redirect',
    description: 'Users bounce back to the sign-in page',
    labels: ['bug'],
    assigneeId: null,
  },
  {
    id: 'KB-2',
    title: 'Dark mode polish',
    description: 'Tune contrast for the sidebar',
    labels: ['design'],
    assigneeId: null,
  },
  {
    id: 'KB-12',
    title: 'Write API docs',
    description: 'Document the webhook endpoints',
    labels: ['docs'],
    assigneeId: null,
  },
]

const scrollIntoView = vi.fn()

beforeAll(() => {
  // jsdom implements neither <dialog>.showModal() nor scrollIntoView().
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
  Element.prototype.scrollIntoView = scrollIntoView
})

beforeEach(() => {
  scrollIntoView.mockClear()
})

function setup(props: { cards?: Card[] } = {}) {
  const handlers = {
    onOpen: vi.fn(),
    onCreate: vi.fn(),
    onTheme: vi.fn(),
    onClose: vi.fn(),
  }
  const user = userEvent.setup()
  render(<CommandMenu cards={props.cards ?? cards} {...handlers} />)
  const input = screen.getByRole('combobox', {
    name: 'Search issues and commands',
  })
  return { user, input, ...handlers }
}

const optionTitles = () =>
  screen
    .getAllByRole('option')
    .map((option) => option.querySelector('span')?.textContent)

const selectedOption = () => screen.getByRole('option', { selected: true })

describe('CommandMenu', () => {
  describe('initial render', () => {
    it('renders a labelled dialog with the search box focused', () => {
      const { input } = setup()
      expect(
        screen.getByRole('dialog', { name: 'Search issues and commands' }),
      ).toBeInTheDocument()
      expect(input).toHaveFocus()
      expect(input).toHaveValue('')
      expect(input).toHaveAttribute('aria-expanded', 'true')
      expect(input).toHaveAttribute('aria-controls', 'command-results')
      expect(screen.getByRole('listbox')).toHaveAttribute(
        'id',
        'command-results',
      )
    })

    it('lists quick actions before every issue', () => {
      setup()
      expect(screen.getByText('Quick actions & issues')).toBeInTheDocument()
      expect(optionTitles()).toEqual([
        'Create a new issue',
        'Toggle appearance',
        'Fix login redirect',
        'Dark mode polish',
        'Write API docs',
      ])
    })

    it('tags actions as "Action" and issues with their id', () => {
      setup()
      const [create, theme, first] = screen.getAllByRole('option')
      expect(within(create).getByText('Action')).toBeInTheDocument()
      expect(within(theme).getByText('Action')).toBeInTheDocument()
      expect(within(first).getByText('KB-1')).toBeInTheDocument()
      expect(create).toHaveAttribute('id', 'command-create')
      expect(theme).toHaveAttribute('id', 'command-theme')
      expect(first).toHaveAttribute('id', 'command-KB-1')
    })

    it('selects the first item and points aria-activedescendant at it', () => {
      const { input } = setup()
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
      expect(options[0]).toHaveClass('command-result--selected')
      expect(within(options[0]).getByText('↵')).toBeInTheDocument()
      for (const option of options.slice(1)) {
        expect(option).toHaveAttribute('aria-selected', 'false')
        expect(option).not.toHaveClass('command-result--selected')
        expect(within(option).queryByText('↵')).not.toBeInTheDocument()
      }
      expect(input).toHaveAttribute('aria-activedescendant', 'command-create')
    })

    it('keeps the options out of the tab order', () => {
      setup()
      for (const option of screen.getAllByRole('option')) {
        expect(option).toHaveAttribute('tabindex', '-1')
      }
    })

    it('shows only the actions when there are no cards', () => {
      setup({ cards: [] })
      expect(optionTitles()).toEqual([
        'Create a new issue',
        'Toggle appearance',
      ])
      expect(screen.queryByText('No results found')).not.toBeInTheDocument()
    })
  })

  describe('filtering', () => {
    it('matches issue titles case-insensitively', async () => {
      const { user, input } = setup()
      await user.type(input, 'LOGIN')
      expect(optionTitles()).toEqual(['Fix login redirect'])
      expect(screen.getByText('1 result')).toBeInTheDocument()
    })

    it('matches issue ids', async () => {
      const { user, input } = setup()
      await user.type(input, 'kb-1')
      expect(optionTitles()).toEqual(['Fix login redirect', 'Write API docs'])
      expect(screen.getByText('2 results')).toBeInTheDocument()
    })

    it('matches issue descriptions', async () => {
      const { user, input } = setup()
      await user.type(input, 'webhook')
      expect(optionTitles()).toEqual(['Write API docs'])
    })

    it('filters quick actions by their title', async () => {
      const { user, input } = setup()
      await user.type(input, 'appearance')
      expect(optionTitles()).toEqual(['Toggle appearance'])
      await user.clear(input)
      await user.type(input, 'new issue')
      expect(optionTitles()).toEqual(['Create a new issue'])
    })

    it('lists matching actions before matching issues', async () => {
      const { user, input } = setup()
      await user.type(input, 'issue')
      expect(optionTitles()).toEqual(['Create a new issue'])
      await user.clear(input)
      await user.type(input, 'mode')
      expect(optionTitles()).toEqual(['Dark mode polish'])
      await user.clear(input)
      await user.type(input, 'e')
      expect(optionTitles()).toEqual([
        'Create a new issue',
        'Toggle appearance',
        'Fix login redirect',
        'Dark mode polish',
        'Write API docs',
      ])
      expect(screen.getByText('5 results')).toBeInTheDocument()
    })

    it('shows the empty state when nothing matches', async () => {
      const { user, input } = setup()
      await user.type(input, 'zzz')
      expect(screen.queryAllByRole('option')).toHaveLength(0)
      expect(screen.getByText('No results found')).toBeInTheDocument()
      expect(
        screen.getByText('Try another title, issue ID, or command.'),
      ).toBeInTheDocument()
      expect(screen.getByText('0 results')).toBeInTheDocument()
      expect(input).not.toHaveAttribute('aria-activedescendant')
    })

    it('restores the default label and list when the query is cleared', async () => {
      const { user, input } = setup()
      await user.type(input, 'zzz')
      await user.clear(input)
      expect(screen.getByText('Quick actions & issues')).toBeInTheDocument()
      expect(screen.getAllByRole('option')).toHaveLength(5)
    })

    it('resets the selection to the first result when the query changes', async () => {
      const { user, input } = setup()
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
      expect(input).toHaveAttribute('aria-activedescendant', 'command-KB-2')
      await user.type(input, 'docs')
      expect(input).toHaveAttribute('aria-activedescendant', 'command-KB-12')
      expect(selectedOption()).toHaveTextContent('Write API docs')
    })
  })

  describe('keyboard navigation', () => {
    it('moves the selection with ArrowDown and ArrowUp', async () => {
      const { user, input } = setup()
      await user.keyboard('{ArrowDown}')
      expect(input).toHaveAttribute('aria-activedescendant', 'command-theme')
      expect(selectedOption()).toHaveTextContent('Toggle appearance')
      await user.keyboard('{ArrowDown}')
      expect(input).toHaveAttribute('aria-activedescendant', 'command-KB-1')
      await user.keyboard('{ArrowUp}')
      expect(input).toHaveAttribute('aria-activedescendant', 'command-theme')
    })

    it('clamps the selection at the top of the list', async () => {
      const { user, input } = setup()
      await user.keyboard('{ArrowUp}{ArrowUp}')
      expect(input).toHaveAttribute('aria-activedescendant', 'command-create')
    })

    it('clamps the selection at the bottom of the list', async () => {
      const { user, input } = setup()
      await user.keyboard('{ArrowDown>10/}')
      expect(input).toHaveAttribute('aria-activedescendant', 'command-KB-12')
      expect(selectedOption()).toHaveTextContent('Write API docs')
    })

    it('scrolls the newly selected option into view', async () => {
      const { user } = setup()
      await user.keyboard('{ArrowDown}{ArrowDown}')
      expect(scrollIntoView).toHaveBeenCalledTimes(2)
      expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' })
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(
        screen.getAllByRole('option')[2],
      )
    })

    it('does not move the caret when arrows are pressed', () => {
      const { input } = setup()
      expect(fireEvent.keyDown(input, { key: 'ArrowDown' })).toBe(false)
      expect(fireEvent.keyDown(input, { key: 'ArrowUp' })).toBe(false)
      expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false)
    })

    it('ignores unrelated keys', () => {
      const { input, onClose } = setup()
      expect(fireEvent.keyDown(input, { key: 'ArrowLeft' })).toBe(true)
      expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true)
      expect(input).toHaveAttribute('aria-activedescendant', 'command-create')
      expect(scrollIntoView).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('handles arrows safely when there are no results', async () => {
      const { user, input } = setup()
      await user.type(input, 'zzz')
      await user.keyboard('{ArrowDown}{ArrowUp}')
      expect(input).not.toHaveAttribute('aria-activedescendant')
      expect(screen.getByText('No results found')).toBeInTheDocument()
    })
  })

  describe('executing items', () => {
    it('Enter on the default selection closes the menu then creates an issue', async () => {
      const { user, onClose, onCreate, onTheme, onOpen } = setup()
      await user.keyboard('{Enter}')
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onCreate).toHaveBeenCalledTimes(1)
      expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
        onCreate.mock.invocationCallOrder[0],
      )
      expect(onTheme).not.toHaveBeenCalled()
      expect(onOpen).not.toHaveBeenCalled()
    })

    it('Enter on "Toggle appearance" toggles the theme', async () => {
      const { user, onClose, onCreate, onTheme } = setup()
      await user.keyboard('{ArrowDown}{Enter}')
      expect(onTheme).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onCreate).not.toHaveBeenCalled()
    })

    it('Enter on an issue opens it by id', async () => {
      const { user, onClose, onOpen } = setup()
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}')
      expect(onOpen).toHaveBeenCalledTimes(1)
      expect(onOpen).toHaveBeenCalledWith('KB-2')
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(
        onOpen.mock.invocationCallOrder[0],
      )
    })

    it('Enter opens the first filtered match', async () => {
      const { user, input, onOpen } = setup()
      await user.type(input, 'webhook{Enter}')
      expect(onOpen).toHaveBeenCalledWith('KB-12')
    })

    it('Enter does nothing when there are no results', async () => {
      const { user, input, onClose, onCreate, onTheme, onOpen } = setup()
      await user.type(input, 'zzz{Enter}')
      expect(onClose).not.toHaveBeenCalled()
      expect(onCreate).not.toHaveBeenCalled()
      expect(onTheme).not.toHaveBeenCalled()
      expect(onOpen).not.toHaveBeenCalled()
    })

    it('clicking an option runs it', async () => {
      const { user, onClose, onOpen, onTheme } = setup()
      await user.click(screen.getByRole('option', { name: /Write API docs/ }))
      expect(onOpen).toHaveBeenCalledWith('KB-12')
      expect(onClose).toHaveBeenCalledTimes(1)
      await user.click(
        screen.getByRole('option', { name: /Toggle appearance/ }),
      )
      expect(onTheme).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('hovering an option selects it', async () => {
      const { user, input, onOpen } = setup()
      const option = screen.getByRole('option', { name: /Fix login redirect/ })
      await user.hover(option)
      expect(option).toHaveAttribute('aria-selected', 'true')
      expect(within(option).getByText('↵')).toBeInTheDocument()
      expect(input).toHaveAttribute('aria-activedescendant', 'command-KB-1')
      await user.keyboard('{Enter}')
      expect(onOpen).toHaveBeenCalledWith('KB-1')
    })
  })

  describe('closing', () => {
    it('the esc button closes without running anything', async () => {
      const { user, onClose, onCreate, onTheme, onOpen } = setup()
      await user.click(screen.getByRole('button', { name: 'esc' }))
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onCreate).not.toHaveBeenCalled()
      expect(onTheme).not.toHaveBeenCalled()
      expect(onOpen).not.toHaveBeenCalled()
    })

    it('the dialog cancel event (Escape) closes the menu', () => {
      const { onClose } = setup()
      const dialog = screen.getByRole('dialog')
      const cancel = new Event('cancel', { cancelable: true })
      fireEvent(dialog, cancel)
      expect(cancel.defaultPrevented).toBe(true)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it('renders the keyboard hints footer', () => {
    setup()
    expect(screen.getByText('to navigate')).toBeInTheDocument()
    expect(screen.getByText('to open')).toBeInTheDocument()
    expect(screen.getByText('to close')).toBeInTheDocument()
  })
})
