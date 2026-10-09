/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AddCardForm } from './AddCardForm'

const scopedCss = readFileSync(
  new URL('./AddCardForm.a11y.css', import.meta.url),
  'utf8',
)
const sharedCss = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

function declarations(css: string, selector: string) {
  const body = css.split(`${selector} {`)[1]?.split('}')[0]
  expect(body, `Missing rule: ${selector}`).toBeDefined()
  return Object.fromEntries(
    [...body!.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  )
}

function luminance(hex: string) {
  const digits = hex.slice(1)
  const expanded =
    digits.length === 3
      ? [...digits].map((digit) => digit + digit).join('')
      : digits
  const channels = expanded.match(/../g)!.map((channel) => {
    const value = parseInt(channel, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(foreground: string, background: string) {
  const a = luminance(foreground)
  const b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

describe('AddCardForm accessibility', () => {
  it.each(['Backlog', 'In Progress', 'Review', 'Done'])(
    'preserves named native controls and the header focus target for %s',
    (columnTitle) => {
      const markup = renderToStaticMarkup(
        <AddCardForm columnTitle={columnTitle} onAdd={() => {}} />,
      )
      expect(markup).toContain(`aria-label="Add a card to ${columnTitle}"`)
      expect(markup).toContain(
        `id="add-${columnTitle.replaceAll(' ', '-').toLowerCase()}"`,
      )
      expect(markup).toContain('type="text"')
      expect(markup).toContain('type="submit"')
      expect(markup).toContain('aria-label="Add card"')
      expect(markup).toContain('disabled=""')
      expect(markup).toContain('<span aria-hidden="true">↵</span>')
    },
  )

  const input = declarations(scopedCss, '.add-card .add-card__input')
  const placeholder = declarations(
    scopedCss,
    '.add-card .add-card__input::placeholder',
  )
  const focus = declarations(scopedCss, 'form.add-card:focus-within')

  it('uses scoped overrides that outrank the shared stylesheet regardless of import order', () => {
    expect(input.color).toBe('var(--text)')
    expect(placeholder.color).toBe('var(--secondary)')
    expect(placeholder.opacity).toBe('1')
    expect(focus['border-color']).toBe('var(--primary)')
    expect(focus['box-shadow']).toBe('inset 0 0 0 2px var(--primary)')
    expect(
      [...scopedCss.matchAll(/([^{}]+)\{/g)].map((match) => match[1].trim()),
    ).toEqual([
      '.add-card .add-card__input',
      '.add-card .add-card__input::placeholder',
      'form.add-card:focus-within',
    ])
  })

  it('keeps the focus ring inside the form, separated from the drop-target column border', () => {
    const form = declarations(sharedCss, '.add-card')
    const focusedForm = declarations(sharedCss, '.add-card:focus-within')

    expect(focus['box-shadow']).toMatch(/^inset 0 0 0 2px /)
    const horizontalMargin = parseFloat(form.margin.split(/\s+/)[1])
    expect(horizontalMargin).toBeGreaterThanOrEqual(2)
    expect(focusedForm.background).toBe('var(--surface)')
  })

  it.each([':root', ":root[data-theme='dark']"])(
    'meets AA color ratios for idle, hover, focus and drop-target backgrounds in %s',
    (selector) => {
      const theme = declarations(sharedCss, selector)
      const resolve = (value: string) => theme[value.slice(4, -1)]
      for (const background of [
        '--board', '--surface-hover', '--surface', '--primary-subtle',
      ]) {
        expect(
          contrast(resolve(input.color), theme[background]),
        ).toBeGreaterThanOrEqual(4.5)
        expect(
          contrast(resolve(placeholder.color), theme[background]),
        ).toBeGreaterThanOrEqual(4.5)
        expect(
          contrast(resolve(focus['border-color']), theme[background]),
        ).toBeGreaterThanOrEqual(3)
      }
    },
  )
})
