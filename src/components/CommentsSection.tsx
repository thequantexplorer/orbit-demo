import { useEffect, useState, type KeyboardEvent } from 'react'
import { COMMENT_MAX_LENGTH, createComment, formatCommentTime } from '../comments'
import { ASSIGNEES, CURRENT_USER_ID } from '../data'
import type { Comment } from '../types'
import { Avatar } from './Avatar'
import { Icon } from './Icon'

interface CommentsSectionProps {
  comments: Comment[]
  onAdd: (comment: Comment) => void
  onDelete: (commentId: string) => void
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

export function CommentsSection({
  comments,
  onAdd,
  onDelete,
}: CommentsSectionProps) {
  const [draft, setDraft] = useState('')
  const now = useNow(60_000)
  const canPost = draft.trim() !== ''

  function post() {
    if (!canPost) return
    onAdd(createComment(CURRENT_USER_ID, draft))
    setDraft('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      // Keep the issue editor's Cmd/Ctrl+Enter save from also firing.
      event.preventDefault()
      event.stopPropagation()
      post()
    }
  }

  return (
    <section className="comments" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="comments__heading">
        Comments
        {comments.length > 0 && (
          <span className="comments__count">{comments.length}</span>
        )}
      </h2>
      {comments.length > 0 && (
        <ol className="comments__list">
          {comments.map((comment) => (
            <li key={comment.id} className="comment">
              <Avatar assigneeId={comment.authorId} />
              <div className="comment__main">
                <div className="comment__meta">
                  <strong>
                    {ASSIGNEES[comment.authorId]?.name ?? 'Unknown member'}
                  </strong>
                  <time
                    dateTime={comment.createdAt}
                    title={new Date(comment.createdAt).toLocaleString()}
                  >
                    {formatCommentTime(comment.createdAt, now)}
                  </time>
                  {comment.authorId === CURRENT_USER_ID && (
                    <button
                      type="button"
                      className="icon-button comment__delete"
                      aria-label="Delete comment"
                      title="Delete comment"
                      onClick={() => onDelete(comment.id)}
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  )}
                </div>
                <p className="comment__body">{comment.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="comment-composer">
        <label htmlFor="comment-draft" className="visually-hidden">
          Add a comment
        </label>
        <textarea
          id="comment-draft"
          rows={2}
          value={draft}
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Leave a comment…"
        />
        <div className="comment-composer__actions">
          <span className="modal__hint">Ctrl/Cmd + Enter to comment</span>
          <button
            type="button"
            className="button"
            disabled={!canPost}
            onClick={post}
          >
            Comment
          </button>
        </div>
      </div>
    </section>
  )
}
