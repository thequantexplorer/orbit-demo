import { useRef, useState } from 'react'
import type { Card } from '../types'
import { Dialog } from './Dialog'
import { Icon } from './Icon'

interface CommandMenuProps {
  cards: Card[]
  onOpen: (id: string) => void
  onCreate: () => void
  onTheme: () => void
  onClose: () => void
}

export function CommandMenu({
  cards,
  onOpen,
  onCreate,
  onTheme,
  onClose,
}: CommandMenuProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const itemsRef = useRef<HTMLDivElement>(null)
  const matches = cards.filter((card) =>
    `${card.id} ${card.title} ${card.description}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  const actions = [
    { id: 'create', title: 'Create a new issue', run: onCreate },
    { id: 'theme', title: 'Toggle appearance', run: onTheme },
  ].filter((action) => action.title.toLowerCase().includes(query.toLowerCase()))
  const items = [
    ...actions,
    ...matches.map((card) => ({
      id: card.id,
      title: card.title,
      run: () => onOpen(card.id),
    })),
  ]

  function execute(index: number) {
    const item = items[index]
    if (!item) return
    onClose()
    item.run()
  }

  return (
    <Dialog
      className="command-dialog"
      labelledBy="command-title"
      onClose={onClose}
    >
      <h2 id="command-title" className="visually-hidden">
        Search issues and commands
      </h2>
      <div className="command-input">
        <Icon name="search" size={20} />
        <input
          data-autofocus
          placeholder="Search issues or type a command…"
          aria-label="Search issues and commands"
          role="combobox"
          aria-controls="command-results"
          aria-expanded="true"
          aria-activedescendant={
            items[selected] ? `command-${items[selected].id}` : undefined
          }
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setSelected(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              execute(selected)
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              const next = Math.max(
                0,
                Math.min(
                  items.length - 1,
                  selected + (event.key === 'ArrowDown' ? 1 : -1),
                ),
              )
              setSelected(next)
              itemsRef.current?.children[next]?.scrollIntoView({
                block: 'nearest',
              })
            }
          }}
        />
        <button className="key-button" onClick={onClose}>
          esc
        </button>
      </div>
      <div className="command-section-label">
        {query
          ? `${items.length} ${items.length === 1 ? 'result' : 'results'}`
          : 'Quick actions & issues'}
      </div>
      <div
        ref={itemsRef}
        className="command-results"
        id="command-results"
        role="listbox"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            id={`command-${item.id}`}
            role="option"
            aria-selected={selected === index}
            tabIndex={-1}
            className={`command-result${selected === index ? ' command-result--selected' : ''}`}
            onMouseMove={() => setSelected(index)}
            onClick={() => execute(index)}
          >
            <Icon
              name={
                item.id === 'create'
                  ? 'plus'
                  : item.id === 'theme'
                    ? 'sun'
                    : 'circleCheck'
              }
            />
            <span>{item.title}</span>
            <small>{item.id.startsWith('KB-') ? item.id : 'Action'}</small>
            {selected === index && <span className="command-enter">↵</span>}
          </button>
        ))}
        {items.length === 0 && (
          <div className="command-empty">
            <Icon name="search" size={24} />
            <strong>No results found</strong>
            <p>Try another title, issue ID, or command.</p>
          </div>
        )}
      </div>
      <footer className="command-footer">
        <span>
          <kbd>↑</kbd>
          <kbd>↓</kbd> to navigate
        </span>
        <span>
          <kbd>↵</kbd> to open
        </span>
        <span>
          <kbd>esc</kbd> to close
        </span>
      </footer>
    </Dialog>
  )
}
