import { useEffect, useState } from 'react'
import { issueLink } from '../issueLink'
import { Icon } from './Icon'

type CopyState = 'idle' | 'copied' | 'failed'

const LABELS: Record<CopyState, string> = {
  idle: 'Copy link',
  copied: 'Copied',
  failed: "Couldn't copy",
}

export function CopyLinkButton({ cardId }: { cardId: string }) {
  const [state, setState] = useState<CopyState>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const timer = window.setTimeout(() => setState('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [state])

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        issueLink(cardId, window.location.href),
      )
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  return (
    <button
      type="button"
      className={`copy-link-button copy-link-button--${state}`}
      onClick={copy}
      title={`Copy link to ${cardId}`}
    >
      <Icon name={state === 'copied' ? 'check' : 'link'} size={14} />
      <span aria-live="polite">{LABELS[state]}</span>
    </button>
  )
}
