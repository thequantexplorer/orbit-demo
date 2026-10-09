/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandMenu } from './CommandMenu'
import type { Card } from '../types'

const state = vi.hoisted(() => ({ query: '', selected: 0 }))

vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useState: (initial: string | number) => [
    typeof initial === 'string' ? state.query : state.selected,
    vi.fn(),
  ],
}))

const cards: Card[] = [
  {
    id: 'KB-1',
    title: 'Fix login',
    description: '',
    labels: [],
    assigneeId: null,
    dueDate: null,
  },
  {
    id: 'KB-2',
    title: 'Fix search',
    description: '',
    labels: [],
    assigneeId: null,
    dueDate: null,
  },
]

function renderMenu(query = '') {
  state.query = query
  return renderToStaticMarkup(
    <CommandMenu
      cards={cards}
      onOpen={vi.fn()}
      onCreate={vi.fn()}
      onTheme={vi.fn()}
      onClose={vi.fn()}
    />,
  )
}

function status(markup: string) {
  return markup
    .match(/<div class="command-section-label"[^>]*>(.*?)<\/div>/)?.[1]
    .replace(/<[^>]*>/g, '')
}

beforeEach(() => {
  state.query = ''
  state.selected = 0
})

describe('CommandMenu status semantics', () => {
  it('keeps one polite atomic status outside the listbox', () => {
    const markup = renderMenu()
    expect(markup).toContain('role="status" aria-live="polite" aria-atomic="true"')
    expect(markup.match(/role="status"/g)).toHaveLength(1)
    expect(markup.indexOf('role="status"')).toBeLessThan(
      markup.indexOf('role="listbox"'),
    )
    expect(status(markup)).toBe('Quick actions &amp; issues 4 results')
  })

  it('reports multiple, single, zero, and cleared-query results', () => {
    expect(status(renderMenu('fix'))).toBe('2 results')
    expect(status(renderMenu('login'))).toBe('1 result')
    expect(status(renderMenu('not found'))).toBe('No results found')
    expect(status(renderMenu(''))).toBe('Quick actions &amp; issues 4 results')
  })

  it('keeps active-descendant references valid, including the empty state', () => {
    const match = renderMenu('login')
    expect(match).toContain('aria-activedescendant="command-KB-1"')
    expect(match).toContain('id="command-KB-1" role="option" aria-selected="true"')
    const empty = renderMenu('not found')
    expect(empty).not.toContain('aria-activedescendant=')
    expect(empty).not.toContain('role="option"')
    expect(empty).toContain('Try another title, issue ID, or command.')
  })
})

const globalCss = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
const localCss = readFileSync(
  new URL('./CommandMenu.a11y.css', import.meta.url),
  'utf8',
)

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => {
      const value = parseInt(channel, 16) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

describe('CommandMenu scoped contrast overrides', () => {
  it('uses selectors specific enough to override shared styles in either import order', () => {
    for (const selector of [
      '.command-input input',
      '.command-input input::placeholder',
      '.key-button',
      '.command-section-label',
      '.command-result > small',
      '.command-footer',
      '.command-footer kbd',
      '.command-empty p',
    ]) {
      const rule = localCss.match(/([^{}]+)\{([^{}]+)\}/g)?.find((block) =>
        block.split('{')[0].split(',').some(
          (entry) => entry.trim() === `.command-dialog ${selector}`,
        ),
      )
      const token = selector === '.command-input input' ? 'text' : 'secondary'
      expect(rule).toContain(`color: var(--${token});`)
    }
    expect(localCss).toMatch(/input::placeholder\s*\{[^}]*opacity: 1;/)
    for (const rule of localCss.matchAll(/([^{}]+)\{/g)) {
      expect(
        rule[1].split(',').every(
          (selector) => selector.trim().startsWith('.command-dialog '),
        ),
      ).toBe(true)
    }
  })

  it.each(['light', 'dark'])('meets AA text contrast on %s theme surfaces', (theme) => {
    const themeBlock = globalCss.match(
      theme === 'light'
        ? /:root\s*\{([^}]+)\}/
        : /:root\[data-theme='dark'\]\s*\{([^}]+)\}/,
    )![1]
    const tokens = Object.fromEntries(
      [...themeBlock.matchAll(/--([\w-]+):\s*(#[\da-f]+);/g)].map(
        (match) => [match[1], match[2] === '#fff' ? '#ffffff' : match[2]],
      ),
    )
    for (const background of ['surface', 'surface-hover', 'board']) {
      const foregroundLuminance = luminance(tokens.secondary)
      const backgroundLuminance = luminance(tokens[background])
      const contrast =
        (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
      expect(contrast).toBeGreaterThanOrEqual(4.5)
    }
    const text = luminance(tokens.text)
    const surface = luminance(tokens.surface)
    expect(
      (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05),
    ).toBeGreaterThanOrEqual(4.5)
  })
})
