export const DESCRIPTION_LIMIT = 280

/** Counts characters by code point so emoji count once. */
export function countCharacters(text: string): number {
  return Array.from(text).length
}

export function isOverDescriptionLimit(text: string): boolean {
  return countCharacters(text) > DESCRIPTION_LIMIT
}
