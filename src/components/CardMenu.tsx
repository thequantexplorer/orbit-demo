import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { Icon } from './Icon'

interface CardMenuProps {
  cardTitle: string
  onDuplicate: () => void
}

// Keep pointer/keyboard events away from the card's drag and open handlers.
const stop = (event: SyntheticEvent) => event.stopPropagation()

export function CardMenu({ cardTitle, onDuplicate }: CardMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    itemRef.current?.focus()
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div
      ref={rootRef}
      className={`card-menu${open ? ' card-menu--open' : ''}`}
      onPointerDown={stop}
      onClick={stop}
      onKeyDown={(event) => {
        stop(event)
        if (event.key === 'Escape' && open) close()
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="icon-button card-menu__trigger"
        aria-label={`Actions for ${cardTitle}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="more" size={14} />
      </button>
      {open && (
        <div className="card-menu__panel" role="menu">
          <button
            ref={itemRef}
            type="button"
            role="menuitem"
            className="card-menu__item"
            onClick={() => {
              onDuplicate()
              close()
            }}
          >
            <Icon name="layers" size={13} />
            Duplicate
          </button>
        </div>
      )}
    </div>
  )
}
