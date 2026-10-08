import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Card, Column, ColumnId } from '../types'
import { CardModal } from './CardModal'

const columns: Column[] = [
  { id: 'backlog', title: 'Backlog', accent: '#94a3b8', cardIds: ['KB-1'] },
  { id: 'in-progress', title: 'In Progress', accent: '#3b82f6', cardIds: [] },
  { id: 'review', title: 'Review', accent: '#a855f7', cardIds: [] },
  { id: 'done', title: 'Done', accent: '#22c55e', cardIds: [] },
]

const baseCard: Card = {
  id: 'KB-1',
  title: 'Set up CI pipeline',
  description: 'Run lint and tests on every PR.',
  labels: ['devops'],
  assigneeId: 'marcus',
}

// jsdom does not implement HTMLDialogElement#showModal / #close.
const originalShowModal = HTMLDialogElement.prototype.showModal
const originalClose = HTMLDialogElement.prototype.close

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

afterAll(() => {
  HTMLDialogElement.prototype.showModal = originalShowModal
  HTMLDialogElement.prototype.close = originalClose
})

function renderModal(
  props: {
    card?: Partial<Card>
    columnId?: ColumnId
    creating?: boolean
  } = {},
) {
  const onSave = vi.fn()
  const onDelete = vi.fn()
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(
    <CardModal
      card={{ ...baseCard, ...props.card }}
      columnId={props.columnId ?? 'backlog'}
      columns={columns}
      creating={props.creating}
      onSave={onSave}
      onDelete={onDelete}
      onClose={onClose}
    />,
  )
  return { user, onSave, onDelete, onClose }
}

const titleInput = () => screen.getByRole('textbox', { name: 'Title' })
const descriptionInput = () =>
  screen.getByRole('textbox', { name: 'Description' })
const statusSelect = () => screen.getByRole('combobox', { name: 'Status' })
const assigneeSelect = () => screen.getByRole('combobox', { name: 'Assignee' })
const labelButton = (name: string) => screen.getByRole('button', { name })

