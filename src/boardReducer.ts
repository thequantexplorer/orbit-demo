import { arrayMove } from '@dnd-kit/sortable'
import type { BoardState, Card, ColumnId, CompletionRecord } from './types'
import { createSeedBoard } from './data'
import { ARCHIVE_RETENTION_DAYS } from './weeklyStats'

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
  | { type: 'reset' }
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
      const existingCard = board.cards[action.cardId]
      let cards = board.cards
      if (
        existingCard &&
        fromColumn !== action.toColumn &&
        (fromColumn === 'done' || action.toColumn === 'done')
      ) {
        cards = {
          ...board.cards,
          [action.cardId]: {
            ...existingCard,
            completedAt:
              action.toColumn === 'done'
                ? Date.now()
                : null,
          },
        }
      }
      return {
        ...board,
        cards,
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
      const now = Date.now()
      const card: Card = {
        id,
        title,
        description: '',
        labels: [],
        assigneeId: null,
        dueDate: null,
        ...action.details,
        createdAt: now,
        completedAt: action.columnId === 'done' ? now : null,
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
      if (!target) return board
      const removed = new Set(target.cardIds)
      const archived = target.cardIds.flatMap((id): CompletionRecord[] => {
        const card = board.cards[id]
        return card && card.completedAt !== null
          ? [{ id, createdAt: card.createdAt, completedAt: card.completedAt }]
          : []
      })
      const cutoff =
        Date.now() - ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000
      const archivedCompletions = [...board.archivedCompletions, ...archived]
        .filter((record) => record.completedAt >= cutoff)
      if (
        target.cardIds.length === 0 &&
        archivedCompletions.length === board.archivedCompletions.length
      )
        return board
      return {
        ...board,
        cards: Object.fromEntries(
          Object.entries(board.cards).filter(([id]) => !removed.has(id)),
        ),
        columns: board.columns.map((column) =>
          column.id === action.columnId ? { ...column, cardIds: [] } : column,
        ),
        archivedCompletions,
      }
    }
    case 'reset':
      return createSeedBoard()
    case 'restore':
      return action.board
  }
}
