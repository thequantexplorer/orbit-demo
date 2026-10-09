import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { ASSIGNEES, LABEL_ORDER, LABELS, createSeedBoard } from '../data'
import type { Card, ColumnId } from '../types'
import { CardModal } from './CardModal'

// jsdom does not implement HTMLDialogElement#showModal/#close, nor the
// browser behaviour of turning an Escape keydown into a cancelable `cancel`
// event on the open modal dialog (closing it unless the event is cancelled).
const originalShowModal = HTMLDialogElement.prototype.showModal
const originalClose = HTMLDialogElement.prototype.close
const escapeHandlers = new WeakMap<
  HTMLDialogElement,
  (event: KeyboardEvent) => void
>()

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        !this.hasAttribute('open')
      )
        return
      const cancel = new Event('cancel', { cancelable: true })
      if (this.dispatchEvent(cancel)) this.close()
    }
    escapeHandlers.set(this, onKeyDown)
    this.ownerDocument.addEventListener('keydown', onKeyDown)
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    const onKeyDown = escapeHandlers.get(this)
    if (onKeyDown) {
      this.ownerDocument.removeEventListener('keydown', onKeyDown)
      escapeHandlers.delete(this)
    }
  }
})

afterAll(() => {
  HTMLDialogElement.prototype.showModal = originalShowModal
  HTMLDialogElement.prototype.close = originalClose
})

const board = createSeedBoard()
const columns = board.columns
// KB-4: "Fix login redirect bug", labels bug + urgent, assigned to leo, in backlog.
const seedCard: Card = board.cards['KB-4']

const blankCard: Card = {
  id: 'KB-10',
  title: '',
  description: '',
  labels: [],
  assigneeId: null,
  dueDate: null,
}

const dueCard: Card = { ...seedCard, dueDate: '2026-11-05' }

interface RenderOptions {
  card?: Card
  columnId?: ColumnId
  creating?: boolean
}

function renderModal({
  card = seedCard,
  columnId = 'backlog',
  creating,
}: RenderOptions = {}) {
  const onSave = vi.fn<(patch: Omit<Card, 'id'>, columnId: ColumnId) => void>()
  const onDelete = vi.fn<() => void>()
  const onClose = vi.fn<() => void>()
  const user = userEvent.setup()
  const result = render(
    <CardModal
      card={card}
      columnId={columnId}
      columns={columns}
      creating={creating}
      onSave={onSave}
      onDelete={onDelete}
      onClose={onClose}
    />,
  )
  return { ...result, user, onSave, onDelete, onClose }
}

function labelButton(labelId: keyof typeof LABELS) {
  const fieldset = screen.getByRole('group', { name: 'Labels' })
  return within(fieldset).getByRole('button', { name: LABELS[labelId].name })
}

