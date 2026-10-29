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

// Collapsed rails are not drop targets, so a drop on one cancels the drag.
export function isPointOverCollapsedRail(point: { x: number; y: number }) {
  return document
    .elementsFromPoint(point.x, point.y)
    .some((element) => element.closest('.column-rail'))
}
