import type { Comment } from './types'

export const COMMENT_MAX_LENGTH = 2000

export function createComment(
  authorId: string,
  body: string,
  now: Date = new Date(),
): Comment {
  return {
    id: createCommentId(),
    authorId,
    body: body.trim(),
    createdAt: now.toISOString(),
  }
}

function createCommentId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return `c-${crypto.randomUUID()}`
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function isValidComment(value: unknown): value is Comment {
  if (typeof value !== 'object' || value === null) return false
  const comment = value as Partial<Comment>
  return (
    typeof comment.id === 'string' &&
    comment.id !== '' &&
    typeof comment.authorId === 'string' &&
    comment.authorId !== '' &&
    typeof comment.body === 'string' &&
    comment.body.trim() !== '' &&
    typeof comment.createdAt === 'string' &&
    !Number.isNaN(Date.parse(comment.createdAt))
  )
}

/** Short relative time: "just now", "5m ago", "3h ago", "2d ago", then "Oct 12". */
export function formatCommentTime(createdAt: string, now: Date): string {
  const date = new Date(createdAt)
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  })
}
