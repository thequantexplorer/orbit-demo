import { useEffect } from 'react'
import { Icon } from './Icon'

export interface ToastState {
  message: string
  action?: { label: string; onClick: () => void }
}

export const TOAST_DURATION_MS = 3200
export const ACTION_TOAST_DURATION_MS = 5000

interface ToastProps {
  toast: ToastState
  onDismiss: () => void
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(
      onDismiss,
      toast.action ? ACTION_TOAST_DURATION_MS : TOAST_DURATION_MS,
    )
    return () => window.clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <div className="toast" role="status">
      <Icon name="circleCheck" size={17} />
      <span>{toast.message}</span>
      {toast.action && (
        <button
          className="toast-action"
          onClick={() => {
            toast.action?.onClick()
            onDismiss()
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        className="icon-button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  )
}
