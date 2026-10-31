export const TITLE_MAX_LENGTH = 80

/** Length of the title as saved (trimmed), counted in characters. */
export function titleLength(title: string): number {
  return [...title.trim()].length
}

export function isTitleTooLong(title: string): boolean {
  return titleLength(title) > TITLE_MAX_LENGTH
}

/** True when the title is non-empty and fits the limit. */
export function isTitleValid(title: string): boolean {
  const length = titleLength(title)
  return length > 0 && length <= TITLE_MAX_LENGTH
}