describe('CardModal', () => {
  describe('rendering an existing issue', () => {
    it('shows a dialog labelled by the card id', () => {
      renderModal()
      expect(screen.getByRole('dialog', { name: 'KB-1' })).toBeInTheDocument()
    })

    it('prefills the form from the card and column', () => {
      renderModal({ columnId: 'review' })
      expect(titleInput()).toHaveValue('Set up CI pipeline')
      expect(descriptionInput()).toHaveValue('Run lint and tests on every PR.')
      expect(statusSelect()).toHaveValue('review')
      expect(assigneeSelect()).toHaveValue('marcus')
    })

    it('autofocuses the title input', () => {
      renderModal()
      expect(titleInput()).toHaveFocus()
    })

    it('lists every column as a status option', () => {
      renderModal()
      const options = within(statusSelect()).getAllByRole('option')
      expect(options.map((option) => option.textContent)).toEqual([
        'Backlog',
        'In Progress',
        'Review',
        'Done',
      ])
    })

    it('lists an Unassigned option followed by all assignees', () => {
      renderModal()
      const options = within(assigneeSelect()).getAllByRole('option')
      expect(options.map((option) => option.textContent)).toEqual([
        'Unassigned',
        'Ava Chen',
        'Marcus Reed',
        'Priya Patel',
        'Leo Martins',
        'Sofia Novak',
      ])
    })

    it('shows the Unassigned option when the card has no assignee', () => {
      renderModal({ card: { assigneeId: null } })
      expect(assigneeSelect()).toHaveValue('')
      expect(
        within(assigneeSelect()).getByRole('option', { name: 'Unassigned' }),
      ).toHaveProperty('selected', true)
    })

    it('marks only the card labels as pressed', () => {
      renderModal({ card: { labels: ['bug', 'urgent'] } })
      expect(labelButton('Bug')).toHaveAttribute('aria-pressed', 'true')
      expect(labelButton('Urgent')).toHaveAttribute('aria-pressed', 'true')
      for (const name of ['Feature', 'Design', 'Docs', 'DevOps'])
        expect(labelButton(name)).toHaveAttribute('aria-pressed', 'false')
    })

    it('shows the delete button and "Save changes" submit label', () => {
      renderModal()
      expect(
        screen.getByRole('button', { name: 'Delete issue' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /save changes/i }),
      ).toBeEnabled()
      expect(
        screen.queryByText('Good work starts with a clear issue.'),
      ).not.toBeInTheDocument()
    })
  })

  describe('creating a new issue', () => {
    it('titles the dialog "New issue" and shows the hint instead of delete', () => {
      renderModal({
        creating: true,
        card: { id: 'KB-10', title: '', description: '', labels: [] },
      })
      expect(
        screen.getByRole('dialog', { name: 'New issue' }),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Good work starts with a clear issue.'),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Delete issue' }),
      ).not.toBeInTheDocument()
    })

    it('disables "Create issue" until a non-blank title is entered', async () => {
      const { user } = renderModal({
        creating: true,
        card: { id: 'KB-10', title: '', description: '', labels: [] },
      })
      const submit = screen.getByRole('button', { name: /create issue/i })
      expect(submit).toBeDisabled()
      await user.type(titleInput(), '   ')
      expect(submit).toBeDisabled()
      await user.type(titleInput(), 'Ship it')
      expect(submit).toBeEnabled()
    })

    it('creates the issue with the entered values', async () => {
      const { user, onSave, onClose } = renderModal({
        creating: true,
        card: {
          id: 'KB-10',
          title: '',
          description: '',
          labels: [],
          assigneeId: null,
        },
        columnId: 'in-progress',
      })
      await user.type(titleInput(), 'Write onboarding docs')
      await user.type(descriptionInput(), 'Cover local setup.')
      await user.click(labelButton('Docs'))
      await user.selectOptions(assigneeSelect(), 'Priya Patel')
      await user.click(screen.getByRole('button', { name: /create issue/i }))

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith(
        {
          title: 'Write onboarding docs',
          description: 'Cover local setup.',
          labels: ['docs'],
          assigneeId: 'priya',
        },
        'in-progress',
      )
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('saving', () => {
    it('saves unchanged values with the original column', async () => {
      const { user, onSave, onClose } = renderModal()
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(
        {
          title: 'Set up CI pipeline',
          description: 'Run lint and tests on every PR.',
          labels: ['devops'],
          assigneeId: 'marcus',
        },
        'backlog',
      )
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onSave.mock.invocationCallOrder[0]).toBeLessThan(
        onClose.mock.invocationCallOrder[0],
      )
    })

    it('trims the title and description before saving', async () => {
      const { user, onSave } = renderModal()
      await user.clear(titleInput())
      await user.type(titleInput(), '  Padded title  ')
      await user.clear(descriptionInput())
      await user.type(descriptionInput(), '\n  Padded body \n')
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Padded title',
          description: 'Padded body',
        }),
        'backlog',
      )
    })

    it('saves the newly selected status as the target column', async () => {
      const { user, onSave } = renderModal()
      await user.selectOptions(statusSelect(), 'Done')
      expect(statusSelect()).toHaveValue('done')
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(expect.any(Object), 'done')
    })

    it('ignores a status value that matches no column', () => {
      renderModal({ columnId: 'review' })
      fireEvent.change(statusSelect(), { target: { value: 'archived' } })
      expect(statusSelect()).toHaveValue('review')
    })

    it('saves a cleared assignee as null', async () => {
      const { user, onSave } = renderModal()
      await user.selectOptions(assigneeSelect(), 'Unassigned')
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ assigneeId: null }),
        'backlog',
      )
    })

    it('toggles labels on and off, preserving selection order', async () => {
      const { user, onSave } = renderModal({ card: { labels: ['devops'] } })
      await user.click(labelButton('Urgent'))
      await user.click(labelButton('Bug'))
      await user.click(labelButton('DevOps'))
      expect(labelButton('Urgent')).toHaveAttribute('aria-pressed', 'true')
      expect(labelButton('Bug')).toHaveAttribute('aria-pressed', 'true')
      expect(labelButton('DevOps')).toHaveAttribute('aria-pressed', 'false')
      await user.click(screen.getByRole('button', { name: /save changes/i }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ labels: ['urgent', 'bug'] }),
        'backlog',
      )
    })

    it('does not mutate the labels array of the original card', async () => {
      const labels: Card['labels'] = ['devops']
      const { user } = renderModal({ card: { labels } })
      await user.click(labelButton('Bug'))
      await user.click(labelButton('DevOps'))
      expect(labels).toEqual(['devops'])
    })

    it('submits on Enter in the title input', async () => {
      const { user, onSave, onClose } = renderModal()
      await user.type(titleInput(), '!{Enter}')
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Set up CI pipeline!' }),
        'backlog',
      )
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('blocks saving when the title is cleared', async () => {
      const { user, onSave } = renderModal()
      await user.clear(titleInput())
      expect(
        screen.getByRole('button', { name: /save changes/i }),
      ).toBeDisabled()
      await user.type(titleInput(), '{Enter}')
      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('keyboard shortcuts', () => {
    it.each([
      ['Ctrl', '{Control>}{Enter}{/Control}'],
      ['Meta', '{Meta>}{Enter}{/Meta}'],
    ])('%s+Enter in the description submits the form', async (_, keys) => {
      const { user, onSave, onClose } = renderModal()
      await user.click(descriptionInput())
      await user.keyboard(keys)
      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Run lint and tests on every PR.',
        }),
        'backlog',
      )
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('plain Enter in the description inserts a newline without saving', async () => {
      const { user, onSave } = renderModal({ card: { description: 'Line 1' } })
      await user.click(descriptionInput())
      await user.keyboard('{Enter}Line 2')
      expect(descriptionInput()).toHaveValue('Line 1\nLine 2')
      expect(onSave).not.toHaveBeenCalled()
    })

    it('Ctrl+Enter does not save a whitespace-only title', async () => {
      const { user, onSave, onClose } = renderModal({ card: { title: '   ' } })
      await user.click(descriptionInput())
      await user.keyboard('{Control>}{Enter}{/Control}')
      expect(onSave).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('Escape (dialog cancel) closes without saving', () => {
      const { onSave, onClose } = renderModal()
      fireEvent(screen.getByRole('dialog'), new Event('cancel'))
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('closing', () => {
    it.each(['Close', 'Cancel'])(
      'the %s button closes without saving',
      async (name) => {
        const { user, onSave, onClose, onDelete } = renderModal()
        await user.type(titleInput(), ' edited')
        await user.click(screen.getByRole('button', { name }))
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(onSave).not.toHaveBeenCalled()
        expect(onDelete).not.toHaveBeenCalled()
      },
    )
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

    it('calls onDelete after confirming', async () => {
      const { user, onDelete, onSave, onClose } = renderModal()
      await user.click(screen.getByRole('button', { name: 'Delete issue' }))
      await user.click(screen.getByRole('button', { name: 'Delete issue' }))
      expect(onDelete).toHaveBeenCalledTimes(1)
      expect(onSave).not.toHaveBeenCalled()
      expect(onClose).not.toHaveBeenCalled()
    })

    it('returns to the delete icon when confirmation is cancelled', async () => {
      const { user, onDelete } = renderModal()
      await user.click(screen.getByRole('button', { name: 'Delete issue' }))
      await user.click(screen.getByRole('button', { name: 'Cancel deletion' }))
      expect(screen.queryByText('Delete this issue?')).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Delete issue' }),
      ).toHaveAttribute('title', 'Delete issue')
      expect(onDelete).not.toHaveBeenCalled()
    })
  })
})
