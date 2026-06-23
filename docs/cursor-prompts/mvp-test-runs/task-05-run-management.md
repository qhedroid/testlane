# Task 05 — Run Management: Auto-open, Empty States, Creation Navigation, No-cases Guards

## Context from previous tasks

Branch: `mvp-test-runs`. Tasks 01–04 complete.

- `RunsScreen.tsx` at `apps/web/src/fresh/screens/RunsScreen.tsx`.
- `CreateRunModal.tsx` at `apps/web/src/fresh/components/CreateRunModal.tsx`.
- `CasesScreen.tsx` at `apps/web/src/fresh/screens/CasesScreen.tsx`.
- `useFresh()` exposes: `activeRuns`, `activeCases`, `activeProject`, `createRun({ name, description?, caseIds? })`.
- `createRun` returns `{ runKey: string }`.
- `FreshProvider` stores the last-selected run per project in `state.currentRunIdByProject[projectId]`.
  `useFresh()` exposes `setCurrentRun(runId)` and `activeRuns` (runs for the active project).
- `CREATE_RUN` reducer: if `caseIds` is provided it uses them; if `caseIds` is omitted it falls back to ALL active project cases. **This is the current bug** — omitting `caseIds` pre-fills the run with every case.
- `testRunPath(projectKey, runKey?)` builds the run URL.
- `projectHref(module)` in `CasesScreen` returns the URL for a module within the active project.
- The empty-state currently shown when a run is selected but has no cases: generic "Select a test run" card.
- Testiny's empty-run state (verified): clipboard+plus icon, heading "Add test case to test run", subtitle "Test runs contain test cases to be executed on your test target.", primary "Add to test run" button.

---

## Objective

Five improvements across three files:

1. **Auto-open a run** — when navigating to `/testcases` with no `runKey` in the URL but `activeRuns.length > 0`, automatically navigate to the last-selected run (from `currentRunIdByProject`) or `activeRuns[0]` if none is recorded.
2. **Testiny-style empty-run message** — when a run IS selected but has zero cases, replace the generic empty state with the Testiny-style "Add test case to test run" message.
3. **`CreateRunModal` creates empty runs** — pass `caseIds: []` so runs start with no cases.
4. **`CreateRunModal` no-cases guard** — if `activeCases.length === 0`, disable the Create button and show an inline message.
5. **Navigate to the new run after creation from `CasesScreen`** — use the returned `runKey` to push directly to the run URL instead of the bare testruns base.
6. **`CasesScreen` no-cases guard** — disable the "Create test run" button/dropdown if `activeCases.length === 0`.

---

## Files to change

### 1. `apps/web/src/fresh/screens/RunsScreen.tsx`

#### A — Auto-open run on navigation

Read the existing `useEffect` that handles unknown-run redirect (currently redirects to the testruns base when `runKeyFromUrl` is set but `currentRun` is undefined). Add a **second effect** that fires when there is NO `runKeyFromUrl` but runs exist:

```tsx
// Auto-select a run when arriving at /testruns with no run in the URL
useEffect(() => {
  if (runKeyFromUrl) return          // URL already has a run — do nothing
  if (activeRuns.length === 0) return // no runs — show the empty state

  // Prefer the last-selected run for this project
  const lastRunId = state.currentRunIdByProject?.[activeProject.id]
  const preferred = lastRunId
    ? activeRuns.find((r) => r.id === lastRunId)
    : undefined
  const target = preferred ?? activeRuns[0]
  router.push(testRunPath(activeProject.key, target.runKey))
}, [activeRuns.length, runKeyFromUrl, activeProject.key, activeProject.id])
```

> **Note:** `state` is not directly available in `RunsScreen` — use `useFresh()` to get `currentRunIdByProject` if it is exposed, or read via `activeRuns` order (most recently created first is fine as a fallback). If `currentRunIdByProject` is not exposed on the context, fall back to `activeRuns[0]` only. Do not modify `FreshProvider` in this task.

Read `FreshProvider.tsx` to check whether `currentRunIdByProject` is already on the context value. If it is not, the fallback of `activeRuns[0]` is sufficient for now.

#### B — Testiny-style empty-run message

Find the section that renders the empty state when a run IS selected but has no cases (currently shows "Select a test run"). Replace it with:

```tsx
{/* Run selected but has no cases */}
<div className="empty-state on" style={{ position: 'relative', flex: 1 }}>
  <div className="empty-card">
    <i className="ti ti-clipboard-plus" style={{ fontSize: 36, color: 'var(--accent)', marginBottom: 10 }} />
    <div className="empty-title">Add test case to test run</div>
    <div className="empty-copy">Test runs contain test cases to be executed on your test target.</div>
    <button
      type="button"
      className="btn btn-p"
      style={{ marginTop: 12 }}
      onClick={() => {/* wire to add-cases modal in Task 07 — for now leave onClick empty */}}
    >
      <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add to test run
    </button>
  </div>
</div>
```

The condition that shows this state is: `currentRun` is defined AND `currentRun.caseOrder.length === 0`.

---

### 2. `apps/web/src/fresh/components/CreateRunModal.tsx`

#### A — Create empty runs

