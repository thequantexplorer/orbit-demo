type Rgb = [number, number, number]

function parseHex(hex: string): Rgb {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value
  return [0, 2, 4].map((offset) =>
    parseInt(full.slice(offset, offset + 2), 16),
  ) as Rgb
}

function toHex(rgb: Rgb) {
  return `#${rgb
    .map((channel) =>
      Math.round(Math.min(255, Math.max(0, channel)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

/** Mixes `hex` toward `target` by `amount` (0 keeps `hex`, 1 returns `target`). */
export function mix(hex: string, target: string, amount: number) {
  const from = parseHex(hex)
  const to = parseHex(target)
  return toHex(
    from.map((channel, index) => channel + (to[index] - channel) * amount) as Rgb,
  )
}

function luminance(hex: string) {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const srgb = channel / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/** Pushes `ink` toward `target` until it reaches `minimum` contrast on `background`. */
function ensureContrast(
  ink: string,
  background: string,
  target: string,
  minimum: number,
) {
  let result = ink
  for (let step = 1; contrastRatio(result, background) < minimum; step++) {
    result = mix(ink, target, Math.min(1, step * 0.08))
    if (step * 0.08 >= 1) break
  }
  return result
}

export interface Pastel {
  lightBg: string
  lightInk: string
  darkBg: string
  darkInk: string
}

const AA = 4.5

/**
 * Derives a pastel chip background plus an AA-contrast ink colour from a
 * saturated brand colour, for both light and dark appearances.
 */
export function pastel(hex: string): Pastel {
  const lightBg = mix(hex, '#ffffff', 0.78)
  const darkBg = mix(hex, '#1b1830', 0.68)
  return {
    lightBg,
    lightInk: ensureContrast(mix(hex, '#1a1033', 0.55), lightBg, '#000000', AA),
    darkBg,
    darkInk: ensureContrast(mix(hex, '#ffffff', 0.6), darkBg, '#ffffff', AA),
  }
}

export function pastelVars(hex: string, prefix: string) {
  const colors = pastel(hex)
  return {
    [`--${prefix}-bg-light`]: colors.lightBg,
    [`--${prefix}-ink-light`]: colors.lightInk,
    [`--${prefix}-bg-dark`]: colors.darkBg,
    [`--${prefix}-ink-dark`]: colors.darkInk,
    [`--${prefix}-accent`]: hex,
  }
}
