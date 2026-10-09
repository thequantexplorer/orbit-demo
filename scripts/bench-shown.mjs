// Supplementary benchmark: keydown -> filtered results actually shown.
// `node scripts/bench-shown.mjs` builds the current checkout and origin/main
// like `npm run bench`, then types BENCH_QUERY into the board search and, for
// every key, measures keydown -> the column count badges and the cards in the
// DOM match the final filtered set (calibrated on the baseline build) and the
// next frame has been produced. "burst" types the whole query 30 ms apart and
// measures last keydown -> final results shown.
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, statSync, symlinkSync, unlinkSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, resolve } from 'node:path'
import puppeteer from 'puppeteer'

const ROOT = resolve(import.meta.dirname, '..')
const CARDS = Number(process.env.BENCH_CARDS ?? 5000)
const RUNS = Number(process.env.BENCH_RUNS ?? 5)
const BASE_REF = process.env.BENCH_BASE ?? 'origin/main'
const QUERY = process.env.BENCH_QUERY ?? 'onboarding'
const BASELINE_DIR = join(ROOT, '.bench', 'shown-baseline')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff' }
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' }).trim()
const log = (message) => process.stderr.write(`${message}\n`)

function removeBaseline() {
  const modules = join(BASELINE_DIR, 'node_modules')
  if (existsSync(modules) && lstatSync(modules).isSymbolicLink()) unlinkSync(modules)
  if (existsSync(BASELINE_DIR)) run('git', ['worktree', 'remove', '--force', BASELINE_DIR], ROOT)
  run('git', ['worktree', 'prune'], ROOT)
}

function build(dir) {
  execFileSync('npm', ['run', 'build'], { cwd: dir, stdio: ['ignore', 'ignore', 'inherit'] })
  return join(dir, 'dist')
}

function serve(distDir) {
  const server = createServer((request, response) => {
    let file = join(distDir, decodeURIComponent(new URL(request.url, 'http://x').pathname))
    if (!file.startsWith(distDir) || !existsSync(file) || statSync(file).isDirectory())
      file = join(distDir, 'index.html')
    response.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' })
    response.end(readFileSync(file))
  })
  return new Promise((done) =>
    server.listen(0, '127.0.0.1', () => done({ server, url: `http://127.0.0.1:${server.address().port}` })),
  )
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

// Installed before page scripts: `__shown.signature()` describes what the board
// shows (count badges + ids of the cards in the DOM); `__shown.expect(sig)`
// resolves with keydown -> signature shown + next frame.
function instrument() {
  const signature = () => {
    const counts = [...document.querySelectorAll('[data-testid^="count-"]')].map((node) => node.textContent)
    let hash = 0
    for (const node of document.querySelectorAll('.board [data-card-id]'))
      for (const char of node.dataset.cardId) hash = (hash * 31 + char.charCodeAt(0)) | 0
    return `${counts.join(',')}|${hash}`
  }
  let lastKeydown = 0
  document.addEventListener('keydown', (event) => { lastKeydown = event.timeStamp }, true)
  window.__shown = {
    signature,
    expect(expected) {
      return new Promise((done) => {
        const finish = () => {
          observer.disconnect()
          const keydown = lastKeydown
          requestAnimationFrame(() => {
            const channel = new MessageChannel()
            channel.port1.onmessage = () => done(performance.now() - keydown)
            channel.port2.postMessage(null)
          })
        }
        const check = () => { if (signature() === expected) finish() }
        const observer = new MutationObserver(check)
        observer.observe(document.body, { childList: true, subtree: true, characterData: true })
        setTimeout(check, 0)
      })
    },
  }
}

async function openBoard(browser, url) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.evaluateOnNewDocument(instrument)
  await page.goto(`${url}/?seed=${CARDS}`, { waitUntil: 'load' })
  await page.waitForFunction((n) => document.querySelectorAll('.board [data-card-id]').length >= n, { timeout: 180_000 }, CARDS)
  await new Promise((done) => setTimeout(done, 500))
  await page.focus('#board-search')
  return { page, context }
}

async function calibrate(browser, url) {
  const { page, context } = await openBoard(browser, url)
  const expected = []
  for (const key of QUERY) {
    await page.keyboard.type(key)
    await new Promise((done) => setTimeout(done, 1500))
    expected.push(await page.evaluate(() => window.__shown.signature()))
  }
  await context.close()
  return expected
}

async function measureOnce(browser, url, expected) {
  let { page, context } = await openBoard(browser, url)
  const perKey = []
  for (const [index, key] of [...QUERY].entries()) {
    const shown = page.evaluate((sig) => window.__shown.expect(sig), expected[index])
    await page.keyboard.type(key)
    perKey.push(await shown)
    await new Promise((done) => setTimeout(done, 50))
  }
  await context.close()
  ;({ page, context } = await openBoard(browser, url))
  const shown = page.evaluate((sig) => window.__shown.expect(sig), expected.at(-1))
  await page.keyboard.type(QUERY, { delay: 30 })
  const burst = await shown
  await context.close()
  return { perKey: median(perKey), burst, keys: perKey }
}

async function main() {
  run('git', ['fetch', '--quiet', 'origin', 'main'], ROOT)
  removeBaseline()
  run('git', ['worktree', 'add', '--detach', BASELINE_DIR, BASE_REF], ROOT)
  symlinkSync(join(ROOT, 'node_modules'), join(BASELINE_DIR, 'node_modules'), 'dir')
  const servers = { baseline: await serve(build(BASELINE_DIR)), current: await serve(build(ROOT)) }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    log('calibrating on baseline…')
    const expected = await calibrate(browser, servers.baseline.url)
    const runs = { baseline: [], current: [] }
    for (let index = 0; index < RUNS; index++)
      for (const target of ['baseline', 'current']) {
        log(`run ${index + 1}/${RUNS} ${target}…`)
        runs[target].push(await measureOnce(browser, servers[target].url, expected))
      }
    console.log(`keydown -> filtered results shown: ${CARDS} cards, median of ${RUNS} runs, ${await browser.version()}`)
    for (const [key, label] of [['perKey', 'per key, 50 ms after each result (ms)'], ['burst', 'burst typing, last keydown -> final (ms)']]) {
      const base = median(runs.baseline.map((entry) => entry[key]))
      const current = median(runs.current.map((entry) => entry[key]))
      console.log(`${label.padEnd(42)} ${base.toFixed(1).padStart(8)} ${current.toFixed(1).padStart(8)}  ${current >= base ? '+' : ''}${(((current - base) / base) * 100).toFixed(1)}%`)
    }
    console.log(JSON.stringify(runs))
  } finally {
    await browser.close()
    for (const { server } of Object.values(servers)) server.close()
    removeBaseline()
  }
}

await main()
