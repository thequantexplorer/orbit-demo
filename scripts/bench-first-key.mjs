// Supplemental user-perceived latency benchmark (complements `npm run bench`).
//
//   npm run build && npx vite preview --port 4173 &
//   node scripts/bench-first-key.mjs http://127.0.0.1:4173 [more urls…]
//
// For each URL, median of BENCH_RUNS (default 5) fresh loads of /?seed=N:
// - first card / all cards: navigation -> first (or all N) `.board [data-card-id]`
//   in the DOM + next frame; load long tasks: total long-task ms until all cards.
// - first key: after load and an idle main thread, type the first query letter
//   into the empty #board-search. "macrotask" is the bench-style number
//   (keydown -> macrotask after the input event); "counts" is keydown -> the four
//   .column__count badges show the filtered totals + next frame; "settled" is
//   keydown -> badges correct and exactly the matching cards rendered + next frame.
// - query settled: the rest of the query typed one key at a time, each key
//   waiting until settled; median keydown -> settled per key.
import { createServer } from 'vite'
import puppeteer from 'puppeteer'

const CARDS = Number(process.env.BENCH_CARDS ?? 5000)
const RUNS = Number(process.env.BENCH_RUNS ?? 5)
const QUERY = process.env.BENCH_QUERY ?? 'onboarding'
const urls = process.argv.slice(2)
if (!urls.length) throw new Error('usage: node scripts/bench-first-key.mjs <url> [url…]')

// Expected per-column counts for every query prefix, from the same generator.
const vite = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' })
const { createGeneratedBoard } = await vite.ssrLoadModule('/src/seed.ts')
await vite.close()
const board = createGeneratedBoard(CARDS)
const expected = [...QUERY].map((_, index) => {
  const query = QUERY.slice(0, index + 1).toLowerCase()
  return board.columns.map(
    (column) =>
      column.cardIds.filter((id) => {
        const card = board.cards[id]
        return `${card.title} ${card.id} ${card.description}`.toLowerCase().includes(query)
      }).length,
  )
})

function instrument(total) {
  const bench = (window.__bench = { longTasks: [] })
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) bench.longTasks.push({ start: entry.startTime, duration: entry.duration })
  }).observe({ type: 'longtask', buffered: true })
  const afterFrame = (callback) =>
    requestAnimationFrame(() => {
      const channel = new MessageChannel()
      channel.port1.onmessage = () => callback(performance.now())
      channel.port2.postMessage(null)
    })
  bench.afterFrame = afterFrame
  const poll = () => {
    const count = document.querySelectorAll('.board [data-card-id]').length
    if (count > 0 && bench.firstCard === undefined) {
      bench.firstCard = null
      afterFrame((now) => (bench.firstCard = now))
    }
    if (count >= total) afterFrame((now) => (bench.allCards = now))
    else requestAnimationFrame(poll)
  }
  requestAnimationFrame(poll)
}

async function measureOnce(browser, url) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.evaluateOnNewDocument(instrument, CARDS)
  try {
    await page.goto(`${url}/?seed=${CARDS}`, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__bench.allCards !== undefined, { timeout: 180_000, polling: 100 })
    const load = await page.evaluate(() => {
      const { firstCard, allCards, longTasks } = window.__bench
      const during = longTasks.filter((task) => task.start < allCards)
      return {
        firstCard,
        allCards,
        loadLongTaskMs: during.reduce((sum, task) => sum + task.duration, 0),
        loadMaxTaskMs: Math.max(0, ...during.map((task) => task.duration)),
      }
    })
    // Idle: no long task for 1 s.
    await page.waitForFunction(
      () => {
        const last = window.__bench.longTasks.at(-1)
        return !last || performance.now() - (last.start + last.duration) > 1000
      },
      { timeout: 60_000, polling: 100 },
    )

    await page.evaluate(() => {
      const bench = window.__bench
      bench.keys = []
      let pending = null
      document.addEventListener('keydown', (event) => (pending = event.timeStamp), true)
      document.addEventListener(
        'input',
        () => {
          const start = pending
          const entry = { start }
          bench.keys.push(entry)
          const channel = new MessageChannel()
          channel.port1.onmessage = () => (entry.macrotask = performance.now() - start)
          channel.port2.postMessage(null)
        },
        true,
      )
      bench.watch = (counts) => {
        const entry = bench.keys.at(-1)
        const columns = [...document.querySelectorAll('.board .column')]
        const check = () => {
          const badges = columns.every(
            (column, index) => Number(column.querySelector('.column__count').textContent) === counts[index],
          )
          if (badges && entry.counts === undefined) {
            entry.counts = null
            bench.afterFrame((now) => (entry.counts = now - entry.start))
          }
          const rendered = columns.every(
            (column, index) => column.querySelectorAll('[data-card-id]').length === counts[index],
          )
          if (badges && rendered) bench.afterFrame((now) => (entry.settled = now - entry.start))
          else requestAnimationFrame(check)
        }
        check()
      }
    })
    await page.focus('#board-search')
    const keys = []
    for (const [index, key] of [...QUERY].entries()) {
      await page.keyboard.type(key)
      await page.evaluate((counts) => window.__bench.watch(counts), expected[index])
      await page.waitForFunction(
        (count) => window.__bench.keys[count]?.settled !== undefined && window.__bench.keys[count]?.counts != null,
        { timeout: 60_000, polling: 50 },
        index,
      )
      keys.push(await page.evaluate((count) => window.__bench.keys[count], index))
    }
    return {
      ...load,
      firstKeyMacrotask: keys[0].macrotask,
      firstKeyCounts: keys[0].counts,
      firstKeySettled: keys[0].settled,
      querySettled: median(keys.slice(1).map((key) => key.settled)),
    }
  } finally {
    await context.close()
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const results = Object.fromEntries(urls.map((url) => [url, []]))
try {
  for (let run = 0; run < RUNS; run++)
    for (const url of urls) {
      process.stderr.write(`run ${run + 1}/${RUNS} ${url}…\n`)
      results[url].push(await measureOnce(browser, url))
    }
  console.log(`${CARDS} cards, median of ${RUNS} fresh loads, ${await browser.version()}`)
  console.log(`first key "${QUERY[0]}" expects counts ${expected[0].join('/')}`)
  const metrics = Object.keys(results[urls[0]][0])
  const rows = [['metric (ms)', ...urls], ...metrics.map((key) => [key, ...urls.map((url) => median(results[url].map((r) => r[key])).toFixed(1))])]
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)))
  for (const row of rows) console.log(row.map((cell, column) => (column ? cell.padStart(widths[column]) : cell.padEnd(widths[column]))).join('  '))
} finally {
  await browser.close()
}
