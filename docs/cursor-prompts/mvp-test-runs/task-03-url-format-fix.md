# Task 03 — URL Format Fix: testcases slug + strip TC- prefix

## Context from previous tasks

Branch: `mvp-test-runs`. Tasks 01–02 complete.

- Stack: Next.js App Router, React, pnpm. Frontend-only prototype — no backend.
- Route helpers live in `apps/web/src/fresh/lib/project-routes.ts`.
- `Case.caseKey` is the human-readable display key, e.g. `"TC-00001"`.
- `DemoRun.runKey` is the run display key, e.g. `"00001"` (no prefix — already correct in URLs).
- Current URL for test cases: `/DP/cases` and `/DP/cases/tc/TC-00001` (both wrong).
- Desired URL for test cases: `/DP/testcases` and `/DP/testcases/tc/00001`.
- Current URL for run case detail: `/DP/testruns/tr/00001/tc/TC-00001` (caseKey wrong).
- Desired URL for run case detail: `/DP/testruns/tr/00001/tc/00001`.
- `MODULE_SLUGS` maps module keys to URL slugs. `MODULE_SLUGS.cases` is currently `'cases'`.
- `CasesScreen` URL sync uses `window.history.replaceState` (NOT `router.replace`) for in-component updates — preserve this.

---

## Objective

Two changes:
1. **Rename the URL slug** for the test cases module from `cases` → `testcases`.
2. **Strip the `TC-` prefix** from `caseKey` when embedding it in a URL path segment.

---

## Files to change

### 1. `apps/web/src/fresh/lib/project-routes.ts`

**Change `MODULE_SLUGS.cases`** from `'cases'` to `'testcases'`:
```ts
export const MODULE_SLUGS = {
  // ...
  cases: 'testcases',   // was 'cases'
  // ...
}
```

**Add two helpers** after the existing `parseTestRunCaseKey`:
```ts
/** Strip TC- prefix from a caseKey to produce a clean URL slug. */
export function caseKeyToSlug(caseKey: string): string {
  return caseKey.replace(/^TC-/i, '')
}

/** Restore TC- prefix from a URL slug back to a caseKey. */
export function slugToCaseKey(slug: string): string {
  return /^TC-/i.test(slug) ? slug : `TC-${slug}`
}
```

**Update `testCasePath`** to use `caseKeyToSlug`:
```ts
export function testCasePath(projectKey: string, caseKey?: string): string {
  const base = projectPath(projectKey, 'cases')
  return caseKey ? `${base}/tc/${caseKeyToSlug(caseKey)}` : base
}
```

**Update `testRunCasePath`** to use `caseKeyToSlug`:
```ts
export function testRunCasePath(projectKey: string, runKey: string, caseKey: string): string {
  return `${testRunPath(projectKey, runKey)}/tc/${caseKeyToSlug(caseKey)}`
}
```

**Update `LEGACY_PATH_TO_MODULE`** — add a legacy entry so old `/cases` paths still route correctly:
```ts
export const LEGACY_PATH_TO_MODULE: Record<string, ModuleSlug> = {
  // ...existing entries...
  '/testcases': 'cases',   // ADD: support new slug in legacy lookup
}
```

---

### 2. Route directory rename

Rename (move) the entire directory:
```
apps/web/src/app/(app)/[projectKey]/cases/
  → apps/web/src/app/(app)/[projectKey]/testcases/
```

This includes:
- `apps/web/src/app/(app)/[projectKey]/cases/page.tsx` → `testcases/page.tsx`
- `apps/web/src/app/(app)/[projectKey]/cases/tc/[caseKey]/page.tsx` → `testcases/tc/[caseKey]/page.tsx`

The contents of both files are unchanged — they just import and render `CasesScreen`.

---

### 3. `apps/web/src/fresh/screens/CasesScreen.tsx`

Import `slugToCaseKey` from `'../lib/project-routes'`.

**Update the on-mount deep-link effect** — when looking up a case by the URL slug, restore the `TC-` prefix before matching:
```ts
useEffect(() => {
  const slug = parseTestCaseKey(pathname)
  if (!slug) return
  const key = slugToCaseKey(slug)   // restore TC- prefix
  const match = activeCases.find((c) => c.caseKey === key)
  if (match) setDetailCaseId(match.id)
}, [])
```

