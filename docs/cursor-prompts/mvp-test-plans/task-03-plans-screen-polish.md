# Task 03 — Test Plans screen polish (5 feedback items)

Branch: `mvp-test-plans` (rebased onto latest `mvp-main`)
Schema: v14 — **no schema change in this task.**

Scope is limited to three files:

- `apps/web/src/fresh/screens/PlansScreen.tsx`
- `apps/web/src/fresh/styles/prototype-plans.css`
- `apps/web/src/fresh/data/demo-model.ts`

Do not touch `RunsScreen.tsx`, `/runs/api`, `CasesScreen.tsx`, or any other screen — they are reference-only for patterns to mirror. Do not introduce new state management libraries. Do not touch backend/DB/Docker/auth/API routes (frontend-only prototype; persistence stays in `FreshProvider` + localStorage).

---

## Item 1 — Unfiled cases in Folder Query

**Problem:** `FolderQueryBody` (in `PlansScreen.tsx`) has no way to select "cases with no folder assigned." `casesInFolder()` in `demo-model.ts` already supports a `'__unfiled__'` sentinel, but `resolvePlanCases()` does its own inline folder traversal and ignores that sentinel entirely.

**1a. `demo-model.ts` — `resolvePlanCases()`**

Current folder-branch logic (around line 514-519):

```ts
} else if (query.type === 'folder') {
  const allowed = new Set<string | null>()
  for (const fid of query.folderIds ?? []) {
    folderDescendantIds(folders, fid).forEach((id) => allowed.add(id))
  }
  matched = cases.filter((c) => allowed.has(c.folderId ?? null))
}
```

Change the loop so that when `fid === '__unfiled__'`, `null` is added directly to `allowed` instead of being passed into `folderDescendantIds`:

```ts
} else if (query.type === 'folder') {
  const allowed = new Set<string | null>()
  for (const fid of query.folderIds ?? []) {
    if (fid === '__unfiled__') {
      allowed.add(null)
    } else {
      folderDescendantIds(folders, fid).forEach((id) => allowed.add(id))
    }
  }
  matched = cases.filter((c) => allowed.has(c.folderId ?? null))
}
```

Do not modify `casesInFolder()` or `folderDescendantIds()` — they're correct as-is and unrelated to this bug.

**1b. `PlansScreen.tsx` — `FolderQueryBody`**

Add an "Unfiled" entry to the folder picker `<select>`, with value `'__unfiled__'`, shown only when it isn't already selected (same rule as real folders — check `selectedIds.has('__unfiled__')`).

- In the dropdown `<option>` list, add an `<option value="__unfiled__">Unfiled</option>` above or below the real folders (above reads better — pin it first).
- The existing "add folder" logic (`addFolder(folderId: string)`) already just appends any string id to `query.folderIds`, so no signature change needed — `addFolder('__unfiled__')` works as-is.
- In the selected-chip rendering loop (`(query.folderIds ?? []).map((fid) => ...)`), when `fid === '__unfiled__'`, render the chip label as `"Unfiled"` directly — skip the `activeFolders.find(...)` lookup for that case (it would return `undefined` and fall through to displaying the raw id).

Example chip rendering change:

```tsx
{(query.folderIds ?? []).map((fid) => {
  const label = fid === '__unfiled__' ? 'Unfiled' : (activeFolders.find((f) => f.id === fid)?.name ?? fid)
  return (
    <div key={fid} className="pl-folder-chip">
      <i className="ti ti-folder" style={{ fontSize: 11, color: 'var(--accent)' }} />
      {label}
      <button type="button" title="Remove folder" onClick={() => removeFolder(fid)}>
        <i className="ti ti-x" />
      </button>
    </div>
  )
})}
```

And the dropdown, gating the Unfiled option on `!selectedIds.has('__unfiled__')`:

