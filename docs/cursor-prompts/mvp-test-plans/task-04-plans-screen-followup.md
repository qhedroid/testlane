# Task 04 — Test Plans screen follow-up feedback (3 items)

Branch: `mvp-test-plans`
Schema: v14 — **no schema change in this task.**

This is follow-up feedback on the work done in `task-03-plans-screen-polish.md` (already implemented and committed).

## Files that will change

- `apps/web/src/fresh/screens/PlansScreen.tsx`
- `apps/web/src/fresh/styles/prototype-plans.css`
- `apps/web/src/fresh/components/RunDonut.tsx` — **new file touched**, small additive change (optional color-override prop). Needed because item 1 requires a per-instance wedge color that the component doesn't currently expose.
- `apps/web/src/fresh/hooks/useResizablePanes.ts` — **new file touched**, one-line selector fix. Needed because item 2 requires wiring the Plans list pane into the shared resize hook, which already has a `'plan-list'` case but it targets a stale selector (see item 2 for detail).

## Files that will NOT change

- `apps/web/src/fresh/data/demo-model.ts` — no logic changes needed for this feedback round.
- `apps/web/src/fresh/screens/CasesScreen.tsx`, `RunsScreen.tsx`, `/runs/api` (`ApiRunsWorkspace.tsx`) — reference only.
- `apps/web/src/fresh/components/RunStatusInfographic.tsx` — used as-is, no changes needed (already supports everything item 3 requires).
- `apps/web/src/fresh/styles/fresh.css` — contains dead `.tp-lay` / `.tp-list-pane` rules (lines ~290-291, ~539) left over from an old pre-rename version of this screen. They are unused by any current component (confirmed: no `.tsx` file references `className="tp-...`). Leave them alone — do not delete as part of this task; not worth the diff noise for unrelated cleanup.
- No schema/localStorage/backend/API changes.

---

## Item 1 — Coverage donut "not covered" color

**Feedback:** In the Test case coverage donut (Overview tab), the wedge representing uncovered cases should use `#555556`, not `RunDonut`'s default not-run gray (`#C5D1DE`).

**Why a component change is needed:** `RunDonut` hardcodes the not-run wedge color in its internal `segments` array — there's currently no way to override it per-instance. Every other consumer of `RunDonut` (run history hover popup, dashboard, Test Runs summary via `RunStatusInfographic`) should keep the existing default gray. So add a new optional prop rather than changing the shared default.

**`RunDonut.tsx` changes:**

1. Add an optional prop to the component's prop type and destructuring, with the current color as the default (fully backward-compatible):

```tsx
export function RunDonut({
  pass,
  fail,
  blocked,
  notrun,
  skipped = 0,
  size = 80,
  showCompleteLabel = true,
  interactive = false,
  notrunColor = '#C5D1DE',
}: {
  pass: number
  fail: number
  blocked: number
  notrun: number
  skipped?: number
  size?: number
  showCompleteLabel?: boolean
  interactive?: boolean
  notrunColor?: string
}) {
```

2. In the `geometry` `useMemo`, use `notrunColor` instead of the hardcoded string in the notrun segment:

```tsx
{ key: 'notrun', count: notrun, color: notrunColor, label: 'Not run', cumStart: pL + fL + bL + sL, len: nL },
```

