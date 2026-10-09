// Search latency until the filtered board is actually on screen.
//   node scripts/bench-first-key.mjs main=<dist> branch=<dist> [...]
// Each run: fresh load of /?seed=N, wait for every card plus an idle main
// thread, focus the empty #board-search and type BENCH_QUERY one key at a time.
// Per key it records
//   input:   keydown -> next macrotask after the input event (what bench.mjs measures)
//   settled: keydown -> last DOM change in .board (cards + column counts) + next frame
// with a QUIET_MS window of no .board mutations before the next key.
// The first key is the "first keystroke" from a fresh load.
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import puppeteer from 'puppeteer'

const CARDS = Number(process.env.BENCH_CARDS ?? 5000)
const RUNS = Number(process.env.BENCH_RUNS ?? 5)
const QUERY = process.env.BENCH_QUERY ?? 'onboarding'
const QUIET_MS = 1000
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml' }

const targets = process.argv.slice(2).map((arg) => {
  const [label, dir] = arg.split('=')
  return { label, dir: resolve(dir) }
})
if (!targets.length) throw new Error('usage: bench-first-key.mjs label=<dist dir> ...')

function serve(dir) {
  const server = createServer((request, response) => {
    let file = join(dir, decodeURIComponent(new URL(request.url, 'http://x').pathname))
    if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html')
    response.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' })
    response.end(readFileSync(file))
  })
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ server, url: `http://127.0.0.1:${server.address().port}` })))
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function probe() {
  const afterPaint = (callback) =>
    requestAnimationFrame(() => {
      const channel = new MessageChannel()
      channel.port1.onmessage = () => callback(performance.now())
      channel.port2.postMessage(null)
    })
  window.__probe = { keys: [] }
  let key = null
  const settle = (entry) => afterPaint((now) => {
    entry.settled = Math.max(entry.settled ?? 0, now - entry.down)
  })
  document.addEventListener('keydown', (event) => {
    if (event.target.id !== 'board-search') return
    key = { down: event.timeStamp, lastChange: event.timeStamp }
    window.__probe.keys.push(key)
  }, true)
  document.addEventListener('input', () => {
    const entry = key
    const channel = new MessageChannel()
    channel.port1.onmessage = () => { entry.input = performance.now() - entry.down }
    channel.port2.postMessage(null)
    settle(entry)
  }, true)
  window.__observeBoard = () =>
    new MutationObserver(() => {
      if (!key) return
      key.lastChange = performance.now()
      settle(key)
    }).observe(document.querySelector('.board'), { subtree: true, childList: true, characterData: true })
}

async function measureOnce(browser, url) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.evaluateOnNewDocument(probe)
  try {
    await page.goto(`${url}/?seed=${CARDS}`, { waitUntil: 'load' })
    await page.waitForFunction((n) => document.querySelectorAll('.board [data-card-id]').length >= n, { timeout: 180_000, polling: 100 }, CARDS)
    await new Promise((done) => setTimeout(done, 1500))
    await page.evaluate(() => new Promise((done) => requestIdleCallback(done, { timeout: 2000 })))
    await page.evaluate(() => window.__observeBoard())
    await page.focus('#board-search')
    const keys = []
    for (const [index, char] of [...QUERY].entries()) {
      await page.keyboard.type(char)
      await page.waitForFunction(
        (i, quiet) => {
          const entry = window.__probe.keys[i]
          return entry?.input !== undefined && entry.settled !== undefined && performance.now() - entry.lastChange > quiet
        },
        { polling: 50, timeout: 60_000 },
        index,
        QUIET_MS,
      )
      const counts = await page.$$eval('.column__count', (badges) => badges.map((badge) => badge.textContent).join('/'))
      const { input, settled } = await page.evaluate((i) => window.__probe.keys[i], index)
      keys.push({ input, settled, counts })
    }
    return keys
  } finally {
    await context.close()
  }
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const servers = await Promise.all(targets.map((target) => serve(target.dir)))
const results = Object.fromEntries(targets.map((target) => [target.label, []]))
try {
  for (let run = 0; run < RUNS; run++)
    for (const [index, target] of targets.entries()) {
      process.stderr.write(`run ${run + 1}/${RUNS} ${target.label}…\n`)
      results[target.label].push(await measureOnce(browser, servers[index].url))
    }
  console.log(`First keystroke / settled search: ${CARDS} cards, query "${QUERY}", median of ${RUNS} fresh loads, ${await browser.version()}`)
  const fmt = (value) => value.toFixed(1).padStart(8)
  console.log(`${'build'.padEnd(10)} ${'1st input'.padStart(9)} ${'1st settl'.padStart(9)} ${'key input'.padStart(9)} ${'key settl'.padStart(9)}  final counts`)
  for (const { label } of targets) {
    const runs = results[label]
    const rest = (field) => median(runs.map((keys) => median(keys.slice(1).map((key) => key[field]))))
    console.log(
      `${label.padEnd(10)} ${fmt(median(runs.map((keys) => keys[0].input)))}  ${fmt(median(runs.map((keys) => keys[0].settled)))}  ${fmt(rest('input'))}  ${fmt(rest('settled'))}  ${runs[0].at(-1).counts}`,
    )
    console.log(`${''.padEnd(10)} first-key counts "${runs[0][0].counts}"; per-run 1st settled: ${runs.map((keys) => keys[0].settled.toFixed(0)).join(', ')}`)
  }
  if (process.env.BENCH_RAW) console.log(JSON.stringify(results))
  console.log('(ms; "key" columns = median over keys 2..n of the per-run median)')
} finally {
  await browser.close()
  for (const { server } of servers) server.close()
}
