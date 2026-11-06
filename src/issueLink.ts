const ISSUE_PARAM = 'issue'

/** Shareable URL that opens `cardId` in the issue modal, keeping other params. */
export function issueLink(cardId: string, href: string): string {
  const url = new URL(href)
  url.searchParams.set(ISSUE_PARAM, cardId)
  url.hash = ''
  return url.toString()
}

/** Issue ID from an `?issue=ID` query string, or null when absent/empty. */
export function parseIssueParam(search: string): string | null {
  return new URLSearchParams(search).get(ISSUE_PARAM)?.trim() || null
}

/** `href` without the `issue` param, or null when it has none. */
export function withoutIssueParam(href: string): string | null {
  const url = new URL(href)
  if (!url.searchParams.has(ISSUE_PARAM)) return null
  url.searchParams.delete(ISSUE_PARAM)
  return url.toString()
}