3. Add `notrunColor` to the `useMemo` dependency array (it's currently `[total, pass, fail, blocked, notrun, skipped, size, showCompleteLabel]`).

**`PlansScreen.tsx` change:**

On the coverage-card `<RunDonut>` instance only (in the "Test case coverage" `pl-card`), add the prop:

```tsx
<RunDonut
  pass={resolvedCases.length}
  fail={0}
  blocked={0}
  notrun={activeCases.length - resolvedCases.length}
  notrunColor="#555556"
  size={100}
  interactive={false}
  showCompleteLabel={false}
/>
```

Do not add `notrunColor` to the run-history hover popup's donut (item 3 replaces that usage anyway) or anywhere else — every other `RunDonut`/`RunStatusInfographic` usage in the app keeps the default gray.

---

## Item 2 — Plan list sidebar: resizable, not collapsible

**Feedback:** The collapsible sidebar added in task-03 (item 5) should instead be resizable, matching the behavior of the Test Cases folder tree and Test Runs case list sidebars — i.e. a drag handle, not a collapse toggle.

**Remove the collapse feature entirely:**

In `PlansScreen.tsx`:
- Remove the `listCollapsed` state (`const [listCollapsed, setListCollapsed] = useState(false)`).
- Remove the collapse/expand toggle `<button>` in `.pl-list-hd` (the one with `ti-layout-sidebar-left-collapse` / `ti-layout-sidebar-left-expand`).
- Un-wrap the `{!listCollapsed && (...)}` conditionals around the `.pl-list-hd` inner content, `.pl-list-search`, and `.pl-list-body` — restore them to always render (same structure as before task-03 item 5, i.e. remove the three conditional wrappers, keeping their contents).
- Remove the `collapsed` class from `.pl-list-pane`'s `className` (back to a plain `className="pl-list-pane"`, no template-literal conditional needed unless another modifier is added by a later item — for this task, plain is correct).

In `prototype-plans.css`:
- Remove the `.pl-list-pane.collapsed`, `.pl-list-pane.collapsed .pl-list-search`, `.pl-list-pane.collapsed .pl-list-body` rules entirely (added in task-03).

**Add resize behavior, mirroring `CasesScreen.tsx`'s `suite-tree` resizer and `RunsScreen.tsx`'s `run-list` resizer:**

The shared resize logic lives in `apps/web/src/fresh/hooks/useResizablePanes.ts` (a single global `mousedown` listener keyed off `data-resize` on `.resizer-v` elements). It already has a `'plan-list'` branch:

```ts
} else if (type === 'plan-list') {
  start = document.querySelector('.tp-list-pane')?.getBoundingClientRect().width ?? 0
}
```

and later:

```ts
if (type === 'plan-list') root.style.setProperty('--plan-list-width', `${val}px`)
```

`.tp-list-pane` is a stale selector from an earlier version of this screen before it was renamed to use the `pl-` prefix — the current `PlansScreen.tsx` renders `.pl-list-pane`, so this branch is currently dead code. Fix the selector:

```ts
} else if (type === 'plan-list') {
  start = document.querySelector('.pl-list-pane')?.getBoundingClientRect().width ?? 0
}
```

(Only change that one selector string. Leave the `--plan-list-width` CSS variable name as-is — no need to rename it — and leave every other branch of the hook untouched.)

In `PlansScreen.tsx`, add the resizer element as a sibling between `.pl-list-pane` and `.pl-detail` (same placement pattern as `CasesScreen.tsx`'s `<div className="resizer-v" data-resize="suite-tree" data-min="160" data-max="360" />` between `.suite-tree` and `.tc-main`):

```tsx
<div className="pl-list-pane">
  {/* ...existing header/search/body... */}
</div>

<div className="resizer-v" data-resize="plan-list" data-min="220" data-max="420" />

<div className="pl-detail">
  {/* ...existing detail pane... */}
</div>
```

In `prototype-plans.css`, make `.pl-list-pane`'s width read from the CSS variable the hook writes to, defaulting to the existing 280px:

```css
.pl-list-pane {
  width: var(--plan-list-width, 280px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  overflow: hidden;
}
```

(Just change the `width` line — everything else in the rule stays the same.)

**Note on maximize interaction:** the existing `.pl-lay.pl-maximized .pl-list-pane { display: none; }` rule from task-03 item 4 still works fine alongside this — maximizing hides the pane regardless of its current resized width. No change needed there. The resizer element itself doesn't need special handling when maximized (`CasesScreen.tsx`'s equivalent resizer isn't hidden when maximized either, since the pane it resizes is already `display: none` and the resizer has nothing to affect) — but if you notice the resizer bar being visible/interactive over the expanded detail pane while maximized, add `.pl-lay.pl-maximized .resizer-v { display: none; }` to `prototype-plans.css` as a defensive fix.

---

## Item 3 — Run history hover: full parity with Test Runs summary donut

**Feedback:** The run-history hover popup (task-03 item 2) should (a) stay open while the mouse is over the popup itself, not just the table cell, and (b) show "literally a mini version" of the graphic used in the Summary section of an open Test Run — donut with hover tooltips per segment, plus the status count columns next to it, not just a bare donut.

**The reference graphic already exists as a component:** `apps/web/src/fresh/components/RunStatusInfographic.tsx`, used in `RunsScreen.tsx`'s run Summary section (`ec-run-summary`, around line 722) and in `DashboardScreen.tsx`. It renders a `RunDonut` plus a `run-status-col` list of colored count/label rows (Passed / Failed / Blocked / Skipped / Not run), and takes `interactive` (enables per-segment hover tooltips inside `RunDonut`), `compact` (tightens the layout gap), and `size` props. No new CSS is needed — `.run-status-info`, `.run-status-chart`, `.run-status-col`, `.run-status-list`, `.rsi-n`, `.rsi-lbl` are all already defined in `fresh.css` and used globally.

**3a. Swap the popup's `<RunDonut>` for `<RunStatusInfographic>`**

In `PlansScreen.tsx`, import it:

```tsx
import { RunStatusInfographic } from '../components/RunStatusInfographic'
```

Replace the run-history hover popup content:

```tsx
{runBarTooltip ? (
  <div
    className="pl-run-bar-popup"
    style={{ position: 'fixed', top: runBarTooltip.y, left: runBarTooltip.x, zIndex: 300 }}
  >
    {(() => {
      const s = runSummary(runBarTooltip.run)
      return (
        <RunStatusInfographic
          pass={s.passed}
          fail={s.failed}
          blocked={s.blocked}
          notrun={s.notRun}
          skipped={s.skipped}
          size={80}
          compact
          interactive
          showCompleteLabel
        />
      )
    })()}
  </div>
) : null}
```

`runSummary()`'s return type (`RunSummary` in `demo-model.ts`) includes a `skipped: number` field, counted the same way as `passed`/`failed`/`blocked`. `RunsScreen.tsx`'s Summary section passes it through as `skipped={summary.skipped}` — do the same here so skipped executions show up as their own row when present, matching Test Runs behavior exactly.

Do not add `onStatusClick` / `activeStatus` — those drive the live status filter on the Test Runs execution list, which has no equivalent here (this is a read-only hover preview, not an interactive filter).

**3b. Keep the popup open when the mouse moves into it**

Currently the popup closes immediately via `onMouseLeave` on the table `<td>`, which fires before the mouse can reach the fixed-position popup (they aren't DOM-nested). Mirror `RunsScreen.tsx`'s `caseIdTooltip` / `caseIdHideTimer` pattern exactly:

1. Add a ref: `const runBarHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)`.
2. On the `<td>` trigger, clear any pending hide on enter and set a short delayed hide on leave (instead of closing immediately):

```tsx
<td
  onMouseEnter={(e) => {
    if (runBarHideTimer.current) clearTimeout(runBarHideTimer.current)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setRunBarTooltip({ run, x: rect.left, y: rect.bottom + 6 })
  }}
  onMouseLeave={() => {
    runBarHideTimer.current = setTimeout(() => setRunBarTooltip(null), 300)
  }}
>
  <RunResultBar run={run} />
</td>
```

3. Add matching handlers to the popup itself, so hovering over it cancels the pending hide, and leaving it re-arms the same delayed close:

```tsx
{runBarTooltip ? (
  <div
    className="pl-run-bar-popup"
    style={{ position: 'fixed', top: runBarTooltip.y, left: runBarTooltip.x, zIndex: 300 }}
    onMouseEnter={() => {
      if (runBarHideTimer.current) clearTimeout(runBarHideTimer.current)
    }}
    onMouseLeave={() => {
      runBarHideTimer.current = setTimeout(() => setRunBarTooltip(null), 300)
    }}
  >
    {/* RunStatusInfographic from 3a */}
  </div>
) : null}
```

**3c. Fix `pointer-events` so the popup can actually receive hover events**

`.pl-run-bar-popup` in `prototype-plans.css` currently has `pointer-events: none;` (from task-03), which was fine for a static, non-interactive popup but now prevents it from ever receiving `onMouseEnter`/`onMouseLeave`, and would also block the per-segment tooltip interactions inside `RunDonut` (which rely on `onMouseEnter`/`onMouseMove` on its SVG circles). Change it to `auto`:

```css
.pl-run-bar-popup {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  padding: 10px;
  pointer-events: auto;
}
```

(Only the `pointer-events` value changes — everything else in the rule stays the same.)

---

## Verification (frontend-only prototype — no backend/DB involved)

Per the project's mandatory post-change smoke test:

1. `pnpm build`
2. `pnpm dev` (stop any stale dev server first if `.next` was rebuilt)
3. Browser smoke test on `/DP/plans` (or equivalent project key):
   - Coverage donut: confirm the "not covered" wedge renders in `#555556`, not the previous light gray. Confirm the run-history hover donut and any other `RunDonut`/`RunStatusInfographic` usage elsewhere in the app (Dashboard, Test Runs) is unaffected and still shows the original gray.
   - Sidebar resize: confirm the collapse button is gone. Drag the resizer handle between the plan list and detail pane; confirm the list pane resizes smoothly between roughly 220px and 420px, and the width persists across plan selection (backed by the `--plan-list-width` CSS var on `documentElement`, same mechanism as the folder tree / case list resizers).
   - Maximize still works correctly alongside the resizer (hides the list pane; resizer doesn't interfere).
   - Run history hover: hover a `.pl-run-bar` row — confirm the popup shows the donut *and* the Passed/Failed/Blocked/(Skipped)/Not run columns side by side, matching the look of the Summary section on an open Test Run. Hover over individual donut wedges and confirm the segment tooltip (count + percentage + label) appears, matching Test Runs behavior. Move the mouse from the table row into the popup itself and confirm it stays open; move it away from both and confirm it closes after a short delay (not instantly).
   - Core regression routes (minimum): `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`. Pay particular attention to `/DP/dashboard` and `/DP/testruns` since `RunDonut`/`RunStatusInfographic` are shared components touched by item 1.
4. Record WebM evidence where tooling supports it; screenshots for any failures.
5. Write QA report to `/tmp/relay-qa-mvp-test-plans/qa-report.md` (append to or supersede the task-03 report — pass/fail summary, bugs, known limitations, push readiness).
6. Do not push until smoke test evidence is reviewed or explicitly waived.

## Documentation

UI polish only — no new routes, no schema/localStorage/RBAC change. If `docs/product/user-guide.md` or `docs/product/feature-flow.md` describe the Plans sidebar as collapsible (from task-03), update that wording to reflect resizable instead. No changes needed to `docs/_authoritative/AS_BUILT_SNAPSHOT.md` or `docs/_authoritative/FRONTEND_CONTRACTS.md`. Update `docs/claude/handoff.md` with a short "Completed work" entry for this task once done.

## Out of scope / do not touch

- `demo-model.ts`, `CasesScreen.tsx`, `RunsScreen.tsx`, `/runs/api`, `RunStatusInfographic.tsx` — no changes needed/allowed beyond what's specified above.
- `fresh.css` — leave the dead `.tp-lay`/`.tp-list-pane` rules alone; not part of this task.
- No schema version bump, no `migrate-demo-state.ts` change (v14 unchanged).
- No backend/DB/Docker/auth/API route work.
- No new commits without explicit request.
