# Task 05b — Fix Project-Switch Flicker in RunsScreen and CasesScreen

## Background — why this bug exists

When the user clicks a project in `ProjectSwitcher`, `handleSelect` calls two things back-to-back:

```ts
setActiveProject(P2.id)                            // 1. state updates synchronously
router.push(switchProjectPath(pathname, P2.key))   // 2. navigation is async
```

React re-renders immediately after step 1 with the new state (`activeProject = P2`,
`activeRuns = P2.runs`) — but `usePathname()` and `useParams()` still return the **old**
values because the navigation from step 2 hasn't committed yet. This creates a brief
transition window where the state is ahead of the URL.

### RunsScreen — the severe case

While on `/P1/testruns/tr/00001`, switching to P2 creates this window:

| | Value during window |
|---|---|
| `activeProject.key` | `'P2'` (already updated) |
| `activeRuns` | P2's runs |
| `params.runKey` / `pathname` | `'00001'` / `/P1/testruns/tr/00001` (stale) |
| `currentRun` | `undefined` (P2 has no run `00001`) |

Two effects fire:

1. **Unknown-run redirect** (guard: `runKeyFromUrl && !currentRun`): both conditions true →
   calls `router.replace('/P2/testruns')` — **racing with** the already in-flight
   `router.push('/P2/testruns')` from the switcher.
2. **Auto-open effect**: sees `runKeyFromUrl = '00001'` (still truthy) → skips — but once the
   route finally settles on `/P2/testruns`, fires again and calls `router.push('/P2/testruns/tr/X')`.

The two concurrent `router` calls cause visible flicker (empty state flashes) and can break
navigation entirely.

### CasesScreen — the lesser case

The same window exists here. When `setActiveProject(P2)` fires, the `[activeProject.id]`
effect sets `detailCaseId = null`. That change triggers the URL-sync effect, which calls:

```ts
window.history.replaceState(null, '', '/P2/testcases')
```

…while `router.push('/P2/testcases')` from the switcher is still in flight. Per the known
gotcha (see `docs/claude/handoff.md`), `window.history.replaceState` during an in-flight
`router.push` aborts the Next.js 15 navigation.

---

## The fix — project-mismatch guard

Both files need the same guard: derive `projectMismatch` from `usePathname()` vs
`activeProject.key`. When they disagree, the component is in the transition window — all
navigation effects must bail out immediately.

```ts
// Add this near the top of the component (after existing const declarations):
const urlProjectKey = pathname.split('/').filter(Boolean)[0]?.toUpperCase() ?? ''
const projectMismatch = !!urlProjectKey && urlProjectKey !== activeProject.key.toUpperCase()
```

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/screens/RunsScreen.tsx
Read apps/web/src/fresh/screens/CasesScreen.tsx
```

---

## Step 2 — Changes to `RunsScreen.tsx`

### A — Add `projectMismatch` variable

Directly after the existing `runKeyFromUrl` / `caseKeyFromUrl` / `currentRun` const declarations
(around line 108–113), insert:

```ts
const urlProjectKey = pathname.split('/').filter(Boolean)[0]?.toUpperCase() ?? ''
const projectMismatch = !!urlProjectKey && urlProjectKey !== activeProject.key.toUpperCase()
```

### B — Guard the unknown-run redirect effect

Find:
```ts
useEffect(() => {
  if (runKeyFromUrl && !currentRun) {
    router.replace(testRunPath(activeProject.key))
  }
}, [runKeyFromUrl, currentRun, activeProject.key, router])
```

Replace with:
```ts
useEffect(() => {
  if (projectMismatch) return   // transition window — pathname not yet updated
  if (runKeyFromUrl && !currentRun) {
    router.replace(testRunPath(activeProject.key))
  }
}, [projectMismatch, runKeyFromUrl, currentRun, activeProject.key, router])
```

### C — Guard the auto-open effect

Find:
```ts
useEffect(() => {
  if (runKeyFromUrl) return
  if (activeRuns.length === 0) return

  const lastRunId = state.currentRunIdByProject?.[activeProject.id]
  const preferred = lastRunId
    ? activeRuns.find((r) => r.id === lastRunId)
    : undefined
  const target = preferred ?? activeRuns[0]
  router.push(testRunPath(activeProject.key, target.runKey))
}, [runKeyFromUrl, activeRuns, activeProject.key, activeProject.id, state.currentRunIdByProject, router])
```

Replace with:
```ts
useEffect(() => {
  if (projectMismatch) return   // transition window — do not navigate yet
  if (runKeyFromUrl) return
  if (activeRuns.length === 0) return

  const lastRunId = state.currentRunIdByProject?.[activeProject.id]
  const preferred = lastRunId
    ? activeRuns.find((r) => r.id === lastRunId)
    : undefined
  const target = preferred ?? activeRuns[0]
  router.push(testRunPath(activeProject.key, target.runKey))
}, [projectMismatch, runKeyFromUrl, activeRuns, activeProject.key, activeProject.id, state.currentRunIdByProject, router])
```

### D — Guard the URL-sync effect (window.history.replaceState)

Find:
```ts
useEffect(() => {
  if (!currentRun) return
  const caseId = activeCaseId || currentRun.caseOrder[0] || ''
  if (!caseId) return
  const activeCase = getCase(caseId)
  if (!activeCase?.caseKey) return
  const target = testRunCasePath(activeProject.key, currentRun.runKey, activeCase.caseKey)
  if (pathname !== target) {
    window.history.replaceState(null, '', target)
  }
}, [activeCaseId, currentRun?.runKey, currentRun?.caseOrder, activeProject.key, pathname, getCase])
```

Add the guard as the first line inside the effect:
```ts
useEffect(() => {
  if (projectMismatch) return   // transition window — do not update URL yet
  if (!currentRun) return
  const caseId = activeCaseId || currentRun.caseOrder[0] || ''
  if (!caseId) return
  const activeCase = getCase(caseId)
  if (!activeCase?.caseKey) return
  const target = testRunCasePath(activeProject.key, currentRun.runKey, activeCase.caseKey)
  if (pathname !== target) {
    window.history.replaceState(null, '', target)
  }
}, [projectMismatch, activeCaseId, currentRun?.runKey, currentRun?.caseOrder, activeProject.key, pathname, getCase])
```

---

## Step 3 — Changes to `CasesScreen.tsx`

### A — Add `projectMismatch` variable

`CasesScreen` already imports `usePathname`. Find the block of `const` declarations at the
top of the component (where `pathname` and `router` are destructured). Add directly after:

```ts
const urlProjectKey = pathname.split('/').filter(Boolean)[0]?.toUpperCase() ?? ''
const projectMismatch = !!urlProjectKey && urlProjectKey !== activeProject.key.toUpperCase()
```

### B — Guard the URL-sync effect

Find (the effect that calls `window.history.replaceState`, with `// eslint-disable-line` comment):
```ts
useEffect(() => {
  if (!activeProject.key) return
  const detail = detailCaseId ? activeCases.find((c) => c.id === detailCaseId) : null
  const target = testCasePath(activeProject.key, detail?.caseKey)
  if (target !== pathname) window.history.replaceState(null, '', target)
}, [detailCaseId]) // eslint-disable-line react-hooks/exhaustive-deps
```

