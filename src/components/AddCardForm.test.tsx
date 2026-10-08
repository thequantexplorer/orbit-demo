import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddCardForm } from './AddCardForm'

function setup(columnTitle = 'Backlog') {
  const onAdd = vi.fn<(title: string) => void>()
  const user = userEvent.setup()
  const utils = render(<AddCardForm columnTitle={columnTitle} onAdd={onAdd} />)
  const input = screen.getByRole('textbox', { name: `Add a card to ${columnTitle}` })
  const button = screen.getByRole('button', { name: 'Add card' })
  return { ...utils, onAdd, user, input, button }
}

describe('AddCardForm', () => {
  describe('rendering', () => {
    it('renders an empty, labelled input and a disabled submit button', () => {
      const { input, button } = setup()

      expect(input).toHaveValue('')
      expect(input).toHaveAttribute('type', 'text')
      expect(input).toHaveAttribute('placeholder', 'Add a card…')
      expect(input).toHaveAttribute('maxLength', '200')
      expect(button).toHaveAttribute('type', 'submit')
      expect(button).toBeDisabled()
    })

    it('derives the input id from the column title', () => {
      const { input } = setup('Backlog')
      expect(input).toHaveAttribute('id', 'add-backlog')
    })

    it('replaces every space and lowercases multi-word column titles in the id', () => {
      const { input } = setup('In Code Review')
      expect(input).toHaveAttribute('id', 'add-in-code-review')
    })

    it('uses the column title in the accessible name', () => {
      setup('In Progress')
      expect(
        screen.getByRole('textbox', { name: 'Add a card to In Progress' }),
      ).toBeInTheDocument()
    })

    it('renders the plus icon and hides the return glyph from assistive tech', () => {
      const { container, button } = setup()

      expect(container.querySelector('form.add-card svg')).not.toBeNull()
      expect(button.querySelector('[aria-hidden="true"]')).toHaveTextContent('↵')
    })
  })

  describe('typing', () => {
    it('reflects typed text in the input', async () => {
      const { user, input } = setup()

      await user.type(input, 'Write docs')

      expect(input).toHaveValue('Write docs')
    })

    it('enables the button once the title has non-whitespace content', async () => {
      const { user, input, button } = setup()

      await user.type(input, 'a')

      expect(button).toBeEnabled()
    })

    it('keeps the button disabled for whitespace-only input', async () => {
      const { user, input, button } = setup()

      await user.type(input, '    ')

      expect(input).toHaveValue('    ')
      expect(button).toBeDisabled()
    })

    it('disables the button again when the text is cleared', async () => {
      const { user, input, button } = setup()

      await user.type(input, 'Task')
      expect(button).toBeEnabled()
      await user.clear(input)

      expect(button).toBeDisabled()
    })

    it('limits input to 200 characters', async () => {
      const { user, input } = setup()

      await user.click(input)
      await user.paste('x'.repeat(250))

      expect(input).toHaveValue('x'.repeat(200))
    })
  })

  describe('submitting', () => {
    it('calls onAdd with the title and clears the input when Enter is pressed', async () => {
      const { user, input, button, onAdd } = setup()

      await user.type(input, 'Ship release{Enter}')

      expect(onAdd).toHaveBeenCalledTimes(1)
      expect(onAdd).toHaveBeenCalledWith('Ship release')
      expect(input).toHaveValue('')
      expect(button).toBeDisabled()
    })

    it('calls onAdd when the submit button is clicked', async () => {
      const { user, input, button, onAdd } = setup()

      await user.type(input, 'Fix bug')
      await user.click(button)

      expect(onAdd).toHaveBeenCalledTimes(1)
      expect(onAdd).toHaveBeenCalledWith('Fix bug')
      expect(input).toHaveValue('')
    })

    it('trims surrounding whitespace before calling onAdd', async () => {
      const { user, input, onAdd } = setup()

      await user.type(input, '   Padded title  {Enter}')

      expect(onAdd).toHaveBeenCalledWith('Padded title')
    })

    it('preserves inner whitespace in the title', async () => {
      const { user, input, onAdd } = setup()

      await user.type(input, 'two  spaces{Enter}')

      expect(onAdd).toHaveBeenCalledWith('two  spaces')
    })

    it('does not call onAdd when Enter is pressed on an empty input', async () => {
      const { user, input, onAdd } = setup()

      await user.type(input, '{Enter}')

      expect(onAdd).not.toHaveBeenCalled()
    })

    it('does not call onAdd when the button is clicked while disabled', async () => {
      const { user, button, onAdd } = setup()

      await user.click(button)

      expect(onAdd).not.toHaveBeenCalled()
    })

    it('ignores a whitespace-only submission and keeps the typed text', async () => {
      const { user, input, onAdd } = setup()

      await user.type(input, '   ')
      fireEvent.submit(input.closest('form')!)

      expect(onAdd).not.toHaveBeenCalled()
      expect(input).toHaveValue('   ')
    })

    it('prevents the native form submission', async () => {
      const { user, input } = setup()

      await user.type(input, 'Task')
      const event = new Event('submit', { bubbles: true, cancelable: true })
      input.closest('form')!.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
    })

    it('prevents the native submission even when the title is empty', () => {
      const { input } = setup()

      const event = new Event('submit', { bubbles: true, cancelable: true })
      input.closest('form')!.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
    })

    it('supports adding several cards in a row', async () => {
      const { user, input, onAdd } = setup()

      await user.type(input, 'First{Enter}')
      await user.type(input, 'Second{Enter}')

      expect(onAdd).toHaveBeenNthCalledWith(1, 'First')
      expect(onAdd).toHaveBeenNthCalledWith(2, 'Second')
      expect(onAdd).toHaveBeenCalledTimes(2)
      expect(input).toHaveValue('')
    })
  })
})
