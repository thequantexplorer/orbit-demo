import { Icon } from './Icon'

interface ColumnMenuProps {
  columnTitle: string
  onSortByPriority: () => void
}

export function ColumnMenu({ columnTitle, onSortByPriority }: ColumnMenuProps) {
  return (
    <details
      className="popover popover--right column__menu"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          event.currentTarget.open = false
      }}
    >
      <summary
        className="icon-button column__menu-button"
        aria-label={`${columnTitle} column options`}
        title="Column options"
      >
        <Icon name="more" size={15} />
      </summary>
      <div className="popover-panel column__menu-panel">
        <button
          className="menu-item"
          onClick={(event) => {
            const details = event.currentTarget.closest('details')
            if (details) details.open = false
            onSortByPriority()
          }}
        >
          <Icon name="signal" size={13} />
          <span>Sort by priority</span>
        </button>
      </div>
    </details>
  )
}
