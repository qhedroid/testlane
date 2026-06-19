# Claude Session Handoff

> Read this at the start of every new Claude (Cowork) session on this project.
> Update this file at the end of any session where meaningful work was done.

---

## Active branch
`mvp-test-cases` (branched from `mvp-main`)

---

## Schema version
**Current: v6** (`DEMO_SCHEMA_VERSION = 6` in `apps/web/src/fresh/data/demo-model.ts`)

| Version | What changed | Migration |
|---------|-------------|-----------|
| v5 | Baseline before admin panel work | — |
| v6 | Added `activeCustomFieldIds: string[]` and `projectSettings?: ProjectSettings` to `Project` | v5→v6 adds `activeCustomFieldIds: []` to any project missing it |

> Tasks 02–06 will bump the schema further (v7 adds Case fields, v8 adds `caseKey`) but those tasks have not been executed yet — the prompts are written, not run.

---

## Completed work (this branch)

### Admin panel — Task 01 ✅
- New global route: `/admin` (outside the `(app)` route group)
- Left sidebar now has an **Admin** option under Settings
- 11 admin pages wired to FreshProvider store with live reads + dispatch
- `AdminProjectPanel.tsx`: slide-in detail panel for projects with 5 tabs (Details, Settings, Custom fields, Users shell, Integrations shell)
  - Opens maximized by default (full-width, not side-by-side)
  - Custom fields tab reads `activeCustomFieldIds` from the project and toggles them via `UPDATE_ACTIVE_CUSTOM_FIELDS`
- Commits on `mvp-test-cases`: `398f45a` (panel), layout fix commit, maximize-by-default commit

### Cursor prompts written — Tasks 02–06 ✅
All saved to `docs/cursor-prompts/`. Ready to hand to Cursor agents one at a time.

| File | What it does |
|------|-------------|
| `task-02-case-detail-tabs.md` | Add 4 missing tabs to CaseDetail (Attachments, Defects, Requirements, Runs). No model changes. |
| `task-03-case-detail-fields.md` | Add `template`/`references`/`summary`/`customFieldValues` to `Case`; bump to schema v7; render custom fields dynamically in Details tab. |
| `task-04-row-context-menu.md` | Per-row "..." context menu: Duplicate, Edit, Copy to, Move to, Open folder, Delete. Adds `deleteCase` action to FreshProvider. |
| `task-05-last-results-filter-panel.md` | Replace Last Run pill with status dot + sparkline. Replace non-functional filter chips with a proper Filter panel (field+operator+value, AND logic). |
| `task-06-pagination-ids-folder-search.md` | Human-readable `TC-XXXXX` case IDs (schema v8), pagination footer, folder search input in sidebar. |

---

## Key decisions (do not revisit without good reason)

- **"Type" is a built-in Case field, not a custom field.** Do not add it to `adminSettings.customFields` seed data. The DP project's `activeCustomFieldIds` seeds Priority, References, and Is Automated only.
- **Panel opens maximized by default.** `AdminProjectPanel` initialises `isMaximized: true` when `selectedProjectId` is set.
- **One Cursor agent per task.** Each prompt has a "Context from previous task" section for fresh agents. Remove that section when continuing with the same agent.
- **Always run `pnpm build` before committing.** Zero TS errors required.
- **Dev server restart command:** `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
- **Commit after each task** as a checkpoint for easy rollback.
- **No backend work.** If a task appears to require it, stop and ask Jamil for confirmation.

---

## Gotchas encountered

- **Git amend broke the merge commit** when run from the sandbox (set Jamil Khan as committer, caused 57 files to appear unstaged). Fix: `git reset --hard origin/mvp-main` from the user's terminal, then re-amend with `GIT_COMMITTER_NAME="CrimsonDelta"` env var.
- **`.git/HEAD.lock`** blocked amend from the sandbox — user had to remove it manually from their terminal.
- **`adminSettings` is not in the default `useFresh()` destructure** in CasesScreen. When Task 03 is executed, Cursor will need to add it explicitly.
- **`formatRunKey` exists in `demo-model.ts`** — Task 06's `formatCaseKey` should follow the exact same pattern and live next to it.

---

## Reference: seed data (DP project)

- Project ID: `proj-ti-core`, key: `DP`
- `activeCustomFieldIds`: `['admin-cf-priority', 'admin-cf-references', 'admin-cf-automated']`
- Custom field names: Priority (Text), References (Multi-Line Text), Is Automated (Boolean)

---

## What to do at the start of a new session

1. Read this file.
2. Ask Jamil which task Cursor has just finished (or is about to start) to calibrate the current state.
3. Update the "Completed work" and "Schema version" sections if tasks have been executed since this was last written.
