// First-keystroke latency on a fresh /?seed=N load (see BENCHMARK.md).
// Usage: node scripts/bench-first-key.mjs <label>=<dist dir> [<label>=<dist dir> ...]
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import puppeteer from 'puppeteer'

const CARDS = Number(process.env.BENCH_CARDS ?? 5000)
const RUNS = Number(process.env.BENCH_RUNS ?? 5)
const KEY = process.env.BENCH_KEY ?? 'o'
const QUIET_MS = 500
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }

const targets = process.argv.slice(2).map((arg) => {
  const [label, dir] = arg.split('=')
  return { label, dist: resolve(dir) }
})
if (!targets.length) throw new Error('usage: bench-first-key.mjs <label>=<dist dir> ...')

function serve(distDir) {
  const server = createServer((request, response) => {
    let file = join(distDir, decodeURIComponent(new URL(request.url, 'http://x').pathname))
    if (!file.startsWith(distDir) || !existsSync(file) || statSync(file).isDirectory()) file = join(distDir, 'index.html')
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

async function measureOnce(browser, url) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  try {
    await page.goto(`${url}/?seed=${CARDS}`, { waitUntil: 'load' })
    const countTotal = () =>
      [...document.querySelectorAll('.board .column__count')].reduce((sum, badge) => sum + Number(badge.textContent), 0)
    await page.waitForFunction(`(${countTotal})() === ${CARDS} && !!document.querySelector('.board [data-card-id]')`, { timeout: 180_000 })
    // Let the main thread go idle before typing.
    await page.evaluate(() => new Promise((done) => setTimeout(() => requestIdleCallback(done, { timeout: 5000 }), 1000)))
    await page.focus('#board-search')
    await page.evaluate((countTotalSource) => {
      const countTotal = new Function(`return (${countTotalSource})`)()
      const state = (window.__firstKey = { keydown: null, macrotask: null, settled: null, lastChange: null })
      document.addEventListener('keydown', (event) => { state.keydown ??= event.timeStamp }, { capture: true, once: true })
      document.addEventListener('input', () => {
        const channel = new MessageChannel()
        channel.port1.onmessage = () => { state.macrotask = performance.now() - state.keydown }
        channel.port2.postMessage(null)
      }, { capture: true, once: true })
      // Every DOM change on the board: once the counts are filtered, record
      // the frame after it as the candidate "settled" time.
      new MutationObserver(() => {
        state.lastChange = performance.now()
        requestAnimationFrame(() => {
          const channel = new MessageChannel()
          channel.port1.onmessage = () => {
            const matching = Number(document.querySelector('.active-filters span')?.textContent.split(' ')[0])
            if (countTotal() === matching) state.settled = performance.now() - state.keydown
          }
          channel.port2.postMessage(null)
        })
      }).observe(document.querySelector('.board'), { childList: true, subtree: true, characterData: true, attributes: true })
    }, countTotal.toString())
    await page.keyboard.type(KEY)
    await page.waitForFunction(
      (quiet) => window.__firstKey.settled !== null && performance.now() - window.__firstKey.lastChange > quiet,
      { timeout: 60_000, polling: 50 },
      QUIET_MS,
    )
    return await page.evaluate(() => window.__firstKey)
  } finally {
    await context.close()
  }
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
const servers = await Promise.all(targets.map((target) => serve(target.dist)))
try {
  const results = targets.map(() => [])
  for (let run = 0; run < RUNS; run++)
    for (const [index, target] of targets.entries()) {
      process.stderr.write(`run ${run + 1}/${RUNS} ${target.label}…\n`)
      results[index].push(await measureOnce(browser, servers[index].url))
    }
  console.log(`First keystroke "${KEY}": ${CARDS} cards, median of ${RUNS} fresh loads, ${await browser.version()}`)
  for (const [index, target] of targets.entries()) {
    const settled = results[index].map((entry) => entry.settled)
    const macrotask = results[index].map((entry) => entry.macrotask)
    console.log(
      `${target.label.padEnd(10)} keydown -> DOM settled + frame: ${median(settled).toFixed(1)} ms` +
        `  keydown -> macrotask after input: ${median(macrotask).toFixed(1)} ms` +
        `  (settled runs: ${settled.map((value) => value.toFixed(0)).join(', ')})`,
    )
  }
} finally {
  await browser.close()
  for (const { server } of servers) server.close()
}
