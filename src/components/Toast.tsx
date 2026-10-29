import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { isUndoShortcut } from '../deletedCard'
import { Icon } from './Icon'

interface ToastProps {
  message: string
  /** Auto-dismiss delay; hovering or focusing the toast pauses it. */
  duration: number
  onDismiss: () => void
  /** Shows an Undo button and enables Ctrl/Cmd+Z while visible. */
  onUndo?: () => void
}

/** Render with a fresh `key` per notification so the countdown restarts. */
export function Toast({ message, duration, onDismiss, onUndo }: ToastProps) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const remaining = useRef(duration)
  const paused = hovered || focused
  const dismiss = useEffectEvent(onDismiss)
  const undoFromKeyboard = useEffectEvent((event: KeyboardEvent) => {
    if (!onUndo || event.defaultPrevented) return
    if (document.querySelector('dialog[open]')) return
    const target = event.target
    const editing =
      target instanceof HTMLElement &&
      (target.matches('input, textarea, select') || target.isContentEditable)
    if (!isUndoShortcut(event, editing)) return
    event.preventDefault()
    onUndo()
  })

  useEffect(() => {
    if (paused) return
    const started = Date.now()
    const timer = window.setTimeout(dismiss, remaining.current)
    return () => {
      window.clearTimeout(timer)
      remaining.current -= Date.now() - started
    }
  }, [paused])

  const undoable = Boolean(onUndo)
  useEffect(() => {
    if (!undoable) return
    document.addEventListener('keydown', undoFromKeyboard)
    return () => document.removeEventListener('keydown', undoFromKeyboard)
  }, [undoable])

  return (
    <div
      className={`toast${onUndo ? ' toast--undo' : ''}`}
      role="status"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setFocused(false)
      }}
    >
      <Icon name={onUndo ? 'trash' : 'circleCheck'} size={17} />
      <span className="toast__message">{message}</span>
      {onUndo && (
        <button className="toast__undo" onClick={onUndo}>
          Undo
        </button>
      )}
      <button
        className="icon-button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <Icon name="close" size={13} />
      </button>
      {onUndo && (
        <span
          className="toast__countdown"
          aria-hidden="true"
          style={{
            animationDuration: `${duration}ms`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      )}
    </div>
  )
}
