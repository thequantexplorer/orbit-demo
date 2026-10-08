import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Dialog } from './Dialog'

// jsdom has no HTMLDialogElement.showModal/close. Stub them with the browser
// behaviour the component relies on: `open` toggling and Escape firing a
// cancelable `cancel` event that closes the dialog unless prevented.
const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.setAttribute('open', '')
  this.addEventListener('keydown', escapeToCancel)
})
const close = vi.fn(function (this: HTMLDialogElement) {
  this.removeAttribute('open')
  this.removeEventListener('keydown', escapeToCancel)
})

function escapeToCancel(this: HTMLDialogElement, event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  const cancel = new Event('cancel', { cancelable: true })
  if (this.dispatchEvent(cancel)) this.close()
}

const RECT = { left: 100, top: 100, right: 300, bottom: 300 }

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = showModal
  HTMLDialogElement.prototype.close = close
  vi.spyOn(HTMLDialogElement.prototype, 'getBoundingClientRect').mockReturnValue(
    {
      ...RECT,
      x: RECT.left,
      y: RECT.top,
      width: RECT.right - RECT.left,
      height: RECT.bottom - RECT.top,
      toJSON: () => ({}),
    } as DOMRect,
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  showModal.mockClear()
  close.mockClear()
})

function renderDialog(
  props: Partial<Parameters<typeof Dialog>[0]> = {},
  children = (
    <>
      <h2 id="dialog-title">Edit issue</h2>
      <p>Dialog body</p>
      <button type="button">Save</button>
    </>
  ),
) {
  const onClose = vi.fn()
  const utils = render(
    <Dialog labelledBy="dialog-title" onClose={onClose} {...props}>
      {children}
    </Dialog>,
  )
  return { ...utils, onClose, dialog: screen.getByRole('dialog') }
}

function Harness({ autofocus = false }: { autofocus?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      {open && (
        <Dialog labelledBy="harness-title" onClose={() => setOpen(false)}>
          <h2 id="harness-title">Harness</h2>
          <input aria-label="Title" data-autofocus={autofocus || undefined} />
          <button type="button" onClick={() => setOpen(false)}>
            Done
          </button>
        </Dialog>
      )}
    </>
  )
}

