# Task 07d — Bug fix: project switch flicker / first attempt stays on P1

## Context from previous tasks

Branch: `mvp-test-cases`. Tasks 01–07c complete (or 07c pending — read files fresh regardless).
Schema v8 (or v9 if 07c ran). One file changes in this task.

---

## Root cause

`ProjectRouteSync` has `state.activeProjectId` in its `useEffect` dependency array. When the
user selects a project in `ProjectSwitcher`, `handleSelect` runs two things synchronously:

```ts
setActiveProject(projectId)                       // 1. state.activeProjectId → P2
router.push(switchProjectPath(pathname, P2.key))  // 2. navigation to /P2/cases starts (async)
```

Step 1 changes `state.activeProjectId`, which immediately re-triggers `ProjectRouteSync`'s
effect — **before the navigation has completed** — so `usePathname()` still returns `/P1/cases`.
The effect sees URL=P1 but state=P2 and "corrects" it:

```ts
if (project.id !== state.activeProjectId) {
  setActiveProject(project.id)  // fires setActiveProject(P1) — reverts state to P1 ← BUG
}
```

This reversion causes two cascading problems:

1. **Visible flicker** — the UI briefly renders P2 data then snaps back to P1.
2. **Navigation abort** — `CasesScreen`'s URL sync effect re-runs (because `detailCaseId` resets
   on the project-switch effect), with `activeProject.key = P1` now, and calls
   `window.history.replaceState(null, '', '/P1/cases')`. In Next.js 15's App Router,
   writing to browser history during an in-flight `router.push` aborts the navigation.
   The user stays on `/P1/cases`.

On the **second attempt** the URL is already `/P1/cases` (no in-flight navigation exists), so
the full sequence completes and the switch succeeds.

**The fix:** Remove `state.activeProjectId` from the effect's dependency array so the effect
only re-runs on URL or project-list changes, not on state dispatches from the switcher.
To avoid a stale-closure bug in the idempotency check (`project.id !== activeProjectId`),
read the current `activeProjectId` through a ref that is updated on every render — this is
the idiomatic React pattern for "read latest value without triggering re-runs."

---

## Files that will change

- `apps/web/src/fresh/components/ProjectRouteSync.tsx`

## Files that will NOT change

- Any other file (including `ProjectSwitcher.tsx`, `CasesScreen.tsx`, `FreshProvider.tsx`, etc.)

---

## Step 1 — Read the file before touching it

```
Read apps/web/src/fresh/components/ProjectRouteSync.tsx
```

---

## Step 2 — Edit `ProjectRouteSync.tsx`

Replace the entire file content:

```ts
// Before (full file):
'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useFresh } from '../data/FreshProvider'
import { getProjectByKey } from '../data/project-selectors'
import { DEFAULT_PROJECT_KEY, parseProjectPath, projectPath } from '../lib/project-routes'

/** Keeps activeProjectId in sync with /:projectKey/... URL segments */
export function ProjectRouteSync() {
  const pathname = usePathname()
  const router = useRouter()
  const { state, setActiveProject, activeProject } = useFresh()
  const redirecting = useRef(false)

  useEffect(() => {
    if (pathname.startsWith('/runs/api')) return

    const parsed = parseProjectPath(pathname)
    if (!parsed) return

    const project = getProjectByKey(state, parsed.projectKey)
    if (project) {
      redirecting.current = false
      if (project.id !== state.activeProjectId) {
        setActiveProject(project.id)
      }
      return
    }

    if (redirecting.current) return
    redirecting.current = true
    const fallbackKey = activeProject?.key ?? DEFAULT_PROJECT_KEY
    router.replace(projectPath(fallbackKey, parsed.module))
  }, [pathname, state.projectsById, state.activeProjectId, setActiveProject, activeProject?.key, router])

  return null
}
```

