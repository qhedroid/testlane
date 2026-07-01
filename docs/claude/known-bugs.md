# Known Bugs — Investigation Log

> This file tracks bugs that have been identified and partially investigated but not yet fully resolved.
> Each entry summarises the symptom, what was tried, the current best understanding, and where to look next.
> It is not a fix spec — use it to get an agent up to speed quickly before writing a proper task prompt.

---

## BUG-01 — Project switch: first attempt fails, second succeeds

### Symptom

When switching from P1 to P2 via the project switcher (or by editing the URL and pressing Enter),
the first attempt flickers briefly then returns the user to P1. The second attempt succeeds.

### Commits / tasks attempted

| Task | Approach | Outcome |
|------|----------|---------|
| 07b | Replaced `router.replace(target)` with `window.history.replaceState(null, '', target)` in `CasesScreen`'s URL sync effect. Rationale: `/cases` and `/cases/tc/[caseKey]` are different Next.js page files; `router.replace` across them causes a full remount. | Reduced remount flicker. Did not fix the project switch failure. |
| 07d | Removed `state.activeProjectId` from `ProjectRouteSync`'s effect deps; added `activeProjectIdRef` to read it without re-triggering the effect. Rationale: the effect was firing mid-navigation (while `usePathname()` still showed P1) and calling `setActiveProject(P1)`, reverting state and triggering `window.history.replaceState('/P1/cases')`, which aborted the in-flight `router.push`. | Theoretically correct. Bug still persists in practice after Cursor applied the change. |

### Current best understanding

The race condition theory from 07d appears sound on paper but either:

1. Cursor did not apply the 07d change correctly (worth verifying the actual diff before investigating further), OR
2. There is an additional mechanism reverting state or aborting the navigation that 07d didn't cover.

### Relevant files

- `apps/web/src/fresh/components/ProjectRouteSync.tsx` — primary suspect; syncs `activeProjectId` from the URL
- `apps/web/src/fresh/components/ProjectSwitcher.tsx` — calls `setActiveProject(id)` + `router.push(path)` in `handleSelect`
- `apps/web/src/fresh/screens/CasesScreen.tsx` — URL sync effect (`useEffect([detailCaseId])`) calls `window.history.replaceState`; project-switch effect (`useEffect([activeProject.id])`) resets local state
- `apps/web/src/app/(app)/layout.tsx` — mounts `ProjectRouteSync` outside `FreshShell`

### Areas to check next

1. **Verify the 07d diff landed correctly.** Check `git log` for the 07d commit and confirm `state.activeProjectId` is genuinely absent from `ProjectRouteSync`'s deps array and `activeProjectIdRef` is present.

2. **Check for a second `setActiveProject` call.** The reversion might not be coming from `ProjectRouteSync` at all. Add a temporary `console.trace()` inside `setActiveProject` (or the `SET_ACTIVE_PROJECT` reducer case) to log every call site. A spurious second call from an unexpected component would show up immediately.

3. **Check CasesScreen's project-switch effect timing.** The effect `useEffect([activeProject.id])` calls `setDetailCaseId(null)`, which triggers the URL sync effect. If `activeProject.key` is stale at that moment (still P1 while navigating to P2), the URL sync writes `/P1/cases` into browser history. Confirm the ordering: does the URL sync effect fire before or after `activeProject` has updated to P2?

4. **Check whether `window.history.replaceState` is the actual abort mechanism.** It's assumed that calling `replaceState` during an in-flight `router.push` aborts it in Next.js 15. This should be confirmed experimentally — add a `console.log` before the `replaceState` call in the URL sync effect and observe whether it fires during a switch attempt, and whether removing that call (temporarily) allows the navigation to complete.

5. **Consider whether `usePathname` is involved.** `usePathname()` in Next.js App Router is driven by the router's internal state, not `window.location`. After `window.history.replaceState` is called, `usePathname()` and `window.location.pathname` can diverge. If `ProjectRouteSync` then fires again with a stale `pathname`, a reversion loop is possible.

6. **Try removing CasesScreen's URL sync entirely during a switch** as a diagnostic: if the switch succeeds without it, the URL sync effect is the abort vector. If it still fails, `ProjectRouteSync` is still the culprit.

---

### Update — task-05b (mvp-test-runs branch)

The `projectMismatch` guard was applied to `RunsScreen.tsx` (3 effects) and `CasesScreen.tsx` (URL-sync effect). The guard derives a boolean from `pathname`'s project key vs `activeProject.key` and bails out of any navigation/replaceState call during the transition window.

**RunsScreen: fully fixed.** No flicker on project switch from Test Runs.

**CasesScreen: residual flicker remains.** The switch still completes, but a visible flash occurs. The `projectMismatch` guard on the URL-sync effect did not fully eliminate it — likely other effects or state resets (e.g. the `[activeProject.id]` effect resetting folder/case state) are causing intermediate renders that produce the flash. Further investigation needed.

_Last updated: task-05b, branch mvp-test-runs._

---

## BUG-02 — Project switch: residual flicker from Test Cases screen

### Symptom

Switching projects while on the Test Cases screen shows a brief visual flicker (the screen repaints with an intermediate state before settling on the new project). The switch ultimately succeeds — this is a visual artifact only, not a navigation failure.

### Commits / tasks attempted

| Task | Approach | Outcome |
|------|----------|---------|
| 05b | Added `projectMismatch` guard to `CasesScreen`'s URL-sync `window.history.replaceState` effect. | Insufficient — residual flicker remains. |

### Current best understanding

The most likely remaining causes, in order of suspicion:

1. **`useEffect([activeProject.id])` resets local state** — this effect resets `selectedFolderId`, `detailCaseId`, `openFolders`, etc. in the same render cycle as the project state change. These resets cause intermediate renders that paint briefly with P2 state but P1 DOM before the route commit.

2. **`activeCases` / `activeFolders` change in the same flush** — these derived values (computed in `FreshProvider`) switch from P1 to P2 data synchronously with `setActiveProject`. Any component subscribed to them re-renders immediately, even before the URL updates.

3. **`window.history.replaceState` still firing** — the `projectMismatch` guard reads `pathname` from the closure at the time `detailCaseId` changes. There may be a subtle timing case where `projectMismatch` is `false` at closure-capture time but the route hasn't committed yet.

### Relevant files

- `apps/web/src/fresh/screens/CasesScreen.tsx` — `useEffect([activeProject.id])` and URL-sync `useEffect([detailCaseId])`
- `apps/web/src/fresh/data/FreshProvider.tsx` — how `activeCases` / `activeFolders` are computed on project change
- `apps/web/src/fresh/components/ProjectSwitcher.tsx` — `handleSelect` call order

### Areas to check next

1. Temporarily add `console.log` at the start of the `[activeProject.id]` effect and the URL-sync effect to observe their firing order relative to `pathname` updates during a switch.
2. Consider whether the `[activeProject.id]` local-state resets should be deferred until the route has committed (e.g. keying the screen on `activeProject.id` to unmount/remount cleanly, rather than resetting piecemeal).
3. Check whether `pathname` inside the URL-sync closure ever reads P1 when `activeProject.key` is already P2 — add a `console.log(pathname, activeProject.key, projectMismatch)` to verify the guard is actually firing.

_Last updated: task-05b, branch mvp-test-runs. Deferred — does not block current work._
