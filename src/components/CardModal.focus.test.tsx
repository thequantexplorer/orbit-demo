import { isValidElement, type ReactNode, type RefObject } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CardModal } from './CardModal'

const hooks = vi.hoisted(() => ({
  values: [] as unknown[],
  index: 0,
  effects: [] as (() => void)[],
}))

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = hooks.index++
    if (!(index in hooks.values)) hooks.values[index] = initial
    return [hooks.values[index], (value: unknown) => {
      hooks.values[index] = typeof value === 'function'
        ? value(hooks.values[index])
        : value
    }]
  },
  useRef: (initial: unknown) => {
    const index = hooks.index++
    if (!(index in hooks.values)) hooks.values[index] = { current: initial }
    return hooks.values[index]
  },
  useLayoutEffect: (effect: () => void) => hooks.effects.push(effect),
}))

type ControlProps = {
  children?: ReactNode
  ref?: RefObject<{ focus: () => void } | null>
  'aria-label'?: string
  className?: string
  onClick?: () => void
}

function controls(node: ReactNode): ControlProps[] {
  if (Array.isArray(node)) return node.flatMap(controls)
  if (!isValidElement<ControlProps>(node)) return []
  return [
    ...(node.type === 'button' ? [node.props] : []),
    ...controls(node.props.children),
  ]
}

function harness(creating = false) {
  const props = {
    card: {
      id: 'KB-1', title: 'Accessible issue', description: '', labels: [],
      assigneeId: null, dueDate: null,
    },
    columnId: 'backlog' as const,
    columns: [],
    creating,
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
  }
  const triggerFocus = vi.fn()
  const cancellationFocus = vi.fn()
  let buttons: ControlProps[] = []

  function render() {
    hooks.index = 0
    hooks.effects = []
    for (const button of buttons) {
      if (button.ref) button.ref.current = null
    }
    buttons = controls(CardModal(props))
    for (const button of buttons) {
      if (button.ref) button.ref.current = {
        focus: button['aria-label'] === 'Cancel deletion'
          ? cancellationFocus
          : triggerFocus,
      }
    }
    for (const effect of hooks.effects) effect()
  }

  function click(label: string) {
    const button = buttons.find((entry) => entry['aria-label'] === label)
    expect(button?.onClick).toBeTypeOf('function')
    button?.onClick?.()
    render()
  }

  return {
    render, click, triggerFocus, cancellationFocus, props,
    buttons: () => buttons,
  }
}

describe('CardModal deletion-confirmation focus transitions (mocked commit lifecycle)', () => {
  beforeEach(() => {
    hooks.values = []
    hooks.index = 0
    hooks.effects = []
  })

  it.each([false, true])('does not steal Dialog entry focus (creating: %s)', (creating) => {
    const modal = harness(creating)
    modal.render()
    modal.render()
    expect(modal.triggerFocus).not.toHaveBeenCalled()
    expect(modal.cancellationFocus).not.toHaveBeenCalled()
  })

  it('focuses the non-destructive Cancel deletion control on reveal', () => {
    const modal = harness()
    modal.render()
    modal.click('Delete issue')
    expect(modal.cancellationFocus).toHaveBeenCalledExactlyOnceWith()
    expect(modal.triggerFocus).not.toHaveBeenCalled()
    expect(modal.props.onDelete).not.toHaveBeenCalled()
  })

  it('restores focus to the remounted delete trigger after cancellation', () => {
    const modal = harness()
    modal.render()
    modal.click('Delete issue')
    modal.click('Cancel deletion')
    expect(modal.triggerFocus).toHaveBeenCalledExactlyOnceWith()
    expect(modal.cancellationFocus).toHaveBeenCalledExactlyOnceWith()
    expect(modal.props.onDelete).not.toHaveBeenCalled()
  })

  it('does not refocus controls on unrelated rerenders or effect replay', () => {
    const modal = harness()
    modal.render()
    modal.click('Delete issue')
    modal.render()
    for (const effect of hooks.effects) effect()
    expect(modal.cancellationFocus).toHaveBeenCalledTimes(1)
    modal.click('Cancel deletion')
    modal.render()
    expect(modal.triggerFocus).toHaveBeenCalledTimes(1)
  })

  it('supports repeated reveal/cancel cycles and retains explicit deletion', () => {
    const modal = harness()
    modal.render()
    for (let attempt = 0; attempt < 2; attempt++) {
      modal.click('Delete issue')
      modal.click('Cancel deletion')
    }
    expect(modal.triggerFocus).toHaveBeenCalledTimes(2)
    expect(modal.cancellationFocus).toHaveBeenCalledTimes(2)
    modal.click('Delete issue')
    const confirm = modal.buttons().find((button) =>
      button.className?.includes('button--danger'),
    )
    expect(confirm?.ref).toBeUndefined()
    confirm?.onClick?.()
    expect(modal.props.onDelete).toHaveBeenCalledTimes(1)
  })
})
