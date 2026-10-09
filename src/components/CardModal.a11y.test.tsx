/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CardModal } from './CardModal'

const globalCss = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
const modalCss = readFileSync(
  new URL('./CardModal.a11y.css', import.meta.url),
  'utf8',
)

function declarations(css: string, selector: string) {
  const block = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
    ([, selectors]) =>
      selectors.split(',').some((value) => value.trim() === selector),
  )
  if (!block) throw new Error(`Missing selector: ${selector}`)
  return Object.fromEntries(
    block[2]
      .split(';')
      .filter((value) => value.trim())
      .map((value) => {
        const colon = value.indexOf(':')
        return [value.slice(0, colon).trim(), value.slice(colon + 1).trim()]
      }),
  )
}

type Color = [number, number, number, number]

function color(value: string, variables: Record<string, string>): Color {
  const variable = value.match(/^var\((--[\w-]+)\)$/)
  if (variable) return color(variables[variable[1]], variables)
  const mix = value.match(/^color-mix\(in srgb, (.+) (\d+)%, (.+)\)$/)
  if (mix) {
    const first = color(mix[1], variables)
    const second = color(mix[3], variables)
    const weight = Number(mix[2]) / 100
    return first.map((channel, index) =>
      channel * weight + second[index] * (1 - weight),
    ) as Color
  }
  const hex = value.slice(1)
  const full =
    hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex
  if (!/^(#[\da-f]{3}|#[\da-f]{6}|#[\da-f]{8})$/i.test(value))
    throw new Error(`Unsupported color: ${value}`)
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
    full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1,
  ]
}

function luminance(channels: number[]) {
  return channels
    .map((channel) => {
      const value = channel / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    .reduce(
      (total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index],
      0,
    )
}

function contrast(foreground: Color, background: Color) {
  const composed = foreground.slice(0, 3).map((channel, index) =>
    channel * foreground[3] + background[index] * (1 - foreground[3]),
  )
  const lightness = [luminance(composed), luminance(background.slice(0, 3))]
    .sort((a, b) => a - b)
  return (lightness[1] + 0.05) / (lightness[0] + 0.05)
}

describe('CardModal scoped accessibility styles', () => {
  it('keeps every selector under the issue dialog root', () => {
    for (const [, selectors] of modalCss.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
      for (const selector of selectors.split(','))
        expect(selector).toContain('.issue-dialog')
    }
  })

  describe.each(['light', 'dark'])('%s theme', (theme) => {
    const variables = {
      ...declarations(globalCss, ':root'),
      ...(theme === 'dark'
        ? declarations(globalCss, ":root[data-theme='dark']")
        : {}),
      ...declarations(modalCss, '.issue-dialog'),
      ...(theme === 'dark'
        ? declarations(modalCss, ":root[data-theme='dark'] .issue-dialog")
        : {}),
    }
    const resolve = (value: string) => color(value, variables)
    const ratio = (foreground: string, background: string) =>
      contrast(resolve(foreground), resolve(background))

    it('provides AA text contrast for labels, placeholders and the creation hint', () => {
      for (const selector of [
        '.issue-dialog .property-field > label',
        '.issue-dialog .label-picker legend',
        '.issue-dialog .modal__hint',
        '.issue-dialog .modal__title-input::placeholder',
        '.issue-dialog .modal__description::placeholder',
      ]) {
        const styles = declarations(modalCss, selector)
        for (const background of ['var(--surface)', 'var(--board)'])
          expect(ratio(styles.color, background)).toBeGreaterThanOrEqual(4.5)
        if (selector.endsWith('::placeholder')) expect(styles.opacity).toBe('1')
      }
    })

    it('provides high-contrast borders and outlines for title and description focus', () => {
      for (const field of ['.modal__title-input', '.modal__description']) {
        const styles = declarations(modalCss, `.issue-dialog ${field}:focus`)
        expect(styles.outline).toBe('2px solid var(--primary)')
        expect(styles['outline-offset']).toBe('2px')
        for (const background of ['var(--surface)', 'var(--board)']) {
          expect(ratio(styles['border-color'], background))
            .toBeGreaterThanOrEqual(3)
          expect(ratio('var(--primary)', background)).toBeGreaterThanOrEqual(3)
        }
      }
    })

    it('keeps enabled delete confirmation text readable in default and hover states', () => {
      const foreground = declarations(
        modalCss, '.issue-dialog .delete-confirm .button--danger',
      ).color
      for (const selector of ['.button--danger', '.button:hover']) {
        const background = declarations(globalCss, selector).background
        expect(ratio(foreground, background)).toBeGreaterThanOrEqual(4.5)
      }
    })

    it('keeps the enabled primary shortcut readable after alpha compositing', () => {
      const foreground = declarations(
        modalCss, '.issue-dialog .button--primary kbd',
      ).color
      for (const selector of ['.button--primary', '.button--primary:hover']) {
        const background = declarations(globalCss, selector).background
        expect(ratio(foreground, background)).toBeGreaterThanOrEqual(4.5)
        expect(ratio('#fff', background)).toBeGreaterThanOrEqual(4.5)
      }
    })

    it('keeps custom select chevrons distinguishable from the control surface', () => {
      const foreground = declarations(
        modalCss, '.issue-dialog .select-wrap > .modal__select-chevron',
      ).color
      expect(ratio(foreground, 'var(--surface)')).toBeGreaterThanOrEqual(3)
    })
  })
})

describe.each([false, true])('CardModal markup (creating: %s)', (creating) => {
  it('preserves native labelled fields and applies contrast styling only to dropdown chevrons', () => {
    const markup = renderToStaticMarkup(
      <CardModal
        card={{
          id: 'KB-1',
          title: 'Accessible issue',
          description: '',
          labels: [],
          assigneeId: null,
          dueDate: null,
        }}
        columnId="backlog"
        columns={[{
          id: 'backlog', title: 'Backlog', accent: '#aaa', cardIds: ['KB-1'],
        }]}
        creating={creating}
        onSave={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    )
    for (const id of [
      'modal-title',
      'modal-description',
      'issue-status',
      'issue-assignee',
      'issue-due-date',
    ]) {
      expect(markup).toContain(`for="${id}"`)
      expect(markup).toContain(`id="${id}"`)
    }
    expect(markup.match(/class="icon modal__select-chevron"/g)).toHaveLength(2)
    expect(markup).toContain('aria-labelledby="issue-dialog-title"')
    expect(markup).toContain('<legend>Labels</legend>')
    expect(markup).toContain(creating ? 'Create issue' : 'Save changes')
  })
})
