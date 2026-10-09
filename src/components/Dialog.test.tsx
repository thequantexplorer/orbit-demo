import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSeedBoard } from '../data'
import type { Card } from '../types'
import { Dialog } from './Dialog'

// jsdom (v26) ships HTMLDialogElement without showModal()/close() and never
// fires `cancel` on Escape, so emulate the parts of the browser behavior that
// Dialog relies on.
const escapeListeners = new WeakMap<HTMLDialogElement, (event: KeyboardEvent) => void>()

const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !this.open) return
    const cancel = new Event('cancel', { cancelable: true })
    if (this.dispatchEvent(cancel)) this.close()
  }
  escapeListeners.set(this, onKeyDown)
  this.ownerDocument.addEventListener('keydown', onKeyDown)
})

const close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open')
  const onKeyDown = escapeListeners.get(this)
  if (onKeyDown) this.ownerDocument.removeEventListener('keydown', onKeyDown)
  escapeListeners.delete(this)
})

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    writable: true,
    value: showModal,
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    writable: true,
    value: close,
  })
})

afterAll(() => {
  for (const [name, descriptor] of [
    ['showModal', originalShowModal],
    ['close', originalClose],
  ] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
  }
})

beforeEach(() => {
  showModal.mockClear()
  close.mockClear()
})

const board = createSeedBoard()
const card: Card = board.cards['KB-1']
const doneColumn = board.columns.find((column) => column.id === 'done')!

interface ConfirmDeleteProps {
  issue: Card
  onClose: () => void
  onConfirm: (issue: Card) => void
  className?: string
}

function ConfirmDelete({ issue, onClose, onConfirm, className }: ConfirmDeleteProps) {
  return (
    <Dialog labelledBy="delete-title" onClose={onClose} className={className}>
      <h2 id="delete-title">Delete {issue.id}?</h2>
      <p>“{issue.title}” will be permanently removed.</p>
      <footer>
        <button data-autofocus onClick={onClose}>
          Keep issue
        </button>
        <button
          onClick={() => {
            onConfirm(issue)
            onClose()
          }}
        >
          Delete issue
        </button>
      </footer>
    </Dialog>
  )
}

function renderConfirm(props: Partial<ConfirmDeleteProps> = {}) {
  const onClose = vi.fn()
  const onConfirm = vi.fn()
  const user = userEvent.setup()
  const utils = render(
    <ConfirmDelete issue={card} onClose={onClose} onConfirm={onConfirm} {...props} />,
  )
  const dialog = screen.getByRole<HTMLDialogElement>('dialog', {
    name: `Delete ${card.id}?`,
  })
  return { ...utils, user, dialog, onClose, onConfirm }
}

/** Mirrors App.tsx: a trigger button that conditionally mounts the dialog. */
function Board({ onConfirm }: { onConfirm: (issue: Card) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Delete {card.title}</button>
      {open && (
        <ConfirmDelete issue={card} onClose={() => setOpen(false)} onConfirm={onConfirm} />
      )}
    </>
  )
}

