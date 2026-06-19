# Claude Session Handoff

> Read this at the start of every new Claude (Cowork) session on this project.
> Update this file at the end of any session where meaningful work was done.

---

## Claude's role (read this first)
Claude is a **planning and prompt-drafting assistant**. It does not implement changes to project source files.

- Feature work → draft a Cursor agent prompt in `docs/cursor-prompts/`, then hand it to the user to run in Cursor.
- The only files Claude writes freely are `docs/claude/**` and `docs/cursor-prompts/**`.
- All actual code/config changes are made by Cursor agents working from those prompts.
- If explicitly asked to make a specific file change, that's the exception — not the default.

---

## Active branch
`mvp-test-cases` (branched from `mvp-main`)

---

## Schema version
**Current: v7** (`DEMO_SCHEMA_VERSION = 7` in `apps/web/src/fresh/data/demo-model.ts`)

| Version | What changed | Migration |
|---------|-------------|-----------|
| v5 | Baseline before admin panel work | — |
| v6 | Added `activeCustomFieldIds: string[]` and `projectSettings?: ProjectSettings` to `Project` | v5→v6 adds `activeCustomFieldIds: []` to any project missing it |
| v7 | Added `template`, `references`, `summary`, `customFieldValues` to `Case` | v6→v7 backfills new fields with defaults on existing cases |

> Task 06 will bump to v8 (adds `caseKey` to `Case`). The prompt is written but not yet run.

---

## Completed work (this branch)

### Panel resize fixes — Task 03b ✅
- Drag direction fixed in `useResizablePanes.ts`: `start - dx` for right-anchored case detail panel
- Min/max updated (300→540 / 540→720); CSS default width updated (360px→540px) in `fresh.css`

### Row context menu — Task 04 ✅
- `DELETE_CASE` action and `deleteCase(caseId)` added to `FreshProvider`
- Per-row "..." button with context menu: Duplicate, Edit, Copy to…, Move to…, Open folder, Delete
- `pendingEditRef` + `startEditOnMount` pattern for triggering edit mode from outside `CaseDetail`
- CSS added: `.row-ctx-btn`, `.ctx-menu`, `.ctx-item`, `.ctx-item-danger`, `.ctx-sep`

### Commit style updated ✅
- `CLAUDE.md` commit body format changed: bullets now grouped by file, natural language phrasing
- Claude will automatically provide a commit message after editing any markdown in `docs/claude/**` or `docs/cursor-prompts/**`

### Case detail tabs — Task 02 ✅
- 4 new tabs added to CaseDetail: Attachments, Defects, Requirements, Runs
- `DetailTab` union extended to 7 values; `.dp-empty-tab` CSS class added to `fresh.css`

### Case detail fields — Task 03 ✅
- `Case` extended with `template`, `references`, `summary`, `customFieldValues`
- Schema bumped to v7; `migrateProjectCustomFields` fixed to stamp `schemaVersion: 6` (not `DEMO_SCHEMA_VERSION`) to prevent migration chain being skipped
- Details tab renders new built-in fields + dynamic custom fields from `activeCustomFieldIds`
- `adminSettings` destructured and passed into `CaseDetail` from `CasesScreen`

### Admin panel — Task 01 ✅
- New global route: `/admin` (outside the `(app)` route group)
- Left sidebar now has an **Admin** option under Settings
- 11 admin pages wired to FreshProvider store with live reads + dispatch
- `AdminProjectPanel.tsx`: slide-in detail panel for projects with 5 tabs (Details, Settings, Custom fields, Users shell, Integrations shell)
  - Opens maximized by default (full-width, not side-by-side)
  - Custom fields tab reads `activeCustomFieldIds` from the project and toggles them via `UPDATE_ACTIVE_CUSTOM_FIELDS`
- Commits on `mvp-test-cases`: `398f45a` (panel), layout fix commit, maximize-by-default commit

### Cursor prompts written — Tasks 02–06 + 03b ✅
All saved to `docs/cursor-prompts/`. Ready to hand to Cursor agents one at a time.

| File | What it does |
|------|-------------|
| `task-02-case-detail-tabs.md` | ✅ Done. Add 4 missing tabs to CaseDetail (Attachments, Defects, Requirements, Runs). No model changes. |
| `task-03-case-detail-fields.md` | ✅ Done. Add `template`/`references`/`summary`/`customFieldValues` to `Case`; bump to schema v7; render custom fields dynamically in Details tab. |
| `task-03b-panel-resize-fixes.md` | ✅ Done. Fixed inverted drag direction (`start - dx`); updated min 300→540, max 540→720; CSS default 360→540. |
| `task-04-row-context-menu.md` | ✅ Done. Per-row "..." context menu: Duplicate, Edit, Copy to, Move to, Open folder, Delete. Added `deleteCase` to FreshProvider. |
| `task-05-last-results-filter-panel.md` | **Next.** Replace Last Run pill with status dot + sparkline. Replace non-functional filter chips with a proper Filter panel (field+operator+value, AND logic). |
| `task-06-pagination-ids-folder-search.md` | Human-readable `TC-XXXXX` case IDs (schema v8), pagination footer, folder search input in sidebar. |

---

## Key decisions (do not revisit without good reason)

- **"Type" is a built-in Case field, not a custom field.** Do not add it to `adminSettings.customFields` seed data. The DP project's `activeCustomFieldIds` seeds Priority, References, and Is Automated only.
- **Panel opens maximized by default.** `AdminProjectPanel` initialises `isMaximized: true` when `selectedProjectId` is set.
- **One Cursor agent per task.** Each prompt has a "Context from previous task" section for fresh agents. Remove that section when continuing with the same agent.
- **Always run `pnpm build` before committing.** Zero TS errors required.
- **Dev server restart command:** `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
- **Commit after each task** as a checkpoint for easy rollback.
- **No backend work.** If a task appears to require it, stop and ask for confirmation.

---

## Gotchas encountered

- **Git amend broke the merge commit** when run from the sandbox (set the wrong committer, caused 57 files to appear unstaged). Fix: `git reset --hard origin/mvp-main` from the user's terminal, then re-amend with the correct `GIT_COMMITTER_NAME` env var.
- **`.git/HEAD.lock`** blocked amend from the sandbox — user had to remove it manually from their terminal.
- **`adminSettings` is not in the default `useFresh()` destructure** in CasesScreen — fixed in Task 03; it is now destructured there.
- **Case detail panel drag direction**: right-anchored panels need `start - dx` not `start + dx` — covered in task-03b prompt.
- **`formatRunKey` exists in `demo-model.ts`** — Task 06's `formatCaseKey` should follow the exact same pattern and live next to it.

---

## Reference: seed data (DP project)

- Project ID: `proj-ti-core`, key: `DP`
- `activeCustomFieldIds`: `['admin-cf-priority', 'admin-cf-references', 'admin-cf-automated']`
- Custom field names: Priority (Text), References (Multi-Line Text), Is Automated (Boolean)

---

## What to do at the start of a new session

1. Read this file.
2. Ask the user which task Cursor has just finished (or is about to start) to calibrate the current state.
3. Update the "Completed work" and "Schema version" sections if tasks have been executed since this was last written.
