// First-keystroke latency: `node scripts/bench-first-key.mjs <url> [<url>…]`
// against running builds (e.g. `npx vite preview`). For each URL, on a fresh
// load of /?seed=N with an idle main thread, types one key into the empty
// board search and reports the median of RUNS loads of:
//   settled: keydown -> column counts and rendered cards match the filter,
//            DOM stops changing, next frame produced
//   bench:   keydown -> next macrotask after the input event (as bench.mjs)
import puppeteer from 'puppeteer'

const CARDS = Number(process.env.BENCH_CARDS ?? 5000)
const RUNS = Number(process.env.BENCH_RUNS ?? 5)
const KEY = process.env.BENCH_KEY ?? 'o'
const QUIET_MS = 1000
const urls = process.argv.slice(2)
if (!urls.length) throw new Error('usage: node scripts/bench-first-key.mjs <url> [<url>…]')

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

async function measureOnce(browser, url) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  try {
    await page.goto(`${url}/?seed=${CARDS}`, { waitUntil: 'load' })
    await page.waitForFunction((n) => document.querySelectorAll('.board [data-card-id]').length >= n, { timeout: 180_000, polling: 100 }, CARDS)
    // Idle: no long task for QUIET_MS.
    await page.evaluate((quiet) => new Promise((done) => {
      let timer = setTimeout(done, quiet)
      new PerformanceObserver(() => {
        clearTimeout(timer)
        timer = setTimeout(done, quiet)
      }).observe({ type: 'longtask' })
    }), QUIET_MS)

    await page.evaluate((key, quiet) => {
      const text = (card, selector) => card.querySelector(selector)?.textContent ?? ''
      const expected = [...document.querySelectorAll('.board [data-column-id]')].map((column) => ({
        column,
        count: [...column.querySelectorAll('[data-card-id]')].filter((card) =>
          `${text(card, '.card__title')} ${text(card, '.card__id')} ${text(card, '.card__description')}`
            .toLowerCase()
            .includes(key),
        ).length,
      }))
      const settled = () =>
        expected.every(({ column, count }) =>
          Number(column.querySelector('.column__count').textContent) === count &&
          column.querySelectorAll('[data-card-id]').length === count)
      const result = (window.__firstKey = {})
      document.addEventListener('keydown', (event) => { result.keydown = event.timeStamp }, { capture: true, once: true })
      document.addEventListener('input', () => {
        const channel = new MessageChannel()
        channel.port1.onmessage = () => { result.bench = performance.now() - result.keydown }
        channel.port2.postMessage(null)
      }, { capture: true, once: true })
      let quietTimer
      new MutationObserver(() => {
        clearTimeout(quietTimer)
        if (!settled()) return
        requestAnimationFrame(() => {
          const channel = new MessageChannel()
          channel.port1.onmessage = () => {
            result.settledAt = performance.now()
            clearTimeout(quietTimer)
            quietTimer = setTimeout(() => { result.settled = result.settledAt - result.keydown }, quiet)
          }
          channel.port2.postMessage(null)
        })
      }).observe(document.querySelector('.board'), { childList: true, subtree: true, characterData: true })
    }, KEY, QUIET_MS)

    await page.focus('#board-search')
    await page.keyboard.type(KEY)
    await page.waitForFunction(() => window.__firstKey.settled !== undefined && window.__firstKey.bench !== undefined, { timeout: 60_000 })
    return await page.evaluate(() => window.__firstKey)
  } finally {
    await context.close()
  }
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
try {
  const runs = Object.fromEntries(urls.map((url) => [url, []]))
  for (let index = 0; index < RUNS; index++)
    for (const url of urls) {
      runs[url].push(await measureOnce(browser, url))
      process.stderr.write(`run ${index + 1}/${RUNS} ${url}\n`)
    }
  console.log(`First keystroke "${KEY}": ${CARDS} cards, median of ${RUNS} fresh loads, ${await browser.version()}`)
  for (const url of urls) {
    const list = runs[url]
    const fmt = (key) => `${median(list.map((run) => run[key])).toFixed(1)} ms [${list.map((run) => run[key].toFixed(0)).join(', ')}]`
    console.log(`${url}\n  settled: ${fmt('settled')}\n  bench:   ${fmt('bench')}`)
  }
} finally {
  await browser.close()
}