```tsx
{(unselectedFolders.length > 0 || !selectedIds.has('__unfiled__')) && (
  <select
    className="pl-folder-select"
    value=""
    onChange={(e) => {
      if (e.target.value) addFolder(e.target.value)
    }}
  >
    <option value="">+ Add folder…</option>
    {!selectedIds.has('__unfiled__') && <option value="__unfiled__">Unfiled</option>}
    {unselectedFolders.map((f) => (
      <option key={f.id} value={f.id}>
        {f.name}
      </option>
    ))}
  </select>
)}
```

No CSS changes needed for this item — reuses `.pl-folder-chip` / `.pl-folder-select`.

---

## Item 2 — Hover donut on run history "Results" bar

**Where:** Overview tab → Run history table → each row's `.pl-run-bar` (rendered by the `RunResultBar` component in `PlansScreen.tsx`, ~line 47).

**Pattern to mirror:** the case-id hover tooltip in `RunsScreen.tsx` (`caseIdTooltip` state of shape `{ caseId, x, y } | null`, set via `onMouseEnter` using `getBoundingClientRect()` on the hovered element, cleared via a short `setTimeout` on `onMouseLeave`, rendered as a `position: fixed` div keyed off that state near the bottom of the component). Follow the same shape/lifecycle here, adapted to plans.

**Implementation:**

1. In `PlansScreen`, add state: `const [runBarTooltip, setRunBarTooltip] = useState<{ run: DemoRun; x: number; y: number } | null>(null)`.
2. `RunResultBar` needs to trigger this state on hover. Either lift the hover handlers into the `<tr>`/`<td>` that renders `<RunResultBar run={run} />` in the run history table, or pass `onHover`/`onLeave` callback props into `RunResultBar`. Simplest: wrap the `<RunResultBar run={run} />` render site in the table with a container `<div>` (or use the existing `<td>`) carrying `onMouseEnter`/`onMouseLeave`:

```tsx
<td
  onMouseEnter={(e) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setRunBarTooltip({ run, x: rect.left, y: rect.bottom + 6 })
  }}
  onMouseLeave={() => setRunBarTooltip(null)}
>
  <RunResultBar run={run} />
</td>
```

   (A short hide-delay via `setTimeout` + ref, as `RunsScreen` does for its case-id tooltip, is optional polish — not required, but fine to include for consistency if it doesn't complicate the diff.)

3. Render the popup near the other modals at the bottom of `PlansScreen`'s JSX (same place `caseIdTooltip`-style popups live in `RunsScreen`):

```tsx
{runBarTooltip ? (
  <div
    className="pl-run-bar-popup"
    style={{ position: 'fixed', top: runBarTooltip.y, left: runBarTooltip.x, zIndex: 300 }}
  >
    <RunDonut
      pass={runSummary(runBarTooltip.run).passed}
      fail={runSummary(runBarTooltip.run).failed}
      blocked={runSummary(runBarTooltip.run).blocked}
      notrun={runSummary(runBarTooltip.run).notRun}
      size={100}
      interactive={false}
      showCompleteLabel={false}
    />
  </div>
) : null}
```

   Note: `runSummary()` returns `{ total, passed, failed, blocked, notRun }` (see its usage in `RunResultBar` just above) — map those fields explicitly to `RunDonut`'s `pass`/`fail`/`blocked`/`notrun` props (don't spread `runSummary()` directly since the prop names differ; prefer computing `const s = runSummary(runBarTooltip.run)` once and reusing `s` for all four props to avoid calling it four times).