describe('Dialog', () => {
  describe('rendering', () => {
    it('opens as a modal and renders its children', () => {
      const { dialog } = renderDialog()

      expect(showModal).toHaveBeenCalledTimes(1)
      expect(dialog).toHaveAttribute('open')
      expect(screen.getByText('Dialog body')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('takes its accessible name from the element referenced by labelledBy', () => {
      const { dialog } = renderDialog()

      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title')
      expect(screen.getByRole('dialog', { name: 'Edit issue' })).toBe(dialog)
    })

    it('always has the base "dialog" class', () => {
      const { dialog } = renderDialog()

      expect(dialog).toHaveClass('dialog')
      expect(dialog.className.trim()).toBe('dialog')
    })

    it('appends a custom className to the base class', () => {
      const { dialog } = renderDialog({ className: 'dialog--wide' })

      expect(dialog).toHaveClass('dialog', 'dialog--wide')
    })
  })

  describe('focus management', () => {
    it('focuses the element marked with data-autofocus on open', () => {
      renderDialog(
        {},
        <>
          <h2 id="dialog-title">Edit issue</h2>
          <button type="button">First</button>
          <input aria-label="Title" data-autofocus />
        </>,
      )

      expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus()
    })

    it('leaves focus alone when no element is marked with data-autofocus', () => {
      renderDialog()

      expect(document.body).toHaveFocus()
    })

    it('restores focus to the opener when the dialog closes', async () => {
      const user = userEvent.setup()
      render(<Harness autofocus />)
      const opener = screen.getByRole('button', { name: 'Open dialog' })

      await user.click(opener)
      expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus()

      await user.click(screen.getByRole('button', { name: 'Done' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(opener).toHaveFocus()
    })

    it('does not try to restore focus to an opener that was removed from the DOM', () => {
      const opener = document.createElement('button')
      document.body.append(opener)
      opener.focus()
      const focusSpy = vi.spyOn(opener, 'focus')

      const { unmount } = renderDialog()
      opener.remove()
      unmount()

      expect(focusSpy).not.toHaveBeenCalled()
    })

    it('does not try to restore focus when the previously focused element is not an HTMLElement', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('tabindex', '0')
      document.body.append(svg)
      svg.focus()
      expect(svg).toHaveFocus()
      const focusSpy = vi.spyOn(svg, 'focus')

      const { unmount } = renderDialog()
      unmount()

      expect(focusSpy).not.toHaveBeenCalled()
      svg.remove()
    })
  })

  describe('closing', () => {
    it('calls the native close() when unmounted', () => {
      const { unmount, dialog } = renderDialog()
      expect(close).not.toHaveBeenCalled()

      unmount()

      expect(close).toHaveBeenCalledTimes(1)
      expect(dialog).not.toHaveAttribute('open')
    })

    it('calls onClose when Escape is pressed and keeps the dialog open for React to unmount', async () => {
      const user = userEvent.setup()
      const { onClose, dialog } = renderDialog()

      await user.click(screen.getByRole('button', { name: 'Save' }))
      await user.keyboard('{Escape}')

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledWith()
      expect(close).not.toHaveBeenCalled()
      expect(dialog).toHaveAttribute('open')
    })

    it('prevents the default action of the native cancel event', () => {
      const { onClose, dialog } = renderDialog()
      const cancel = new Event('cancel', { cancelable: true })

      act(() => {
        dialog.dispatchEvent(cancel)
      })

      expect(cancel.defaultPrevented).toBe(true)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('ignores keys other than Escape', async () => {
      const user = userEvent.setup()
      const { onClose } = renderDialog()

      await user.click(screen.getByRole('button', { name: 'Save' }))
      await user.keyboard('{Enter}a{Tab}')

      expect(onClose).not.toHaveBeenCalled()
    })

    it('unmounts through the parent when Escape is pressed', async () => {
      const user = userEvent.setup()
      render(<Harness />)
      const opener = screen.getByRole('button', { name: 'Open dialog' })

      await user.click(opener)
      expect(screen.getByRole('dialog', { name: 'Harness' })).toBeInTheDocument()

      await user.click(screen.getByRole('textbox', { name: 'Title' }))
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(opener).toHaveFocus()
    })
  })

  describe('backdrop clicks', () => {
    it.each([
      ['left of', { clientX: RECT.left - 1, clientY: 200 }],
      ['right of', { clientX: RECT.right + 1, clientY: 200 }],
      ['above', { clientX: 200, clientY: RECT.top - 1 }],
      ['below', { clientX: 200, clientY: RECT.bottom + 1 }],
    ])('calls onClose for a click %s the dialog box', async (_, coords) => {
      const user = userEvent.setup()
      const { onClose, dialog } = renderDialog()

      await user.pointer({ keys: '[MouseLeft]', target: dialog, coords })

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledWith()
    })

    it.each([
      ['inside', { clientX: 200, clientY: 200 }],
      ['on the top-left edge of', { clientX: RECT.left, clientY: RECT.top }],
      [
        'on the bottom-right edge of',
        { clientX: RECT.right, clientY: RECT.bottom },
      ],
    ])(
      'does not call onClose for a click on the dialog itself %s its box',
      async (_, coords) => {
        const user = userEvent.setup()
        const { onClose, dialog } = renderDialog()

        await user.pointer({ keys: '[MouseLeft]', target: dialog, coords })

        expect(onClose).not.toHaveBeenCalled()
      },
    )

    it('does not call onClose for clicks on content inside the dialog', async () => {
      const user = userEvent.setup()
      const { onClose } = renderDialog()

      await user.click(screen.getByText('Dialog body'))
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onClose).not.toHaveBeenCalled()
    })

    it('ignores clicks on children even when their coordinates fall outside the box', () => {
      const { onClose } = renderDialog()

      fireEvent.click(screen.getByText('Dialog body'), {
        clientX: 0,
        clientY: 0,
      })

      expect(onClose).not.toHaveBeenCalled()
    })
  })
})