In `handleSubmit`, pass `caseIds: []` explicitly:

```ts
// Before:
const { runKey } = createRun({
  name: name.trim(),
  description: description.trim() || undefined,
})

// After:
const { runKey } = createRun({
  name: name.trim(),
  description: description.trim() || undefined,
  caseIds: [],   // always start empty; cases are added via the Add Cases flow
})
```

#### B — No-cases guard

Add `activeCases` from `useFresh()`:

```ts
const { activeProject, createRun, activeCases } = useFresh()
```

Where `activeCases` is `useFresh().listActiveProjectTestCases()` — check how it is exposed on the context (it may be a computed array or a function call). Use whichever form is available.

Add an inline message when there are no cases:

```tsx
{/* In the modal body, below the description field: */}
{activeCases.length === 0 && (
  <div style={{ fontSize: 11.5, color: 'var(--text3)', background: 'var(--hover)', borderRadius: 4, padding: '6px 10px' }}>
    This project has no test cases yet. Add test cases before creating a run.
  </div>
)}
```

Update `canSubmit` to also require at least one case:

```ts
const canSubmit = !nameError && !!name.trim() && activeCases.length > 0
```

---

### 3. `apps/web/src/fresh/screens/CasesScreen.tsx`

#### A — Navigate to the new run directly

In `doCreateRun`, use the returned `runKey`:

```ts
// Before:
createRun({ name: createRunModal.name.trim(), caseIds })
setCreateRunModal(null)
router.push(projectHref('testruns'))

// After:
const { runKey } = createRun({ name: createRunModal.name.trim(), caseIds })
setCreateRunModal(null)
router.push(testRunPath(activeProject.key, runKey))
```

Import `testRunPath` from `'../lib/project-routes'` if not already imported.

#### B — No-cases guard for the "Create test run" button

Find the "Create test run" dropdown button (in `FreshTopbar`'s `actions`). Disable it when `activeCases.length === 0`:

```tsx
<button
  type="button"
  className="btn btn-p"
  disabled={activeCases.length === 0}
  title={activeCases.length === 0 ? 'Add test cases before creating a run' : undefined}
  onClick={() => setCreateRunMenuOpen((v) => !v)}
>
  <i className="ti ti-player-play" style={{ fontSize: 12 }} /> Create test run
  <i className="ti ti-chevron-down" style={{ fontSize: 10, marginLeft: 3 }} />
</button>
```

Also guard `doCreateRun` itself as a safety net:
```ts
function doCreateRun() {
  if (!createRunModal?.name.trim()) return
  if (activeCases.length === 0) return
  // ... rest of function
}
```

---

## Files that will NOT change
- `demo-model.ts`, `migrate-demo-state.ts`
- `FreshProvider.tsx` — read it to check `currentRunIdByProject` availability but do not edit it
- `project-routes.ts`, `prototype-runs.css`, `fresh.css`
- Any other file

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/screens/RunsScreen.tsx
Read apps/web/src/fresh/components/CreateRunModal.tsx
Read apps/web/src/fresh/screens/CasesScreen.tsx
Read apps/web/src/fresh/data/FreshProvider.tsx
```

---

## Step 2 — Make changes

Apply in order: `RunsScreen.tsx` → `CreateRunModal.tsx` → `CasesScreen.tsx`.

---

## Step 3 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required.

---

## Step 4 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. **Auto-open**: navigate to `/DP/testruns` with no run in the URL — confirm the first (or last-used) run opens automatically.
3. **Switch projects**: switch to a project with runs — confirm a run opens automatically on arrival.
4. **Empty run state**: open the "EMPTY TEST RUN" (or create a new run via CreateRunModal) — confirm the "Add test case to test run" message and button appear instead of the old generic empty state.
5. **CreateRunModal — empty run**: create a new run via the "+ Create" button on the Test Runs page — confirm it opens to the Testiny-style empty state (no cases pre-filled).
6. **CreateRunModal — no-cases guard**: switch to a project that has zero test cases, open CreateRunModal — confirm the Create button is disabled and the warning message appears.
7. **CasesScreen navigation**: create a run from the Test Cases page — confirm the browser navigates directly to that specific run (URL includes the run key), not just the base testruns page.
8. **CasesScreen button guard**: on a project with no test cases, confirm the "Create test run" button is disabled.

---

## Step 5 — Commit

Run `git diff HEAD` and cross-check actual changes against the message below. Adjust if anything differs, then commit.

```
Test runs: auto-open run, Testiny empty-run state, empty run creation, navigation fixes

`RunsScreen.tsx`
* Added effect to auto-navigate to last-selected (or first) run when arriving at /testruns with no run in the URL
* Replaced generic "Select a test run" empty state (when run has no cases) with Testiny-style "Add test case to test run" card

`CreateRunModal.tsx`
* Passes `caseIds: []` to `createRun` so newly created runs always start empty
* Added no-cases guard: disables Create button and shows an inline warning when the project has no test cases

`CasesScreen.tsx`
* `doCreateRun` now uses the returned `runKey` to navigate directly to the new run instead of the bare testruns base
* "Create test run" button is disabled with a tooltip when `activeCases.length === 0`
```

---

## Step 6 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
