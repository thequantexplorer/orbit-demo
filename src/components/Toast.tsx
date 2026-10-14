import { useEffect, useEffectEvent } from 'react'
import { Icon } from './Icon'

interface ToastProps {
  message: string
  onDismiss: () => void
  tone?: 'success' | 'error'
  className?: string
}

export function Toast({
  message,
  onDismiss,
  tone = 'success',
  className = '',
}: ToastProps) {
  const dismiss = useEffectEvent(onDismiss)

  useEffect(() => {
    const timer = window.setTimeout(dismiss, 3200)
    return () => window.clearTimeout(timer)
  }, [message])

  return (
    <div className={`toast toast--${tone} ${className}`} role="status">
      <Icon name={tone === 'error' ? 'alert' : 'circleCheck'} size={17} />
      <span>{message}</span>
      <button
        type="button"
        className="icon-button"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  )
}
