/** Fibonacci estimate scale shared with orbit-api's `story_points`. */
export const STORY_POINT_OPTIONS = [1, 2, 3, 5, 8, 13] as const

export function isValidStoryPoints(value: unknown): value is number {
  return STORY_POINT_OPTIONS.some((option) => option === value)
}

export function formatStoryPoints(points: number): string {
  return `${points} ${points === 1 ? 'point' : 'points'}`
}
