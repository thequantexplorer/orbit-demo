import type { ColumnId } from './types'

// Collapsing swaps the header for a rail (and back), so move focus to the
// toggle that replaces the one just clicked.
export function focusCollapseToggle(columnId: ColumnId) {
  requestAnimationFrame(() =>
    document
      .querySelector<HTMLElement>(
        `[data-collapse-toggle="${CSS.escape(columnId)}"]`,
      )
      ?.focus(),
  )
}