Replace with:
```ts
useEffect(() => {
  if (!activeProject.key) return
  if (projectMismatch) return   // transition window — do not update URL yet
  const detail = detailCaseId ? activeCases.find((c) => c.id === detailCaseId) : null
  const target = testCasePath(activeProject.key, detail?.caseKey)
  if (target !== pathname) window.history.replaceState(null, '', target)
}, [detailCaseId]) // eslint-disable-line react-hooks/exhaustive-deps
```

> **Note:** `projectMismatch` is intentionally **not** added to the deps array here. The
> effect must only fire when `detailCaseId` changes (that's the existing intent, preserved by
> the eslint-disable comment). `projectMismatch` is read from the closure; its current value
> at the time the effect runs is the guard we need, and adding it as a dep would change the
> effect's semantics.

---

## Files that will NOT change
- `demo-model.ts`, `FreshProvider.tsx`, `migrate-demo-state.ts`
- `project-routes.ts`
- `ProjectSwitcher.tsx`, `ProjectRouteSync.tsx`
- `prototype-runs.css`, `fresh.css`
- Any other file

---

## Step 4 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required.

---

## Step 5 — Manual verification

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`

2. **RunsScreen — switch while viewing a run:**
   - Navigate to `/DP/testruns` — confirm a run auto-opens.
   - Switch to a different project via the switcher.
   - Confirm: no flicker, no blank "Select a test run" flash, no double navigation. The new
     project's first run should open smoothly.

3. **RunsScreen — switch from empty-run state:**
   - Switch to a project that has runs but you're on the bare `/testruns` URL.
   - Switch project — confirm it lands on the new project's run without flicker.

4. **CasesScreen — switch while a case detail panel is open:**
   - Open a test case detail panel in project P1.
   - Switch to project P2.
   - Confirm: the URL updates cleanly to `/P2/testcases` (not stuck on `/P1/testcases/tc/00001`),
     and the detail panel is closed in P2. No navigation abort.

5. **Normal in-project navigation still works:**
   - In CasesScreen: click different cases — confirm URL still updates via `replaceState`.
   - In RunsScreen: navigate between runs and cases — confirm URL still syncs.

---

## Step 6 — Commit

Run `git diff HEAD` and cross-check actual changes against the message below.

```
Test runs: fix project-switch flicker via projectMismatch guard

`RunsScreen.tsx`
* Added `projectMismatch` constant (pathname project key vs activeProject.key) to detect the
  transition window when state is ahead of the URL
* Added `if (projectMismatch) return` guard to the unknown-run redirect effect to prevent a
  racing `router.replace` during project switches
* Added `if (projectMismatch) return` guard to the auto-open effect for the same reason
* Added `if (projectMismatch) return` guard to the URL-sync `window.history.replaceState`
  effect to prevent mid-navigation URL writes

`CasesScreen.tsx`
* Added `projectMismatch` constant (same derivation as RunsScreen)
* Added `if (projectMismatch) return` guard to the URL-sync `window.history.replaceState`
  effect, preventing it from firing during the project-switch transition window and aborting
  the in-flight `router.push` from `ProjectSwitcher`
```

---

## Step 7 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
