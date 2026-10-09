# Board benchmark

A reproducible performance benchmark for the board with thousands of cards.

```bash
npm install          # installs Puppeteer and its headless Chromium
npm run bench        # 5,000 cards, median of 5 runs
BENCH_CARDS=10000 npm run bench
```

`npm run bench` builds the current checkout and `origin/main` (in a temporary
git worktree under `.bench/`), serves both production builds locally, and opens
each at `/?seed=N` in headless Chromium. Runs alternate between the two builds
so both see the same machine conditions. It prints a table of baseline vs
current with the % change and writes every run to `bench-results.json`.
Compare the % change column across machines; absolute numbers depend on the
hardware.

| Metric | How it is measured |
|---|---|
| initial render | navigation start → all N cards in the DOM and the next frame produced |
| filter latency | type `onboarding` into the board search one key at a time; keydown → DOM updated and main thread free, median per key |
| scroll FPS / long tasks | scroll the longest column for 3 s; average frames per second and total long-task time |
| JS heap after load | `JSHeapUsedSize` after a forced GC |

Options (environment variables): `BENCH_CARDS` (default 5000), `BENCH_RUNS`
(default 5), `BENCH_BASE` (baseline git ref, default `origin/main`) and
`BENCH_QUERY` (default `onboarding`). If the baseline ref predates `?seed`
support its column shows `n/a`.

## Seeded boards

Open the app with `?seed=N` (for example `http://localhost:5173/?seed=5000`)
to load N generated cards. The generator uses a fixed random seed, so every run
gets the same titles, labels, assignees, due dates and column spread. Seeded
boards are never saved to `localStorage`; without `?seed` the app loads your
saved board as usual.