No other changes to `CasesScreen` — `testCasePath` already handles the encoding.

---

### 4. `apps/web/src/fresh/screens/RunsScreen.tsx`

Import `slugToCaseKey` from `'../lib/project-routes'`.

**Update the `caseKeyFromUrl` lookup** — when finding the case by URL slug, restore the `TC-` prefix:
```ts
useEffect(() => {
  if (!currentRun) return
  if (caseKeyFromUrl) {
    const key = slugToCaseKey(caseKeyFromUrl)   // restore TC- prefix
    const match = currentRun.caseOrder.find((cid) => {
      const c = getCase(cid)
      return c?.caseKey === key
    })
    if (match) { setActiveCaseId(match); return }
  }
  setActiveCaseId(currentRun.caseOrder[0] ?? '')
}, [currentRun?.id])
```

No other changes to `RunsScreen` — `testRunCasePath` already handles the encoding.

---

## Files that will NOT change
- `demo-model.ts`, `FreshProvider.tsx`, `migrate-demo-state.ts`
- `FreshShell.tsx` — uses `module: 'cases'` (the module key), not the URL slug; resolves correctly
- `prototype-runs.css`, `fresh.css`
- Any other file

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/lib/project-routes.ts
Read apps/web/src/fresh/screens/CasesScreen.tsx
Read apps/web/src/fresh/screens/RunsScreen.tsx
Read apps/web/src/app/(app)/[projectKey]/cases/page.tsx
Read apps/web/src/app/(app)/[projectKey]/cases/tc/[caseKey]/page.tsx
```

---

## Step 2 — Make changes

Apply in order: `project-routes.ts` → rename route directory → `CasesScreen.tsx` → `RunsScreen.tsx`.

---

## Step 3 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required.

---

## Step 4 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. Navigate to `/DP/cases` — confirm it **redirects** to `/DP/testcases` (Next.js will 404 the old route; the sidebar link should now go to `/DP/testcases`).
3. Open the Test Cases page via the sidebar — confirm URL is `/DP/testcases`.
4. Click a test case — confirm URL becomes `/DP/testcases/tc/00001` (no `TC-` prefix in the URL).
5. Deep-link directly to `/DP/testcases/tc/00001` — confirm the correct case opens.
6. Close the case panel — confirm URL returns to `/DP/testcases`.
7. Navigate to a test run and select a case — confirm URL is `/DP/testruns/tr/00001/tc/00001` (no `TC-`).
8. Deep-link to `/DP/testruns/tr/00001/tc/00001` — confirm the correct case opens in the run.
9. Switch projects — confirm URL resets to the new project's `/testcases` base (no stale case key).

---

## Step 5 — Commit

Run `git diff HEAD` and cross-check actual changes against the message below. Adjust if anything differs, then commit.

```
Test cases: rename URL slug to testcases, strip TC- prefix from case URL segments

`project-routes.ts`
* Changed `MODULE_SLUGS.cases` from `'cases'` to `'testcases'`
* Added `caseKeyToSlug(caseKey)` helper that strips the `TC-` prefix for URL encoding
* Added `slugToCaseKey(slug)` helper that restores the `TC-` prefix when reading from the URL
* Updated `testCasePath` to use `caseKeyToSlug` when building the path segment
* Updated `testRunCasePath` to use `caseKeyToSlug` when building the path segment
* Added `/testcases` entry to `LEGACY_PATH_TO_MODULE`

`apps/web/src/app/(app)/[projectKey]/testcases/page.tsx`
* Renamed from `cases/page.tsx` — content unchanged, renders `CasesScreen`

`apps/web/src/app/(app)/[projectKey]/testcases/tc/[caseKey]/page.tsx`
* Renamed from `cases/tc/[caseKey]/page.tsx` — content unchanged, renders `CasesScreen`

`CasesScreen.tsx`
* Updated on-mount deep-link effect to call `slugToCaseKey` before matching against `case.caseKey`

`RunsScreen.tsx`
* Updated `caseKeyFromUrl` lookup effect to call `slugToCaseKey` before matching against `case.caseKey`
```

---

## Step 6 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
