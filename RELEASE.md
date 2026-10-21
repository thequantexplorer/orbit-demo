# Release checklist

Copy this list into the release PR and tick each item.

## 1. Prepare

- [ ] Start from an up-to-date `main` with CI green.
- [ ] Create a branch: `git checkout -b release/vX.Y.Z`.

## 2. Version bump

Orbit follows [semver](https://semver.org/): patch for fixes, minor for new
features, major for breaking changes (for example a `localStorage` schema
change that `src/storage.ts` cannot migrate).

- [ ] `npm version <patch|minor|major> --no-git-tag-version` — updates
      `package.json` and `package-lock.json` together.
- [ ] Confirm both files show the new version in the diff.

## 3. Changelog

- [ ] Add a section at the top of `CHANGELOG.md` (create the file on the
      first release), following [Keep a Changelog](https://keepachangelog.com/):

  ```markdown
  ## [X.Y.Z] - YYYY-MM-DD

  ### Added
  - Per-column WIP limits (#60)

  ### Changed
  ### Fixed
  ```

- [ ] List every merged PR since the last tag:
      `git log --merges --oneline vPREV..HEAD` (all of history on the first release).
- [ ] Call out anything that affects saved boards or appearance settings.

## 4. Automated checks

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Optional for performance-sensitive changes: `npm run bench` (see
      [BENCHMARK.md](BENCHMARK.md)); no large regressions against the last release.

## 5. Smoke tests

Run against the production build: `npm run build && npm run preview`, then
open the printed URL in a fresh browser profile (or clear `localStorage`).

- [ ] Seed board loads with nine issues across Backlog, In Progress, Review, Done.
- [ ] Drag a card across columns; counts update and the order is kept.
- [ ] Reorder a card within a column.
- [ ] Keyboard drag: focus a card, Space, arrow keys, Space; Escape cancels.
- [ ] Create an issue inline and with `C`; it appears in the right column.
- [ ] Edit title, status, labels, assignee and due date in the issue editor;
      `Ctrl/Cmd + Enter` saves.
- [ ] Due chips show "Due <date>", "Due today" and "Overdue" correctly.
- [ ] WIP limit: set a limit below the column count; the header turns amber.
- [ ] Search, label and assignee filters narrow the board; List view matches.
- [ ] `Ctrl/Cmd + K` command menu searches issues and runs commands; `?` shows shortcuts.
- [ ] Overview and My issues views render.
- [ ] Toggle dark appearance; reload; board edits and appearance persist.
- [ ] Reset board restores the nine original issues after confirmation.
- [ ] `/?seed=5000` loads and scrolls smoothly, and is not saved after reload
      without `?seed`.
- [ ] Mobile width (390 × 844): search, open, edit and save an issue.
- [ ] No errors in the browser console.

## 6. Ship

- [ ] Open the release PR with the version bump and changelog; merge once CI passes.
- [ ] Tag the merge commit and push the tag:
      `git tag vX.Y.Z && git push origin vX.Y.Z`.
- [ ] Create a GitHub release from the tag, pasting the changelog section:
      `gh release create vX.Y.Z --notes-file <notes.md>`.
