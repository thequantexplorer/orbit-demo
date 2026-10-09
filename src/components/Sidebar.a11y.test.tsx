/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from './Sidebar'

const sharedStyles = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
const styles = readFileSync(new URL('./Sidebar.a11y.css', import.meta.url), 'utf8')

function declaration(rule: string, name: string) {
  const value = rule.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]
  if (!value) throw new Error(`Missing ${name}`)
  return value.trim()
}

function rgb(hex: string) {
  const full = hex.length === 4
    ? hex.slice(1).split('').map((digit) => digit + digit).join('')
    : hex.slice(1)
  return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16))
}

function luminance(color: number[]) {
  return color.reduce((sum, channel, index) => {
    const srgb = channel / 255
    const linear = srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
    return sum + linear * [0.2126, 0.7152, 0.0722][index]
  }, 0)
}

function contrast(foreground: string, background: number[]) {
  const fg = luminance(rgb(foreground))
  const bg = luminance(background)
  return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
}

describe('Sidebar accessibility styles (source contracts, not browser checks)', () => {
  it('limits collapsed visibility exclusion to the mobile breakpoint', () => {
    const mediaStart = styles.indexOf('@media (max-width: 760px)')
    expect(mediaStart).toBeGreaterThan(0)
    expect(styles.slice(0, mediaStart)).not.toMatch(/visibility|display|inert/)
    expect(styles.slice(mediaStart)).toMatch(
      /\.sidebar:not\(\.sidebar--expanded\)\s*\{\s*visibility:\s*hidden;/,
    )
  })

  it('scopes every caption override to the Sidebar without changing shared tokens', () => {
    const captionRule = styles.match(/([^{}]+)\{\s*color: var\(--sidebar-caption\);\s*\}/)?.[1]
    expect(captionRule?.split(',').map((selector) => selector.trim())).toEqual([
      '.sidebar .workspace-plan',
      '.sidebar .quick-search kbd',
      '.sidebar .nav-heading',
      '.sidebar .nav-heading > span',
      '.sidebar .nav-item__count',
      '.sidebar .nav-project-caption',
      '.sidebar .workspace-note p',
      '.sidebar .reset-button',
      '.sidebar .sidebar__profile div > span',
    ])
    expect(styles).not.toMatch(/--(?:muted|secondary|text|primary):/)
    expect(styles).toMatch(
      /\.sidebar \.quick-search:hover,\s*\.sidebar \.nav-item:hover\s*\{\s*color: var\(--text\);/,
    )
  })

  it.each(['light', 'dark'])('keeps captions and hovered labels above 4.5:1 in %s theme', (theme) => {
    const palette = sharedStyles.match(theme === 'dark'
      ? /:root\[data-theme='dark'\]\s*\{([^}]+)\}/
      : /:root\s*\{([^}]+)\}/)?.[1]
    const captionRule = styles.match(theme === 'dark'
      ? /:root\[data-theme='dark'\] \.sidebar\s*\{([^}]+)\}/
      : /\.sidebar\s*\{([^}]+)\}/)?.[1]
    expect(palette).toBeDefined()
    expect(captionRule).toBeDefined()
    const caption = declaration(captionRule!, '--sidebar-caption')
    const text = declaration(palette!, '--text')
    const sidebar = rgb(declaration(palette!, '--sidebar'))
    const surface = rgb(declaration(palette!, '--surface'))
    const active = rgb(declaration(palette!, '--surface-active'))

    for (const background of [sidebar, surface, active]) {
      expect(contrast(caption, background)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5)
    }
    for (let step = 0; step <= 20; step++) {
      const alpha = step / 20
      const gradient = surface.map((channel, index) =>
        channel * alpha + sidebar[index] * (1 - alpha),
      )
      expect(contrast(caption, gradient)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('Sidebar accessible markup', () => {
  it.each([false, true])('preserves named actions and expansion class with expanded=%s', (expanded) => {
    const markup = renderToStaticMarkup(
      <Sidebar
        view="all"
        onNavigate={vi.fn()}
        onSearch={vi.fn()}
        onCreate={vi.fn()}
        onReset={vi.fn()}
        onHelp={vi.fn()}
        dark={false}
        onTheme={vi.fn()}
        total={0}
        mine={0}
        done={0}
        starred={false}
        expanded={expanded}
      />,
    )
    expect(markup).toContain(expanded
      ? '<aside class="sidebar sidebar--expanded">'
      : '<aside class="sidebar">')
    expect(markup).toContain('aria-label="Workspace navigation"')
    expect(markup).toContain('aria-label="Create issue"')
    expect(markup).toContain('aria-label="Switch to dark theme"')
    expect(markup).toContain('aria-current="page"')
    expect(markup).not.toContain('inert=')
    expect(markup).not.toContain('<aside aria-hidden=')
  })
})
