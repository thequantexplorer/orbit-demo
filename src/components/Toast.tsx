import { Icon } from './Icon'

export function Toast({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  return (
    <div className="toast" role="status">
      <Icon name="circleCheck" size={17} />
      <span>{message}</span>
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