```ts
// After (full file):
'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useFresh } from '../data/FreshProvider'
import { getProjectByKey } from '../data/project-selectors'
import { DEFAULT_PROJECT_KEY, parseProjectPath, projectPath } from '../lib/project-routes'

/** Keeps activeProjectId in sync with /:projectKey/... URL segments */
export function ProjectRouteSync() {
  const pathname = usePathname()
  const router = useRouter()
  const { state, setActiveProject, activeProject } = useFresh()
  const redirecting = useRef(false)

  // Read activeProjectId via ref so the effect can check it without depending on it.
  // If state.activeProjectId were a dep, the effect would re-run when the switcher calls
  // setActiveProject(P2) — while usePathname() still says /P1 — and immediately revert
  // the project back to P1, causing a flicker and aborting the in-flight navigation.
  const activeProjectIdRef = useRef(state.activeProjectId)
  activeProjectIdRef.current = state.activeProjectId

  useEffect(() => {
    if (pathname.startsWith('/runs/api')) return

    const parsed = parseProjectPath(pathname)
    if (!parsed) return

    const project = getProjectByKey(state, parsed.projectKey)
    if (project) {
      redirecting.current = false
      if (project.id !== activeProjectIdRef.current) {
        setActiveProject(project.id)
      }
      return
    }

    if (redirecting.current) return
    redirecting.current = true
    const fallbackKey = activeProject?.key ?? DEFAULT_PROJECT_KEY
    router.replace(projectPath(fallbackKey, parsed.module))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Intentional: state.activeProjectId removed — effect must only react to URL/project-list
  // changes; activeProjectId is read via ref above to avoid the reversion race condition.
  }, [pathname, state.projectsById, setActiveProject, activeProject?.key, router])

  return null
}
```

The only code changes are:
1. Added `activeProjectIdRef` declaration and the `activeProjectIdRef.current = state.activeProjectId` update line
2. Changed `state.activeProjectId` → `activeProjectIdRef.current` in the idempotency check
3. Removed `state.activeProjectId` from the deps array
4. Added the `eslint-disable-next-line` comment with explanation

---

## Step 3 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required. There are no type changes — `activeProjectIdRef` is inferred
as `MutableRefObject<string>` from `useRef(state.activeProjectId)`. If the linter flags
`state` as used-but-not-in-deps (because `getProjectByKey(state, ...)` reads it), confirm
the `eslint-disable-next-line` comment suppresses it; if not, move it to
`eslint-disable-line` on the closing deps array line.

---

## Step 4 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`

2. **Project switcher — first attempt works**: Have two projects. Click the project switcher,
   select P2. The UI should switch to P2's cases immediately with no flicker back to P1.
   The URL should update to `/P2/cases` (or `/P2/dashboard` depending on current module).

3. **URL bar — first attempt works**: While on `/P1/cases`, manually edit the URL to `/P2/cases`
   and press Enter. Should navigate to P2 on the first attempt.

4. **Case panel open during switch**: Open a case detail panel in P1, then switch to P2 via the
   switcher. The panel should close and P2's cases should load cleanly — no flash of P1 content.

5. **Unknown project key redirects**: Navigate to `/UNKNOWN/cases`. Should redirect to the
   active project's `/cases` (existing redirect behavior must still work).

6. **State consistency**: After switching from P1 to P2, confirm `activeProject.name` in the
   topbar/sidebar shows P2, and the folder tree and case list show P2's data.

---

## Step 5 — Commit

Run `git diff HEAD` and cross-check against the message below. Adjust if anything differs.

```
Cases: fix project switch reversion race in ProjectRouteSync

`ProjectRouteSync.tsx`
* Added activeProjectIdRef (useRef) updated on every render to track the
  latest activeProjectId without making it an effect dependency
* Changed idempotency check from state.activeProjectId to activeProjectIdRef.current
* Removed state.activeProjectId from the effect dependency array — the effect
  now only re-runs on pathname or projectsById changes, preventing it from
  calling setActiveProject(P1) while a router.push to /P2 is still in flight
* Added eslint-disable-next-line comment explaining the intentional dep omission
```

---

## Step 6 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
