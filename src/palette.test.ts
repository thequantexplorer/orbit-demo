import { describe, expect, it } from 'vitest'
import { ASSIGNEES, LABELS } from './data'
import { contrastRatio, mix, pastel } from './palette'

describe('palette', () => {
  it('mixes hex colours', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mix('#ff0000', '#ffffff', 0)).toBe('#ff0000')
  })

  it('computes WCAG contrast ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5)
  })

  it('keeps every label and avatar pastel at WCAG AA in both themes', () => {
    const colors = [
      ...Object.values(LABELS).map((label) => label.color),
      ...Object.values(ASSIGNEES).map((assignee) => assignee.color),
    ]
    for (const color of colors) {
      const swatch = pastel(color)
      expect(contrastRatio(swatch.lightInk, swatch.lightBg)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(swatch.darkInk, swatch.darkBg)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
