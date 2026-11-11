import { Icon } from './Icon'

export interface ToastMessage {
  message: string
  detail?: string
  shipped?: boolean
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage
  onDismiss: () => void
}) {
  return (
    <div
      className={`toast${toast.shipped ? ' toast--shipped' : ''}`}
      role="status"
    >
      <Icon name={toast.shipped ? 'sparkle' : 'circleCheck'} size={17} />
      <span className="toast-message">{toast.message}</span>
      {toast.detail && <span className="toast-detail">{toast.detail}</span>}
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
