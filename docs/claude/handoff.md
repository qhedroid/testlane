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
**Current: v8** (`DEMO_SCHEMA_VERSION = 8` in `apps/web/src/fresh/data/demo-model.ts`)

| Version | What changed | Migration |
|---------|-------------|-----------|
| v5 | Baseline before admin panel work | — |
| v6 | Added `activeCustomFieldIds: string[]` and `projectSettings?: ProjectSettings` to `Project` | v5→v6 adds `activeCustomFieldIds: []` to any project missing it |
| v7 | Added `template`, `references`, `summary`, `customFieldValues` to `Case` | v6→v7 backfills new fields with defaults on existing cases |
| v8 | Added `caseKey: string` to `Case`; added `nextCaseNumByProject` to `DemoState` | v7→v8 generates `TC-XXXXX` keys for all existing cases; seeds `nextCaseNumByProject` from existing case counts |

---

## Completed work (this branch)

### Tasks 01–07 — all complete ✅

| Task | What it delivered | Commit |
|------|------------------|--------|
| Task 01 | Admin panel (`/admin`), `AdminProjectPanel` with 5 tabs, custom fields toggle | `398f45a` + fixups |
| Task 02 | CaseDetail tabs: Attachments, Defects, Requirements, Runs | — |
| Task 03 | `Case` extended with `template`/`references`/`summary`/`customFieldValues`; schema v7 | — |
| Task 03b | Panel resize fix (`start - dx`); min/max 540→720; CSS default 540px | — |
| Task 04 | Row context menu: Duplicate, Edit, Copy to, Move to, Open folder, Delete; `deleteCase` in FreshProvider | — |
| Task 05 | Last Results sparkline (status dot + 5 bars), Filter panel (field+operator+value, AND logic) | — |
| Task 06 | `TC-XXXXX` case IDs (schema v8, `nextCaseNumByProject`), pagination footer, folder search | — |
| Task 07 | CaseDetail metadata reorder, navigation arrows (← →), sparkline tooltip (per-cell), URL sync via `testCasePath`/`parseTestCaseKey` + new `[caseKey]/page.tsx` route | `b8f5c8a` |

### Pending Cursor prompts (not yet executed)

| File | Status | What it delivers |
|------|--------|-----------------|
| `task-08-toolbar-search-create-run.md` | **Ready to run** | Keyword search bar in tc-bar, "Create test run" dropdown in topbar (all cases or folder scope), modal with name input |
| `task-07b-bug-fixes-sparkline-arrowkeys.md` | **Ready to run** | 3 bug fixes + 2 improvements from Task 07 execution (see below) |

**Run task-07b first, then task-08.**

### Task 07b post-execution bugs

After Cursor executed Task 07 (commit `b8f5c8a`), the following issues were found:

1. **Panel flash on new projects** — clicking a case opens the panel for a fraction of a second then closes it. Root cause: `router.replace` in the URL sync effect triggers a full Next.js remount because `/cases` and `/cases/tc/[caseKey]` are different page files. Fix: `window.history.replaceState` instead.
2. **New case created in Unfiled** — "New case" button opens `CreateCaseModal` which initialises `folderId = ''` regardless of the selected folder. Fix: pass `targetFolderId` through `openCreateCase` and sync in the modal.
3. **Project switch flicker** — switching projects causes aggressive flickering. Same root cause as #1: `ProjectRouteSync` and `CasesScreen`'s URL sync effect both call `router.replace` and fight each other. Same fix.
4. **Shared sparkline tooltip** — all 5 bars in the sparkline show the same (most recent) result. Each bar should show its own run's details, with hover-delay dismiss and a black outline on the hovered bar.
5. **No arrow key navigation** — ArrowUp/Down should navigate cases when the detail panel is open.

All five are addressed in `task-07b`.

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
- **`router.replace` across different page files causes full remount** — `/cases` and `/cases/tc/[caseKey]` are backed by different `page.tsx` files. Any `router.replace` between them remounts the component. Always use `window.history.replaceState` for in-component URL updates that should not trigger navigation. `ProjectRouteSync` still uses `router.replace` correctly because it handles actual project switches.
- **`CreateCaseModal` is always mounted** (returns `null` when closed, not unmounted). `useState` initialises only once. Use a `useEffect` watching `createCaseOpen` to reset field values each time the modal opens.

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
