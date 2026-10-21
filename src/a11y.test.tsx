// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('accessibility', () => {
  it('renders the board with no serious or critical axe violations', async () => {
    const { container } = render(<App />)
    const results = await axe.run(container, {
      // jsdom has no layout engine, so colour contrast can't be computed here.
      rules: { 'color-contrast': { enabled: false } },
    })
    const blocking = results.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`)
    expect(blocking).toEqual([])
  })
})
