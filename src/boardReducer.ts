import { arrayMove } from '@dnd-kit/sortable'
import type { BoardState, Card, ColumnId } from './types'
import { createSeedBoard } from './data'
import { isValidWipLimit } from './wipLimit'

export type BoardAction =
  | { type: 'move-card'; cardId: string; toColumn: ColumnId; toIndex: number }
  | {
      type: 'reorder-card'
      columnId: ColumnId
      fromIndex: number
      toIndex: number
    }
  | {
      type: 'add-card'
      columnId: ColumnId
      title: string
      details?: Partial<Pick<Card, 'description' | 'labels' | 'assigneeId' | 'dueDate'>>
    }
  | { type: 'update-card'; cardId: string; patch: Partial<Omit<Card, 'id'>> }
  | { type: 'delete-card'; cardId: string }
  | { type: 'clear-column'; columnId: ColumnId }
  | { type: 'set-wip-limit'; columnId: ColumnId; limit: number | null }
  | { type: 'reset' }
  | { type: 'cancel-drag'; snapshot: BoardState }
  | { type: 'restore'; board: BoardState }

export function findColumnOfCard(
  board: BoardState,
  cardId: string,
): ColumnId | undefined {
  return board.columns.find((column) => column.cardIds.includes(cardId))?.id
}

export function boardReducer(
  board: BoardState,
  action: BoardAction,
): BoardState {
  switch (action.type) {
    case 'move-card': {
      const fromColumn = findColumnOfCard(board, action.cardId)
      if (!fromColumn) return board
      return {
        ...board,
        columns: board.columns.map((column) => {
          if (column.id === fromColumn && column.id === action.toColumn) {
            const fromIndex = column.cardIds.indexOf(action.cardId)
            return {
              ...column,
              cardIds: arrayMove(column.cardIds, fromIndex, action.toIndex),
            }
          }
          if (column.id === fromColumn) {
            return {
              ...column,
              cardIds: column.cardIds.filter((id) => id !== action.cardId),
            }
          }
          if (column.id === action.toColumn) {
            const cardIds = [...column.cardIds]
            cardIds.splice(action.toIndex, 0, action.cardId)
            return { ...column, cardIds }
          }
          return column
        }),
      }
    }
    case 'reorder-card':
      return {
        ...board,
        columns: board.columns.map((column) =>
          column.id === action.columnId
            ? {
                ...column,
                cardIds: arrayMove(
                  column.cardIds,
                  action.fromIndex,
                  action.toIndex,
                ),
              }
            : column,
        ),
      }
    case 'add-card': {
      const title = action.title.trim()
      if (!title) return board
      const id = `KB-${board.nextCardNumber}`
      const card: Card = {
        id,
        title,
        description: '',
        labels: [],
        assigneeId: null,
        dueDate: null,
        ...action.details,
      }
      return {
        ...board,
        nextCardNumber: board.nextCardNumber + 1,
        cards: { ...board.cards, [id]: card },
        columns: board.columns.map((column) =>
          column.id === action.columnId
            ? { ...column, cardIds: [...column.cardIds, id] }
            : column,
        ),
      }
    }
    case 'update-card': {
      const existing = board.cards[action.cardId]
      if (!existing) return board
      return {
        ...board,
        cards: {
          ...board.cards,
          [action.cardId]: { ...existing, ...action.patch },
        },
      }
    }
    case 'delete-card': {
      const { [action.cardId]: _removed, ...cards } = board.cards
      return {
        ...board,
        cards,
        columns: board.columns.map((column) => ({
          ...column,
          cardIds: column.cardIds.filter((id) => id !== action.cardId),
        })),
      }
    }
    case 'clear-column': {
      const target = board.columns.find(
        (column) => column.id === action.columnId,
      )
      if (!target || target.cardIds.length === 0) return board
      const removed = new Set(target.cardIds)
      return {
        ...board,
        cards: Object.fromEntries(
          Object.entries(board.cards).filter(([id]) => !removed.has(id)),
        ),
        columns: board.columns.map((column) =>
          column.id === action.columnId ? { ...column, cardIds: [] } : column,
        ),
      }
    }
    case 'set-wip-limit': {
      if (action.limit !== null && !isValidWipLimit(action.limit)) return board
      if (!board.columns.some((column) => column.id === action.columnId))
        return board
      return {
        ...board,
        columns: board.columns.map((column) =>
          column.id === action.columnId
            ? { ...column, wipLimit: action.limit }
            : column,
        ),
      }
    }
    case 'reset':
      return createSeedBoard()
    case 'cancel-drag':
      return {
        ...action.snapshot,
        columns: action.snapshot.columns.map((column) => {
          const currentColumn = board.columns.find(
            (current) => current.id === column.id,
          )
          return currentColumn
            ? { ...column, wipLimit: currentColumn.wipLimit }
            : column
        }),
      }
    case 'restore':
      return action.board
  }
}
