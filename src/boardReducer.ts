import { arrayMove } from '@dnd-kit/sortable'
import type { BoardState, Card, ColumnId, DayActivity } from './types'
import { createSeedBoard } from './data'
import { toDateKey } from './dueDate'
import { addDays } from './weeklyStats'

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

function recordActivity(
  history: BoardState['history'],
  day: string,
  changes: Partial<DayActivity>,
): BoardState['history'] {
  const oldestDay = addDays(day, -55)
  const nextHistory = Object.fromEntries(
    Object.entries(history).filter(([key]) => key >= oldestDay),
  )
  const current = history[day] ?? {
    added: 0,
    completed: 0,
    reopened: 0,
    removed: 0,
  }
  nextHistory[day] = {
    added: current.added + (changes.added ?? 0),
    completed: current.completed + (changes.completed ?? 0),
    reopened: current.reopened + (changes.reopened ?? 0),
    removed: current.removed + (changes.removed ?? 0),
  }
  return nextHistory
}

export function boardReducer(
  board: BoardState,
  action: BoardAction,
): BoardState {
  switch (action.type) {
    case 'move-card': {
      const fromColumn = findColumnOfCard(board, action.cardId)
      if (!fromColumn) return board
      let history = board.history
      if (fromColumn !== action.toColumn) {
        if (fromColumn !== 'done' && action.toColumn === 'done') {
          history = recordActivity(board.history, toDateKey(new Date()), {
            completed: 1,
          })
        } else if (fromColumn === 'done' && action.toColumn !== 'done') {
          history = recordActivity(board.history, toDateKey(new Date()), {
            reopened: 1,
          })
        }
      }
      return {
        ...board,
        history,
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
        history: recordActivity(board.history, toDateKey(new Date()), {
          added: 1,
          ...(action.columnId === 'done' ? { completed: 1 } : {}),
        }),
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
      const columnId = findColumnOfCard(board, action.cardId)
      const { [action.cardId]: _removed, ...cards } = board.cards
      return {
        ...board,
        history:
          board.cards[action.cardId] && columnId && columnId !== 'done'
            ? recordActivity(board.history, toDateKey(new Date()), {
                removed: 1,
              })
            : board.history,
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
        history:
          action.columnId === 'done'
            ? board.history
            : recordActivity(board.history, toDateKey(new Date()), {
                removed: target.cardIds.length,
              }),
        cards: Object.fromEntries(
          Object.entries(board.cards).filter(([id]) => !removed.has(id)),
        ),
        columns: board.columns.map((column) =>
          column.id === action.columnId ? { ...column, cardIds: [] } : column,
        ),
      }
    }
    case 'reset':
      return createSeedBoard()
    case 'restore':
      return action.board
  }
}
