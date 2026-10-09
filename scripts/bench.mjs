// Board performance benchmark: `npm run bench` (see BENCHMARK.md).
import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { cpus, platform, release, totalmem } from 'node:os'
import { extname, join, resolve } from 'node:path'
import puppeteer from 'puppeteer'

const ROOT = resolve(import.meta.dirname, '..')
const CARDS = Number(process.env.BENCH_CARDS ?? 5000)
const RUNS = Number(process.env.BENCH_RUNS ?? 5)
const BASE_REF = process.env.BENCH_BASE ?? 'origin/main'
const QUERY = process.env.BENCH_QUERY ?? 'onboarding'
const SCROLL_MS = 3000
const BASELINE_DIR = join(ROOT, '.bench', 'baseline')
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
}

if (!Number.isInteger(CARDS) || CARDS <= 0) throw new Error('BENCH_CARDS must be a positive integer')

const log = (message) => process.stderr.write(`${message}\n`)
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' }).trim()
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function removeBaseline() {
  // Unlink the shared node_modules first so removing the worktree can't touch it.
  const modules = join(BASELINE_DIR, 'node_modules')
  if (existsSync(modules) && lstatSync(modules).isSymbolicLink()) unlinkSync(modules)
  if (existsSync(BASELINE_DIR)) run('git', ['worktree', 'remove', '--force', BASELINE_DIR], ROOT)
  run('git', ['worktree', 'prune'], ROOT)
}

function prepareBaseline() {
  try {
    run('git', ['fetch', '--quiet', 'origin', 'main'], ROOT)
  } catch {
    log(`warning: git fetch failed, using local ${BASE_REF}`)
  }
  removeBaseline()
  run('git', ['worktree', 'add', '--detach', BASELINE_DIR, BASE_REF], ROOT)
  const sameLock =
    readFileSync(join(ROOT, 'package-lock.json'), 'utf8') ===
    readFileSync(join(BASELINE_DIR, 'package-lock.json'), 'utf8')
  if (sameLock) symlinkSync(join(ROOT, 'node_modules'), join(BASELINE_DIR, 'node_modules'), 'dir')
  else {
    log('baseline dependencies differ, running npm ci in the worktree…')
    execFileSync(npm, ['ci', '--no-audit', '--no-fund'], {
      cwd: BASELINE_DIR,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: '1' },
    })
  }
}

function build(dir) {
  execFileSync(npm, ['run', 'build'], { cwd: dir, stdio: ['ignore', 'ignore', 'inherit'] })
  return join(dir, 'dist')
}

function serve(distDir) {
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url, 'http://x').pathname)
    let file = join(distDir, path)
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
  const sorted = values.filter((value) => value !== null).sort((a, b) => a - b)
  if (!sorted.length) return null
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

// The board is ready when the column count badges add up to N and at least one
// card is in the DOM (a virtualized board never mounts all N cards).
function boardReady(expected) {
  const counted = [...document.querySelectorAll('.board [data-testid^="count-"]')].reduce(
    (sum, badge) => sum + Number(badge.textContent),
    0,
  )
  return counted >= expected && document.querySelector('.board [data-card-id]') !== null
}

// Installed before any page script: marks when the board is ready (see
// boardReady) and the following frame has been produced, and records long tasks.
function instrument(expected) {
  window.__bench = { longTasks: [] }
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      window.__bench.longTasks.push({ start: entry.startTime, duration: entry.duration })
  }).observe({ type: 'longtask', buffered: true })
  const poll = () => {
    if (window.__boardReady(expected)) {
      window.__bench.cardsInDom = performance.now()
      requestAnimationFrame(() => {
        const channel = new MessageChannel()
        channel.port1.onmessage = () => {
          window.__bench.ready = performance.now()
        }
        channel.port2.postMessage(null)
      })
    } else requestAnimationFrame(poll)
  }
  requestAnimationFrame(poll)
}

async function measureOnce(browser, url) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1440, height: 900 })
  await page.evaluateOnNewDocument(`window.__boardReady = ${boardReady}`)
  await page.evaluateOnNewDocument(instrument, CARDS)
  const cdp = await page.createCDPSession()
  await cdp.send('Performance.enable')
  try {
    await page.goto(`${url}/?seed=${CARDS}`, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__bench.ready !== undefined, {
      timeout: 180_000,
      polling: 100,
    })
    const initialRender = await page.evaluate(() => window.__bench.ready)

    await new Promise((done) => setTimeout(done, 500))
    await cdp.send('HeapProfiler.collectGarbage')
    const { metrics } = await cdp.send('Performance.getMetrics')
    const heapMb = metrics.find((metric) => metric.name === 'JSHeapUsedSize').value / 2 ** 20

    const scroll = await page.evaluate(async (duration) => {
      const target = [...document.querySelectorAll('.column__cards')].sort(
        (a, b) => b.scrollHeight - a.scrollHeight,
      )[0]
      const start = performance.now()
      let frames = 0
      await new Promise((done) => {
        const step = (now) => {
          frames++
          target.scrollTop += 40
          if (now - start < duration) requestAnimationFrame(step)
          else done()
        }
        requestAnimationFrame(step)
      })
      const end = performance.now()
      const longTaskMs = window.__bench.longTasks
        .filter((task) => task.start >= start && task.start < end)
        .reduce((sum, task) => sum + task.duration, 0)
      target.scrollTop = 0
      return { fps: (frames / (end - start)) * 1000, longTaskMs }
    }, SCROLL_MS)

    await page.evaluate(() => {
      window.__bench.keys = []
      let pending = null
      document.addEventListener('keydown', (event) => {
        pending = event.timeStamp
      }, true)
      document.addEventListener('input', () => {
        const start = pending
        const channel = new MessageChannel()
        channel.port1.onmessage = () => window.__bench.keys.push(performance.now() - start)
        channel.port2.postMessage(null)
      }, true)
    })
    await page.focus('#board-search')
    for (const [index, key] of [...QUERY].entries()) {
      await page.keyboard.type(key)
      await page.waitForFunction((count) => window.__bench.keys.length >= count, { timeout: 60_000 }, index + 1)
      await new Promise((done) => setTimeout(done, 50))
    }
    const keys = await page.evaluate(() => window.__bench.keys)
    return { initialRender, filterKey: median(keys), filterKeys: keys, fps: scroll.fps, longTaskMs: scroll.longTaskMs, heapMb }
  } finally {
    await context.close()
  }
}

