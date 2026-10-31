# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.1.0 - 2026-10-30

### Added

- Per-column WIP limits: a `WIP` pill in each column header sets an optional limit, and the header turns amber when the column holds more cards than its limit ([#60](https://github.com/thequantexplorer/orbit-demo/pull/60))
- Optional due dates on issues, shown on cards as a "Due <date>", "Due today" or "Overdue" chip that updates when the calendar day changes ([#20](https://github.com/thequantexplorer/orbit-demo/pull/20))
- "Clear" button on the Done column that removes all done issues after a confirmation dialog ([#11](https://github.com/thequantexplorer/orbit-demo/pull/11))
- Pull request template ([#8](https://github.com/thequantexplorer/orbit-demo/pull/8))

### Changed

- Board columns and the list view are virtualized with `@tanstack/react-virtual`, so large boards (e.g. `?seed=5000`) render only the visible cards; drag-and-drop and keyboard focus are preserved for offscreen cards ([#27](https://github.com/thequantexplorer/orbit-demo/pull/27))

### Fixed

- No bug-fix pull requests were merged in this release.