describe('Dialog', () => {
  describe('rendering', () => {
    it('renders a modal dialog named by the labelledBy element', () => {
      const { dialog } = renderConfirm()

      expect(dialog.tagName).toBe('DIALOG')
      expect(dialog).toHaveAttribute('aria-labelledby', 'delete-title')
      expect(dialog).toHaveAccessibleName(`Delete ${card.id}?`)
      expect(dialog).toHaveAttribute('open')
      expect(showModal).toHaveBeenCalledTimes(1)
      expect(showModal.mock.contexts[0]).toBe(dialog)
    })

    it('renders its children: title, body and actions', () => {
      const { dialog } = renderConfirm()

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(`Delete ${card.id}?`)
      expect(dialog).toHaveTextContent(`“${card.title}” will be permanently removed.`)
      expect(screen.getByRole('button', { name: 'Keep issue' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete issue' })).toBeInTheDocument()
    })

    it('applies only the base "dialog" class by default', () => {
      const { dialog } = renderConfirm()

      expect(dialog).toHaveClass('dialog', { exact: true })
    })

    it('appends a custom className to the base class', () => {
      const { dialog } = renderConfirm({ className: 'small-dialog shortcuts-dialog' })

      expect([...dialog.classList]).toEqual(['dialog', 'small-dialog', 'shortcuts-dialog'])
    })

    it('opens the modal only once across re-renders', () => {
      const onClose = vi.fn()
      const onConfirm = vi.fn()
      const { rerender } = render(
        <ConfirmDelete issue={card} onClose={onClose} onConfirm={onConfirm} />,
      )
      const nextCard = board.cards[doneColumn.cardIds[0]]
      rerender(<ConfirmDelete issue={nextCard} onClose={onClose} onConfirm={onConfirm} />)

      expect(showModal).toHaveBeenCalledTimes(1)
      expect(close).not.toHaveBeenCalled()
      expect(screen.getByRole('dialog', { name: `Delete ${nextCard.id}?` })).toBeInTheDocument()
    })
  })

  describe('actions', () => {
    it('calls the confirm handler with the issue and closes when confirming', async () => {
      const { user, onClose, onConfirm } = renderConfirm()

      await user.click(screen.getByRole('button', { name: 'Delete issue' }))

      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(onConfirm).toHaveBeenCalledWith(card)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('closes without confirming when cancelling', async () => {
      const { user, onClose, onConfirm } = renderConfirm()

      await user.click(screen.getByRole('button', { name: 'Keep issue' }))

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onConfirm).not.toHaveBeenCalled()
    })
  })

  describe('Escape key', () => {
    it('calls onClose and prevents the native close so the parent stays in control', async () => {
      const { user, dialog, onClose, onConfirm } = renderConfirm()
      const cancelEvents: Event[] = []
      dialog.addEventListener('cancel', (event) => cancelEvents.push(event))

      await user.keyboard('{Escape}')

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onConfirm).not.toHaveBeenCalled()
      expect(cancelEvents).toHaveLength(1)
      expect(cancelEvents[0].defaultPrevented).toBe(true)
      expect(dialog).toHaveAttribute('open')
      expect(close).not.toHaveBeenCalled()
    })

    it('uses the latest onClose after a re-render', async () => {
      const user = userEvent.setup()
      const firstOnClose = vi.fn()
      const latestOnClose = vi.fn()
      const onConfirm = vi.fn()
      const { rerender } = render(
        <ConfirmDelete issue={card} onClose={firstOnClose} onConfirm={onConfirm} />,
      )
      rerender(<ConfirmDelete issue={card} onClose={latestOnClose} onConfirm={onConfirm} />)

      await user.keyboard('{Escape}')

      expect(firstOnClose).not.toHaveBeenCalled()
      expect(latestOnClose).toHaveBeenCalledTimes(1)
    })

    it('ignores other keys', async () => {
      const { user, onClose } = renderConfirm()

      await user.keyboard('{ArrowDown}{Shift}a')

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('backdrop click', () => {
    // A modal <dialog> covers the backdrop, so backdrop clicks target the
    // dialog element itself with coordinates outside its box.
    const rect = { left: 100, top: 100, right: 500, bottom: 400 }

    function setup() {
      const result = renderConfirm()
      vi.spyOn(result.dialog, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({
          x: rect.left,
          y: rect.top,
          width: rect.right - rect.left,
          height: rect.bottom - rect.top,
        }),
      )
      return result
    }

    it.each([
      ['left of', { clientX: rect.left - 1, clientY: 250 }],
      ['right of', { clientX: rect.right + 1, clientY: 250 }],
      ['above', { clientX: 300, clientY: rect.top - 1 }],
      ['below', { clientX: 300, clientY: rect.bottom + 1 }],
    ])('closes when clicking the backdrop %s the dialog', async (_where, coords) => {
      const { user, dialog, onClose, onConfirm } = setup()

      await user.pointer({ keys: '[MouseLeft]', target: dialog, coords })

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it.each([
      ['inside the padding', { clientX: 300, clientY: 250 }],
      ['on the top-left edge', { clientX: rect.left, clientY: rect.top }],
      ['on the bottom-right edge', { clientX: rect.right, clientY: rect.bottom }],
    ])('stays open when clicking the dialog surface %s', async (_where, coords) => {
      const { user, dialog, onClose } = setup()

      await user.pointer({ keys: '[MouseLeft]', target: dialog, coords })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('ignores clicks on content, even with coordinates outside the box', async () => {
      const { user, onClose } = setup()

      await user.pointer({
        keys: '[MouseLeft]',
        target: screen.getByRole('heading', { name: `Delete ${card.id}?` }),
        coords: { clientX: 0, clientY: 0 },
      })

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('focus management', () => {
    it('focuses the [data-autofocus] element when opened', () => {
      renderConfirm()

      expect(screen.getByRole('button', { name: 'Keep issue' })).toHaveFocus()
    })

    it('leaves focus alone when no child is marked [data-autofocus]', async () => {
      const user = userEvent.setup()
      render(
        <>
          <input aria-label="Search issues" />
          <Dialog labelledBy="plain-title" onClose={vi.fn()}>
            <h2 id="plain-title">{doneColumn.title}</h2>
            <button>Close</button>
          </Dialog>
        </>,
      )
      expect(document.body).toHaveFocus()

      await user.click(screen.getByLabelText('Search issues'))
      expect(screen.getByLabelText('Search issues')).toHaveFocus()
    })

    it('closes the native dialog and restores focus to the trigger on unmount', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<Board onConfirm={onConfirm} />)
      const trigger = screen.getByRole('button', { name: `Delete ${card.title}` })

      await user.click(trigger)
      const dialog = screen.getByRole('dialog', { name: `Delete ${card.id}?` })
      expect(screen.getByRole('button', { name: 'Keep issue' })).toHaveFocus()

      await user.keyboard('{Escape}')

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(close).toHaveBeenCalledTimes(1)
      expect(close.mock.contexts[0]).toBe(dialog)
      expect(trigger).toHaveFocus()
      expect(onConfirm).not.toHaveBeenCalled()
    })

    it('restores focus to the trigger after confirming', async () => {
      const user = userEvent.setup()
      const onConfirm = vi.fn()
      render(<Board onConfirm={onConfirm} />)
      const trigger = screen.getByRole('button', { name: `Delete ${card.title}` })

      await user.click(trigger)
      await user.click(screen.getByRole('button', { name: 'Delete issue' }))

      expect(onConfirm).toHaveBeenCalledWith(card)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(trigger).toHaveFocus()
    })

    it('does not restore focus to an element that was removed while open', () => {
      const trigger = document.createElement('button')
      trigger.textContent = 'Open'
      document.body.append(trigger)
      trigger.focus()
      const focusSpy = vi.spyOn(trigger, 'focus')

      const { unmount } = renderConfirm()
      trigger.remove()
      unmount()

      expect(focusSpy).not.toHaveBeenCalled()
      expect(trigger).not.toHaveFocus()
    })

    it('does not try to restore focus to a non-HTML element', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('tabindex', '0')
      document.body.append(svg)
      svg.focus()
      expect(svg).toHaveFocus()
      const focusSpy = vi.spyOn(svg, 'focus')

      const { unmount } = renderConfirm()
      unmount()

      expect(focusSpy).not.toHaveBeenCalled()
      expect(svg).not.toHaveFocus()
      svg.remove()
    })
  })
})
