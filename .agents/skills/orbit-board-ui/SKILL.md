---
name: orbit-board-ui
description: Use for any visual, CSS-token, or accessibility change to Orbit's board screen (src/index.css, App.tsx, ColumnView, CardView, SortableCard), and whenever a task asks you to deploy a preview, run an axe audit, or record a UI walkthrough of orbit-demo.
---

# Orbit board UI changes

Lessons from the most expensive orbit-demo sessions (board redesign directions,
$6-11 each). Most of the cost was rediscovering the same facts and re-recording
walkthroughs. Do these things up front instead.

## 1. Environment (every new shell)

- Run `source ~/.nvm/nvm.sh && nvm use 24` first in **every** new shell, including
  one-off puppeteer/axe scripts. Without it you get `node: command not found`.
- CI (`.github/workflows/ci.yml`) runs `npm ci && npm run lint && npm test && npm run build`
  on **Node 22**. Run the same commands locally before you push.
- `npm run lint` has one existing `set-state-in-effect` warning in `App.tsx`. Ignore it.
- Free a port with `fuser -k 4173/tcp`. Don't use `pkill -f "...4173..."`: the
  pattern also matches your own shell's command line, so it kills your shell.

## 2. Deploys and previews: don't search for a deploy tool

- No session has had a static-deploy or devinapps.com publish tool. Don't spend
  turns searching for one with different wording. If the task asks for a public
  deploy, try one tool search at most. Then use the fallback below and say so in
  the PR and structured output (leave `preview_url` empty and explain why).
- `browser_preview` URLs (`5173--<session>.preview.devinapps.com`) need a Devin
  login, so they are not public. Testing agents can't use them either.
- Fallback for recordings and audits: run
  `npm run build && npx vite preview --port 4173 --strictPort`, then test against
  `http://localhost:4173`.

## 3. Where things live (read these parts, not the whole file)

`src/index.css` is about 2,300 lines and has no section comments. Grep for the
selector you need instead of paging through the file:

| Area | Selector / line (approx.) |
| --- | --- |
| Light tokens | `:root {` ~L1 |
| Dark tokens | `:root[data-theme='dark']` ~L37 |
| Sidebar | `.sidebar {` ~L220 |
| Board / columns / cards | `.board {` ~L927, `.column {` ~L937, `.card {` ~L1060 |
| List view | `.issue-list` ~L1353 |
| Dialogs / command menu | `.dialog` ~L1585, `.command-*` ~L1850 |
| Responsive breakpoints | `@media` 1600 / 1200 / 1000 / 760 / 430, from ~L1995 |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` at the end |

- Edit rules in place, or insert overrides **before** the `@media` blocks
  (~L1995). If you append overrides at the end of the file, they beat the
  responsive rules.
- When you change card padding, gaps, or font size, also update `CARD_GAP` and
  `estimateCardHeight` in `src/components/ColumnView.tsx`. The board is
  virtualized (`@tanstack/react-virtual`), so if those estimates are wrong, the
  list jumps or overlaps.
- Theme: `App.tsx` stores `kanban-theme` in localStorage and sets
  `document.documentElement.dataset.theme`. Don't change the `kanban-board:v1`
  storage key or the data model.
- `scripts/bench.mjs` selects `.board [data-card-id]`, `.column__count`, and
  `.column__cards`. Keep those hooks if you change markup.

## 4. Known accessibility issues on `main`: fix them before the first audit

Every redesign session found these on its own and then had to stop and fix them.
Fix them in your first pass:

1. **`aria-allowed-role`**: `CardView.tsx` renders `<article>`, and dnd-kit's
   `attributes` add `role="button"` to it. Change the element to `<div>`. CSS and
   the bench script only use class names and `data-card-id`, so nothing else breaks.
2. **`heading-order`**: the `Filter issues` and `Display options` popover
   headings in `App.tsx` are `<h3>`s that come right after the page `<h1>`.
   Change them to `<h2>` (and keep the same visual size in CSS).
3. **Reduced motion**: the `DragOverlay` `dropAnimation` in `App.tsx` ignores
   `prefers-reduced-motion`, and the CSS media query can't reach it. Pass
   `dropAnimation={reducedMotion ? null : {...}}` using a `matchMedia` check.
4. **Enter on a focused card opens and then immediately closes the editor.**
   `SortableCard.tsx` calls `onOpen` on Enter keydown. The modal autofocuses its
   title input, the same Enter triggers implicit form submit, the editor closes,
   and an "Issue updated" toast appears. Call `event.preventDefault()` before
   `onOpen(card.id)`. This bug forced two sessions to throw away a finished
   recording and record again.

## 5. Verify with scripts before you record

Recording is the most expensive step. Never record until a headless check passes.

- Puppeteer is already a devDependency. Install axe outside the repo so the
  lockfile doesn't change: `npm i --prefix /tmp/axe axe-core`, then inject
  `/tmp/axe/node_modules/axe-core/axe.min.js` with `page.addScriptTag`.
- Audit light **and** dark (set `localStorage['kanban-theme']`), with the filter
  popover open and with the editor open. Also run one narrow viewport (≤760px).
  On mobile, hide button labels with a visually-hidden class, not
  `display:none`, so buttons keep accessible names.
- Before you hand off to the testing agent, run one puppeteer smoke script that
  covers every walkthrough step: board loads with 9 seeded cards (counts
  4/2/1/2), Enter on a card keeps the editor open, keyboard drag
  (Space → arrows → Space), filter, and theme toggle. Fix any failures first,
  then record **once**.
- To compare with `main`, create the worktree **before** you change
  dependencies:
  `git worktree add /tmp/main-wt origin/main && ln -s "$PWD/node_modules" /tmp/main-wt/node_modules`.
  In one session, the branch had already changed its `@fontsource/*` packages,
  so the `main` build couldn't resolve `@fontsource/inter`.
- Use `?seed=N` (for example `?seed=200`) when density or virtualization needs to
  be visible. The default board has only 9 cards.

## 6. Recording and PR

- Tell the testing agent which URL to use (`http://localhost:4173`), the target
  viewport, and that the public preview needs a login. It loses several minutes
  per run working out Chrome zoom and device scale for a ~1440px CSS viewport.
- Open the PR as soon as CI-equivalent checks pass. Then update the body with
  the recording and screenshot links, using `git_update_pr` instead of a second PR.
- PR titles start with `[orbit]`. Fill in `.github/pull_request_template.md`,
  including the commands you ran and their results.
