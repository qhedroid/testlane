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

_Last updated: after task-07d. No further investigation done._