4. Import `RunDonut` from `'../components/RunDonut'` at the top of `PlansScreen.tsx` (it isn't currently imported there).

5. **CSS** — add to `prototype-plans.css` under the "Run history table" section:

```css
.pl-run-bar-popup {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  padding: 10px;
  pointer-events: none;
}
```

---

## Item 3 — Test case coverage donut

**Where:** Overview tab → "Test case coverage" card (currently a plain `{coveragePct}%` number + label, ~line 815-826 of `PlansScreen.tsx`).

Replace the `.pl-coverage-donut` contents:

```tsx
<div className="pl-coverage-donut">
  <RunDonut
    pass={resolvedCases.length}
    fail={0}
    blocked={0}
    notrun={activeCases.length - resolvedCases.length}
    size={100}
    interactive={false}
    showCompleteLabel={false}
  />
  <div className="pl-donut-label">
    {resolvedCases.length} of {activeCases.length} test cases in this project
  </div>
</div>
```

- Remove the now-unused `<div className="pl-donut-pct">{coveragePct}%</div>` element. If `coveragePct` becomes otherwise unused after this change, remove the variable too to avoid an unused-var lint warning (confirm no other reference remains first).
- Import `RunDonut` from `'../components/RunDonut'` (same import added in Item 2 — only add it once).
- `.pl-coverage-donut` in `prototype-plans.css` already uses `flex-direction: column; align-items: center; gap: 6px` — no CSS change needed here. `.pl-donut-pct` becomes unused; leave the CSS rule in place (harmless) rather than deleting, unless you've confirmed it's not referenced elsewhere.

---

## Item 4 — Plan detail maximizable

**Pattern to mirror:** `CasesScreen.tsx`'s maximize behaviour — `detailMaximized` state, `toggleMaximize()` handler, `.dp-max-btn` button with `ti-arrows-maximize` / `ti-arrows-minimize` icon swap, and the `dp-maximized` class added to the layout wrapper (`tc-lay` in that screen) which the CSS then uses to hide the sibling pane. Reuse the *button* class (`.dp-max-btn`, already defined in `fresh.css` — do not redefine it) but plans get their own layout class since `.pl-lay` differs structurally from `.tc-lay`.

**Implementation in `PlansScreen.tsx`:**

1. Add state: `const [planMaximized, setPlanMaximized] = useState(false)`.
2. Reset it whenever the selected plan changes — add to the existing `useEffect(() => { setPendingQueries(null); setStaticSearch({}) }, [selectedPlan?.id])` effect (append `setPlanMaximized(false)` inside it), rather than creating a new effect.
3. Add the class to the outer layout div:

```tsx
<div className={`pl-lay${planMaximized ? ' pl-maximized' : ''}`}>
```

4. Add a toggle button to `.pl-detail-hd`'s action row (`pl-detail-actions`), alongside the existing Edit/More buttons — e.g. placed first, before "Create test run":

```tsx
<button
  type="button"
  className="dp-max-btn"
  title={planMaximized ? 'Restore panel width' : 'Maximize panel'}
  onClick={() => setPlanMaximized((v) => !v)}
>
  <i className={`ti ${planMaximized ? 'ti-arrows-minimize' : 'ti-arrows-maximize'}`} />
</button>
```

   Note `.dp-max-btn` is a small square icon button (24×24, from `fresh.css`) — visually it will sit slightly differently than the text `btn`/`btn-p` buttons next to it. That's consistent with how it looks in `CasesScreen.tsx`'s detail header; no extra wrapper needed.

**CSS in `prototype-plans.css`** (add under "Right pane: plan detail" section):

```css
.pl-lay.pl-maximized .pl-list-pane {
  display: none;
}

.pl-lay.pl-maximized .pl-detail {
  flex: 1;
}
```

---

## Item 5 — Collapsible plan list sidebar

**New pattern** (not a direct port from `CasesScreen.tsx` — that screen doesn't have a collapsible sidebar; build this fresh following the project's existing UI conventions).

**Implementation in `PlansScreen.tsx`:**

1. Add state: `const [listCollapsed, setListCollapsed] = useState(false)`.
2. Add the toggle button to `.pl-list-hd`, e.g. as the last element in that header row:

```tsx
<button
  type="button"
  className="btn"
  style={{ padding: '2px 6px', fontSize: 11 }}
  title={listCollapsed ? 'Expand plan list' : 'Collapse plan list'}
  onClick={() => setListCollapsed((v) => !v)}
>
  <i className={`ti ${listCollapsed ? 'ti-layout-sidebar-left-expand' : 'ti-layout-sidebar-left-collapse'}`} />
</button>
```

3. Apply the `collapsed` class to `.pl-list-pane`:

```tsx
<div className={`pl-list-pane${listCollapsed ? ' collapsed' : ''}`}>
```

4. When collapsed, hide the search input and list body, and show only the header with the toggle button. The `.pl-list-hd` title/count (`<span className="st-ttl">Plans</span>`, `<span className="pnl-ct">...</span>`, and the "New plan" button) should also be hidden when collapsed — only the toggle button remains visible, since the pane is only 32px wide. Wrap the existing header content (icon, title, count, New plan button) in a fragment or conditionally render it: `{!listCollapsed && (<>...</>)}`, keeping the toggle button itself always rendered (outside that conditional, or as the final sibling).

   Similarly wrap `.pl-list-search` and `.pl-list-body` so they don't render (or are hidden) when collapsed — conditionally rendering (`{!listCollapsed && (...)}`) is simpler than relying purely on CSS `display: none` given the fixed 32px width would otherwise still lay out overflowing content. Use CSS `overflow: hidden` as a safety net either way (see below).

**CSS in `prototype-plans.css`** (add under "Left pane: plan list" section):

```css
.pl-list-pane.collapsed {
  width: 32px;
  overflow: hidden;
}

.pl-list-pane.collapsed .pl-list-search,
.pl-list-pane.collapsed .pl-list-body {
  display: none;
}
```

---

## Verification (no backend/DB involved — frontend-only prototype)

Per the project's mandatory post-change smoke test:

1. `pnpm build`
2. `pnpm dev` (stop any stale dev server first if `.next` was rebuilt)
3. Browser smoke test:
   - Test Plans screen: `/DP/plans` (or equivalent project key) — verify all 5 items:
     - Folder query: add "Unfiled" to a folder query, confirm cases with no folder appear in resolved results and in the spawned test run count.
     - Run history: hover a `.pl-run-bar` row, confirm the donut popup appears with correct pass/fail/blocked/notrun counts matching the row's run.
     - Coverage card: confirm the donut renders with correct green/grey split and the case-count label below it.
     - Maximize: click the maximize button in plan detail header, confirm the list pane hides and detail pane expands; click again (now minimize icon) to restore. Switch to a different plan and confirm it resets to non-maximized.
     - Collapse: click the sidebar collapse button, confirm the pane shrinks to ~32px showing only the toggle, click again to restore full list.
   - Core regression routes (minimum): `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`
4. Record WebM evidence where tooling supports it; screenshots for any failures.
5. Write QA report to `/tmp/relay-qa-mvp-test-plans/qa-report.md` (pass/fail summary, bugs, known limitations, push readiness).
6. Do not push until smoke test evidence is reviewed or explicitly waived.

## Documentation

This task is UI polish with no new routes, no schema/localStorage change, and no RBAC change — `docs/product/user-guide.md` and `docs/product/feature-flow.md` do not need functional-behavior updates, but if the Test Plans section of either doc explicitly describes the folder-query picker, run history table, or coverage card in a way this change makes stale (e.g. screenshots or exact wording), update the relevant paragraph. No changes needed to `docs/_authoritative/AS_BUILT_SNAPSHOT.md` or `docs/_authoritative/FRONTEND_CONTRACTS.md` (no contract/structural change — same data shapes, same routes). Update `docs/claude/handoff.md` with a short "Completed work" entry for this task once done.

## Out of scope / do not touch

- `RunsScreen.tsx`, `/runs/api` (`ApiRunsWorkspace.tsx`), `CasesScreen.tsx` — reference only, no edits.
- No schema version bump, no `migrate-demo-state.ts` change (v14 unchanged).
- No backend/DB/Docker/auth/API route work.
- No new commits without explicit request — leave changes staged/unstaged as directed by the user running this prompt.