describe('CardModal', () => {
  describe('rendering an existing issue', () => {
    it('opens a modal dialog labelled by the issue id', () => {
      renderModal()
      const dialog = screen.getByRole('dialog', { name: 'KB-4' })
      expect(dialog).toHaveAttribute('open')
      expect(dialog).toHaveClass('dialog', 'issue-dialog')
    })

    it('prefills the form fields from the card and column', () => {
      renderModal({ columnId: 'review' })
      expect(screen.getByLabelText('Title')).toHaveValue(seedCard.title)
      expect(screen.getByLabelText('Description')).toHaveValue(
        seedCard.description,
      )
      expect(screen.getByLabelText('Status')).toHaveValue('review')
      expect(screen.getByLabelText('Assignee')).toHaveValue('leo')
    })

    it('autofocuses the title input', () => {
      renderModal()
      expect(screen.getByLabelText('Title')).toHaveFocus()
    })

    it('lists every column as a status option', () => {
      renderModal()
      const options = within(screen.getByLabelText('Status')).getAllByRole(
        'option',
      )
      expect(options.map((option) => option.textContent)).toEqual(
        columns.map((column) => column.title),
      )
      expect(options.map((option) => (option as HTMLOptionElement).value)).toEqual(
        columns.map((column) => column.id),
      )
    })

    it('lists Unassigned followed by every assignee', () => {
      renderModal()
      const options = within(screen.getByLabelText('Assignee')).getAllByRole(
        'option',
      )
      expect(options.map((option) => option.textContent)).toEqual([
        'Unassigned',
        ...Object.values(ASSIGNEES).map((assignee) => assignee.name),
      ])
    })

    it("shows the current assignee's avatar", () => {
      renderModal()
      expect(screen.getByLabelText('Leo Martins')).toHaveTextContent('LM')
    })

    it('renders a toggle for every label, pressed for the card labels', () => {
      renderModal()
      for (const labelId of LABEL_ORDER) {
        const button = labelButton(labelId)
        const active = seedCard.labels.includes(labelId)
        expect(button).toHaveAttribute('aria-pressed', String(active))
        expect(button.classList.contains('label-chip--active')).toBe(active)
      }
    })

    it('shows the save and delete actions but no creation hint', () => {
      renderModal()
      expect(
        screen.getByRole('button', { name: /save changes/i }),
      ).toBeEnabled()
      expect(
        screen.getByRole('button', { name: 'Delete issue' }),
      ).toBeInTheDocument()
      expect(
        screen.queryByText('Good work starts with a clear issue.'),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /create issue/i }),
      ).not.toBeInTheDocument()
    })
  })

  describe('creating a new issue', () => {
    it('shows the "New issue" heading, hint and create button', () => {
      renderModal({ card: blankCard, creating: true })
      expect(
        screen.getByRole('dialog', { name: 'New issue' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Good work starts with a clear issue.'),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /create issue/i }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /save changes/i }),
      ).not.toBeInTheDocument()
    })

    it('does not offer deletion', () => {
      renderModal({ card: blankCard, creating: true })
      expect(
        screen.queryByRole('button', { name: 'Delete issue' }),
      ).not.toBeInTheDocument()
    })

    it('disables the submit button until a title is entered', async () => {
      const { user } = renderModal({ card: blankCard, creating: true })
      const submit = screen.getByRole('button', { name: /create issue/i })
      expect(submit).toBeDisabled()

      await user.type(screen.getByLabelText('Title'), '   ')
      expect(submit).toBeDisabled()

      await user.type(screen.getByLabelText('Title'), 'Ship it')
      expect(submit).toBeEnabled()
    })

    it('shows an empty avatar and Unassigned when no assignee is set', () => {
      renderModal({ card: blankCard, creating: true })
      expect(screen.getByLabelText('Assignee')).toHaveValue('')
      expect(screen.getByTitle('Unassigned')).toHaveTextContent('?')
    })

    it('creates the issue with the entered values', async () => {
      const { user, onSave, onClose } = renderModal({
        card: blankCard,
        columnId: 'in-progress',
        creating: true,
      })
      await user.type(screen.getByLabelText('Title'), '  Add billing page  ')
      await user.type(
        screen.getByLabelText('Description'),
        '  Stripe checkout  ',
      )
      await user.click(labelButton('feature'))
      await user.selectOptions(screen.getByLabelText('Assignee'), 'sofia')
      await user.type(screen.getByLabelText('Due date'), '2026-12-01')
      await user.click(screen.getByRole('button', { name: /create issue/i }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith(
        {
          title: 'Add billing page',
          description: 'Stripe checkout',
          labels: ['feature'],
          assigneeId: 'sofia',
          dueDate: '2026-12-01',
        },
        'in-progress',
      )
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('editing and saving', () => {
    it('saves unchanged values when submitted as-is', async () => {
      const { user, onSave, onClose } = renderModal()
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(
        {
          title: seedCard.title,
          description: seedCard.description,
          labels: seedCard.labels,
          assigneeId: seedCard.assigneeId,
          dueDate: seedCard.dueDate,
        },
        'backlog',
      )
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('saves an edited, trimmed title and description', async () => {
      const { user, onSave } = renderModal()
      const title = screen.getByLabelText('Title')
      const description = screen.getByLabelText('Description')
      await user.clear(title)
      await user.type(title, '  Fix SSO redirect  ')
      await user.clear(description)
      await user.type(description, '\n Lands on /dashboard now \n')
      await user.click(screen.getByRole('button', { name: /save changes/i }))

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fix SSO redirect',
          description: 'Lands on /dashboard now',
        }),
        'backlog',
      )
    })

    it('saves the newly selected status column', async () => {
      const { user, onSave } = renderModal()
      const status = screen.getByLabelText('Status')
      await user.selectOptions(status, 'Done')
      expect(status).toHaveValue('done')
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(expect.any(Object), 'done')
    })

    it('ignores a status value that does not match any column', async () => {
      const { user, onSave } = renderModal({ columnId: 'review' })
      const status = screen.getByLabelText('Status')
      fireEvent.change(status, { target: { value: 'archived' } })
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(expect.any(Object), 'review')
    })

    it('changes the assignee and updates the avatar', async () => {
      const { user, onSave } = renderModal()
      await user.selectOptions(screen.getByLabelText('Assignee'), 'Ava Chen')
      expect(screen.getByLabelText('Ava Chen')).toHaveTextContent('AC')
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: 'ava' }),
        'backlog',
      )
    })

    it('saves null when the assignee is cleared', async () => {
      const { user, onSave } = renderModal()
      await user.selectOptions(screen.getByLabelText('Assignee'), 'Unassigned')
      expect(screen.getByTitle('Unassigned')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: null }),
        'backlog',
      )
    })

    it('starts with an empty due date and no clear button when none is set', () => {
      renderModal()
      expect(screen.getByLabelText('Due date')).toHaveValue('')
      expect(
        screen.queryByRole('button', { name: 'Clear due date' }),
      ).not.toBeInTheDocument()
    })

    it('prefills an existing due date and offers to clear it', () => {
      renderModal({ card: dueCard })
      expect(screen.getByLabelText('Due date')).toHaveValue('2026-11-05')
      expect(
        screen.getByRole('button', { name: 'Clear due date' }),
      ).toBeInTheDocument()
    })

    it('saves a newly picked due date', async () => {
      const { user, onSave } = renderModal()
      const dueDate = screen.getByLabelText('Due date')
      await user.type(dueDate, '2027-01-15')
      expect(dueDate).toHaveValue('2027-01-15')
      expect(
        screen.getByRole('button', { name: 'Clear due date' }),
      ).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ dueDate: '2027-01-15' }),
        'backlog',
      )
    })

    it('clears the due date with the clear button and refocuses the date input', async () => {
      const { user, onSave, onClose } = renderModal({ card: dueCard })
      await user.click(screen.getByRole('button', { name: 'Clear due date' }))
      const dueDate = screen.getByLabelText('Due date')
      expect(dueDate).toHaveValue('')
      expect(dueDate).toHaveFocus()
      expect(
        screen.queryByRole('button', { name: 'Clear due date' }),
      ).not.toBeInTheDocument()
      expect(onSave).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ dueDate: null }),
        'backlog',
      )
    })

    it('saves null when the date input itself is emptied', async () => {
      const { user, onSave } = renderModal({ card: dueCard })
      await user.clear(screen.getByLabelText('Due date'))
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ dueDate: null }),
        'backlog',
      )
    })

    it('toggles labels on and off', async () => {
      const { user, onSave } = renderModal()
      await user.click(labelButton('bug'))
      expect(labelButton('bug')).toHaveAttribute('aria-pressed', 'false')
      await user.click(labelButton('design'))
      expect(labelButton('design')).toHaveAttribute('aria-pressed', 'true')
      expect(labelButton('design')).toHaveClass('label-chip--active')

      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ labels: ['urgent', 'design'] }),
        'backlog',
      )
    })

    it('does not mutate the original card when editing', async () => {
      const { user } = renderModal()
      await user.click(labelButton('docs'))
      await user.type(screen.getByLabelText('Title'), '!')
      expect(seedCard.labels).toEqual(['bug', 'urgent'])
      expect(seedCard.title).toBe('Fix login redirect bug')
    })

    it('label toggles do not submit the form', async () => {
      const { user, onSave, onClose } = renderModal()
      await user.click(labelButton('docs'))
      expect(onSave).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('submits when Enter is pressed in the title input', async () => {
      const { user, onSave, onClose } = renderModal()
      await user.type(screen.getByLabelText('Title'), '{Enter}')
      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it.each([
      ['Ctrl', '{Control>}{Enter}{/Control}'],
      ['Meta', '{Meta>}{Enter}{/Meta}'],
    ])(
      'submits with %s+Enter from the description',
      async (_modifier, keys) => {
        const { user, onSave } = renderModal()
        const description = screen.getByLabelText('Description')
        await user.click(description)
        await user.keyboard(keys)
        expect(onSave).toHaveBeenCalledTimes(1)
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({ description: seedCard.description }),
          'backlog',
        )
      },
    )

    it('plain Enter in the description inserts a newline instead of submitting', async () => {
      const { user, onSave } = renderModal()
      const description = screen.getByLabelText('Description')
      await user.click(description)
      await user.keyboard('{Enter}')
      expect(onSave).not.toHaveBeenCalled()
      expect(description).toHaveValue(`${seedCard.description}\n`)
    })

    it('does not save a whitespace-only title submitted via Ctrl+Enter', async () => {
      const { user, onSave, onClose } = renderModal()
      const title = screen.getByLabelText('Title')
      await user.clear(title)
      await user.type(title, '   ')
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
      await user.keyboard('{Control>}{Enter}{/Control}')
      expect(onSave).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('does not save an empty title (required field)', async () => {
      const { user, onSave } = renderModal()
      const title = screen.getByLabelText('Title')
      await user.clear(title)
      expect(title).toBeRequired()
      expect(title).toBeInvalid()
      await user.keyboard('{Control>}{Enter}{/Control}')
      expect(onSave).not.toHaveBeenCalled()
    })

    it('limits the title to 200 characters', () => {
      renderModal()
      expect(screen.getByLabelText('Title')).toHaveAttribute('maxLength', '200')
    })
  })

  describe('deleting', () => {
    it('asks for confirmation before deleting', async () => {
      const { user, onDelete } = renderModal()
      await user.click(screen.getByRole('button', { name: 'Delete issue' }))
      expect(screen.getByText('Delete this issue?')).toBeInTheDocument()
      expect(onDelete).not.toHaveBeenCalled()
      expect(
        screen.getByRole('button', { name: 'Cancel deletion' }),
      ).toBeInTheDocument()
    })

    it('calls onDelete when the deletion is confirmed', async () => {
      const { user, onDelete, onSave, onClose } = renderModal()
      await user.click(screen.getByRole('button', { name: 'Delete issue' }))
      await user.click(screen.getByRole('button', { name: 'Delete issue' }))
      expect(onDelete).toHaveBeenCalledTimes(1)
      expect(onSave).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('returns to the trash button when deletion is cancelled', async () => {
      const { user, onDelete, onClose } = renderModal()
      await user.click(screen.getByRole('button', { name: 'Delete issue' }))
      await user.click(screen.getByRole('button', { name: 'Cancel deletion' }))
      expect(screen.queryByText('Delete this issue?')).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Delete issue' }),
      ).toHaveAttribute('title', 'Delete issue')
      expect(onDelete).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('closing', () => {
    it('closes via the header close button without saving', async () => {
      const { user, onClose, onSave } = renderModal()
      await user.type(screen.getByLabelText('Title'), ' edited')
      await user.click(screen.getByRole('button', { name: 'Close' }))
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onSave).not.toHaveBeenCalled()
    })

    it('closes via the Cancel button without saving', async () => {
      const { user, onClose, onSave } = renderModal()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onSave).not.toHaveBeenCalled()
    })

    it('closes when the dialog is cancelled with Escape', () => {
      const { onClose, onSave } = renderModal()
      const dialog = screen.getByRole('dialog')
      // Browsers fire a cancelable `cancel` event on the dialog for Escape;
      // jsdom does not, so dispatch it directly.
      const cancel = new Event('cancel', { cancelable: true })
      fireEvent(dialog, cancel)
      expect(cancel.defaultPrevented).toBe(true)
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onSave).not.toHaveBeenCalled()
      expect(dialog).toHaveAttribute('open')
    })

    it.each(['Title', 'Description'])(
      'closes when Escape is pressed with focus in the %s field',
      async (field) => {
        const { user, onClose, onSave } = renderModal()
        const dialog = screen.getByRole('dialog')
        const escapePrevented: boolean[] = []
        const recordEscape = (event: KeyboardEvent) => {
          if (event.key === 'Escape') escapePrevented.push(event.defaultPrevented)
        }
        document.addEventListener('keydown', recordEscape)

        await user.click(screen.getByLabelText(field))
        expect(screen.getByLabelText(field)).toHaveFocus()
        await user.keyboard('{Escape}')
        document.removeEventListener('keydown', recordEscape)

        // CardModal's form onKeyDown must not swallow Escape.
        expect(escapePrevented).toEqual([false])
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(onSave).not.toHaveBeenCalled()
        // Dialog cancels the native close and leaves unmounting to the parent.
        expect(dialog).toHaveAttribute('open')
      },
    )

    it('closes when the backdrop outside the dialog box is clicked', () => {
      const { onClose } = renderModal()
      const dialog = screen.getByRole('dialog')
      vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ x: 100, y: 100, width: 400, height: 300 }),
      )
      fireEvent.click(dialog, { clientX: 20, clientY: 20 })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('stays open when clicking inside the dialog box', () => {
      const { onClose } = renderModal()
      const dialog = screen.getByRole('dialog')
      vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ x: 100, y: 100, width: 400, height: 300 }),
      )
      fireEvent.click(dialog, { clientX: 200, clientY: 200 })
      fireEvent.click(screen.getByLabelText('Description'))
      expect(onClose).not.toHaveBeenCalled()
    })

    it('closes the native dialog and restores focus on unmount', async () => {
      const opener = document.createElement('button')
      opener.textContent = 'Open issue'
      document.body.append(opener)
      opener.focus()

      const { unmount } = renderModal()
      const dialog = screen.getByRole('dialog')
      expect(screen.getByLabelText('Title')).toHaveFocus()

      unmount()
      expect(dialog).not.toHaveAttribute('open')
      expect(opener).toHaveFocus()
      opener.remove()
    })
  })
})