async function supportsSeed(browser, url) {
  const page = await browser.newPage()
  try {
    await page.goto(`${url}/?seed=${CARDS}`, { waitUntil: 'load' })
    return await page
      .waitForFunction(
        boardReady,
        { timeout: 60_000, polling: 250 },
        CARDS,
      )
      .then(() => true, () => false)
  } finally {
    await page.close()
  }
}

const METRICS = [
  ['initialRender', 'initial render (ms)', 0],
  ['filterKey', 'filter latency (ms/key)', 1],
  ['fps', 'scroll FPS (avg)', 1],
  ['longTaskMs', 'scroll long tasks (ms)', 0],
  ['heapMb', 'JS heap after load (MB)', 1],
]

function table(results, baseLabel, currentLabel) {
  const rows = [['metric', baseLabel, currentLabel, 'change']]
  for (const [key, label, digits] of METRICS) {
    const base = results.baseline?.median[key] ?? null
    const current = results.current.median[key]
    const fmt = (value) => (value === null ? 'n/a' : value.toFixed(digits))
    const change =
      base === null || current === null
        ? 'n/a'
        : base === 0
          ? current === 0 ? '+0.0%' : 'n/a'
          : `${current >= base ? '+' : ''}${(((current - base) / base) * 100).toFixed(1)}%`
    rows.push([label, fmt(base), fmt(current), change])
  }
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)))
  return rows
    .map((row) => row.map((cell, column) => (column ? cell.padStart(widths[column]) : cell.padEnd(widths[column]))).join('  '))
    .join('\n')
}

async function main() {
  const currentSha = run('git', ['rev-parse', '--short', 'HEAD'], ROOT)
  const dirty = run('git', ['status', '--porcelain', '--', ':!bench-results.json'], ROOT) !== ''
  log(`preparing baseline worktree for ${BASE_REF}…`)
  prepareBaseline()
  const baseSha = run('git', ['rev-parse', '--short', 'HEAD'], BASELINE_DIR)
  log('building baseline…')
  const baselineDist = build(BASELINE_DIR)
  log('building current…')
  const currentDist = build(ROOT)

  const servers = { baseline: await serve(baselineDist), current: await serve(currentDist) }
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const targets = ['current']
    if (await supportsSeed(browser, servers.baseline.url)) targets.unshift('baseline')
    else log(`warning: ${BASE_REF} (${baseSha}) has no ?seed support; baseline column is n/a`)

    const runs = Object.fromEntries(targets.map((target) => [target, []]))
    for (let index = 0; index < RUNS; index++) {
      for (const target of targets) {
        log(`run ${index + 1}/${RUNS} ${target}…`)
        runs[target].push(await measureOnce(browser, servers[target].url))
      }
    }

    const summarize = (list) => ({
      median: Object.fromEntries(METRICS.map(([key]) => [key, median(list.map((entry) => entry[key]))])),
      runs: list,
    })
    const results = {
      date: new Date().toISOString(),
      cards: CARDS,
      runs: RUNS,
      query: QUERY,
      environment: {
        browser: await browser.version(),
        node: process.version,
        os: `${platform()} ${release()}`,
        cpu: `${cpus()[0]?.model ?? 'unknown'} x${cpus().length}`,
        memoryGb: Math.round(totalmem() / 2 ** 30),
      },
      baseline: runs.baseline ? { ref: BASE_REF, sha: baseSha, ...summarize(runs.baseline) } : null,
      current: { sha: currentSha, dirty, ...summarize(runs.current) },
    }
    writeFileSync(join(ROOT, 'bench-results.json'), `${JSON.stringify(results, null, 2)}\n`)

    console.log(`Orbit board benchmark: ${CARDS} cards, median of ${RUNS} runs, ${results.environment.browser}`)
    console.log(table(results, `baseline ${baseSha}`, `current ${currentSha}${dirty ? '+dirty' : ''}`))
    console.log('wrote bench-results.json')
  } finally {
    await browser.close()
    for (const { server } of Object.values(servers)) server.close()
    removeBaseline()
  }
}

await main()
