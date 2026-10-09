import { type FormEvent } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddCardForm } from './AddCardForm'

const { state, setTitle, inputRef } = vi.hoisted(() => ({
  state: { title: '' },
  setTitle: vi.fn(),
  inputRef: { current: { focus: vi.fn() } },
}))

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useState: () => [state.title, setTitle],
  useRef: () => inputRef,
}))

describe('AddCardForm submit focus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.title = ''
  })

  it.each(['Backlog', 'In Progress', 'Review', 'Done'])(
    'returns focus to the %s input after creating a card',
    (columnTitle) => {
      state.title = '  Ship release notes  '
      const onAdd = vi.fn()
      const preventDefault = vi.fn()
      const form = AddCardForm({ columnTitle, onAdd })
      const [, input, button] = form.props.children

      expect(input.props.ref).toBe(inputRef)
      expect(button.props.type).toBe('submit')
      expect(button.props.disabled).toBe(false)

      form.props.onSubmit({ preventDefault } as unknown as FormEvent)

      expect(preventDefault).toHaveBeenCalledOnce()
      expect(onAdd).toHaveBeenCalledExactlyOnceWith('Ship release notes')
      expect(setTitle).toHaveBeenCalledExactlyOnceWith('')
      expect(inputRef.current.focus).toHaveBeenCalledOnce()
      expect(onAdd.mock.invocationCallOrder[0]).toBeLessThan(
        inputRef.current.focus.mock.invocationCallOrder[0],
      )
      expect(setTitle.mock.invocationCallOrder[0]).toBeLessThan(
        inputRef.current.focus.mock.invocationCallOrder[0],
      )
    },
  )

  it.each(['', '   ', '\t\n '])(
    'does not create a card, clear the title or move focus for %j',
    (title) => {
      state.title = title
      const onAdd = vi.fn()
      const preventDefault = vi.fn()
      const form = AddCardForm({ columnTitle: 'Backlog', onAdd })
      const button = form.props.children[2]

      expect(button.props.disabled).toBe(true)

      form.props.onSubmit({ preventDefault } as unknown as FormEvent)

      expect(preventDefault).toHaveBeenCalledOnce()
      expect(onAdd).not.toHaveBeenCalled()
      expect(setTitle).not.toHaveBeenCalled()
      expect(inputRef.current.focus).not.toHaveBeenCalled()
    },
  )
})
