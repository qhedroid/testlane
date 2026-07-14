# Changelog

All notable changes are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · Versioning: [SemVer](https://semver.org/)

---

## [Unreleased]

### Planned — Phase 5 (Next)
- Drizzle schema definition (MySQL dialect)
- OpenSearch index configuration and sync layer
- Auth architecture design

---

## [1.2.0] — 2026-05 — Final consolidation pass

### Branding
- Product renamed to **Testlane** — name, mark, wordmark, and page title updated throughout
- Sidebar mark replaced with Testlane SVG mark (chevrons + baton dot)
- Removed workspace subtitle; replaced with "QA Workspace"
- All internal-only references removed from public-facing files

### Navigation
- Sidebar collapse fixes: toggle button hides when collapsed; mark centres correctly
- Settings and Integrations items given correct `sbi-text` wrapper for consistent collapse behaviour
- Module switcher retained as core navigation pattern

### Test Runs
- Left run list panel removed; replaced with compact searchable run selector dropdown
- Run selector shows status pill, name, completion %, and case count
- Run selector supports live search filtering
- Resize handle added between exec case pane and exec detail pane

### Test Cases
- Resize handle added between suite tree and case table

### Architecture
- All references updated to confirmed stack: AWS hosting, MySQL, OpenSearch
- PostgreSQL and Meilisearch references removed from all documents

### Documentation
- README finalised with Testlane branding and current architecture
- `design-system.md` created — colour tokens, typography, component patterns
- `ux-philosophy.md` created — view-by-view rationale and interaction principles
- Repository prepared for migration to long-term implementation workspace

---

## [1.1.0] — 2026-05

### Prototype
- Top-bar project/module switcher dropdown added to all views
- Redundant Search item removed from sidebar
- Audit History moved to lower sidebar utility section (P0)
- Dashboard run cards: independent expand/collapse, two per row
- eTMF run card defaults to expanded Assignees tab showing case counts
- Quick Create inline input added to Test Cases
- Empty folder state added for GlobalLearn suites
- Suite tooltip added
- Test Run exec detail panel: six tabs (Details / Steps / Activity / History / Comments / Defects)
- Close and fullscreen toggle added to exec detail panel
- Case search/filter within exec panel
- Priorities toggle in runs toolbar
- Test Plans: four-tab detail (Overview / Test Cases / Runs / Metrics)
- Test Plans: metadata fields (Created by, Created at, Runs spawned)
- Test Plans: Test Cases tab with expandable suites
- Test Plans: Metrics tab with trend chart
- Run history renamed to "Runs created / spawned from this plan"
- Shaun Sevume added throughout — run assignees, exec ownership, plan authorship, comments

### Architecture
- Stack revised: AWS mandatory, MySQL replaces PostgreSQL, OpenSearch replaces Meilisearch
- NoSQL assessment completed: MySQL primary, OpenSearch for search, NoSQL deferred

---

## [1.0.0] — 2026-04

### Prototype
- Initial interactive HTML prototype — Dashboard, Test Cases, Test Plans, Test Runs
- Global search Cmd K command palette
- Audit History view
- Keyboard shortcuts throughout
- Sidebar collapse, project switcher placeholder, Pinned Modules
- Run sealing UI, Needs Attention widget, module coverage grid

### Architecture
- Service layer design confirmed
- Data model confirmed (14 tables)
- Execution snapshotting confirmed
- Append-only audit log confirmed

### Documentation
- Project reference document established
- Competitor analysis complete
- MVP scope and phase 2 roadmap defined
- Stakeholder proposal deck created
