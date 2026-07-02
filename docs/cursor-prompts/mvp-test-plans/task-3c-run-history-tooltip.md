# Task 3c — Run history hover tooltip: size + positioning fix

Branch: `mvp-test-plans`
Schema: v14 — **no schema change in this task.**

This task builds on the run-history hover popup delivered in `task-3b-plans-screen-followup.md` (already implemented and committed as task 3b, formerly numbered task-04).

## Files that will change

- `apps/web/src/fresh/screens/PlansScreen.tsx`

## Files that will NOT change

- `apps/web/src/fresh/styles/prototype-plans.css` — the `.pl-run-bar-popup` rule has no fixed width/height, so it will grow to fit the larger content automatically. No CSS edit expected, but see the note at the end of Item 1 if the smoke test shows otherwise.
- `apps/web/src/fresh/components/RunStatusInfographic.tsx`, `RunDonut.tsx` — used as-is; the size increase is a prop value change at the call site, not a component change.
- `apps/web/src/fresh/data/demo-model.ts` — no logic changes.
- No schema/localStorage/backend/API changes.

---

## Item 1 — Increase hover tooltip size ~15%, keeping donut/list proportional

**Feedback:** The run history hover tooltip is currently too small — the status label list (Passed/Failed/Blocked/Skipped/Not run) gets cropped at the bottom. Increase it by around 15%, keeping the donut and the status list in the same visual ratio.

**Where:** `PlansScreen.tsx`, the run-history hover popup, which renders:

```tsx
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
```

**Why a single prop change is sufficient:** `RunStatusInfographic` renders everything — the donut chart and the status column list — sized off one CSS custom property, `--pieSize`, set from the `size` prop (`fresh.css`: `.run-status-info{height:var(--pieSize,122px);...}`, `.run-status-chart{width:var(--pieSize,122px);height:var(--pieSize,122px)}`, `.run-status-col{height:var(--pieSize,122px);...}`, and `--statusListHeight:calc(var(--pieSize,122px)*0.836)`). Because both the donut and the list height scale off the same variable, increasing the `size` prop automatically keeps them proportional — there's no separate donut-size vs. list-size to coordinate by hand.

The label/count text sizes (`--rsi-count-size`, `--rsi-label-size`) are `clamp()`-based and are already pinned at their minimum floor (12–13px) at `size={80}` — they won't grow further until `size` gets much larger (past ~96–100). That means increasing `size` mostly buys more *vertical room* for the list container at the same text size, which is exactly what's needed to stop the bottom-row clipping, rather than making the text itself bigger.

**Change:** bump `size={80}` to `size={92}` (80 × 1.15 = 92, a precise 15% increase):

```tsx
<RunStatusInfographic
  pass={s.passed}
  fail={s.failed}
  blocked={s.blocked}
  notrun={s.notRun}
  skipped={s.skipped}
  size={92}
  compact
  interactive
  showCompleteLabel
/>
```

**If clipping still occurs after this change** (verify visually in the smoke test, with a run that has all five statuses represented — Passed, Failed, Blocked, Skipped, and Not run — since 5 rows is the tightest fit): increase `size` a bit further in small increments (e.g. try 100) rather than touching the CSS, since the CSS is shared by every other `RunStatusInfographic` usage in the app (Dashboard, Test Runs summary) and should not be changed for this one call site. Only fall back to a `.pl-run-bar-popup`-scoped CSS tweak (e.g. removing/reducing its `padding`) if increasing `size` alone doesn't fully resolve it.

---

## Item 2 — Tooltip should appear directly under the mouse cursor, not below the row

**Feedback:** The tooltip currently appears with a gap between the cursor and the popup, because it's positioned relative to the hovered table cell's bounding box rather than the mouse position. Since the popup opens below the *entire row*, moving the mouse straight down to reach it instead crosses into the next run's row first — which swaps the tooltip to that other run instead of letting the user reach the one they were trying to inspect. Positioning the tooltip directly under the mouse (no gap) lets the user drag straight down into it.

**Where:** `PlansScreen.tsx`, the `<td>` that wraps `<RunResultBar run={run} />` in the run history table:

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

**Problem:** `rect.left` / `rect.bottom + 6` is derived from the `<td>`'s bounding box, not the cursor — so the popup always opens at the same spot (bottom-left of the cell, 6px below), regardless of where in the cell the mouse actually entered. On a table with row height less than the tooltip's distance-to-next-row, this lands the popup at or past the boundary of the next row.

**Fix:** use the mouse event's own coordinates instead of the element's bounding box, with an offset small enough that the popup is right at the cursor tip (not a meaningful gap the mouse has to cross):

```tsx
<td
  onMouseEnter={(e) => {
    if (runBarHideTimer.current) clearTimeout(runBarHideTimer.current)
    setRunBarTooltip({ run, x: e.clientX + 6, y: e.clientY + 6 })
  }}
  onMouseLeave={() => {
    runBarHideTimer.current = setTimeout(() => setRunBarTooltip(null), 300)
  }}
>
  <RunResultBar run={run} />
</td>
```

- `e.clientX + 6` / `e.clientY + 6` places the popup's top-left corner 6px down-and-right of the exact point the mouse entered the results bar — enough offset that the cursor isn't visually sitting on top of the popup's own border/shadow, but small enough that moving the mouse down-right immediately lands inside the popup rather than crossing unrelated content. This mirrors the offset style already used by `RunDonut`'s own internal segment tooltip (`x: e.clientX - rect.left + 10, y: e.clientY - rect.top - 28` — mouse-relative, not element-relative).
- Do not change how the popup itself is rendered (`position: fixed`, `top: runBarTooltip.y`, `left: runBarTooltip.x`) — only the *source* of `x`/`y` changes, from the cell's `getBoundingClientRect()` to the mouse event's `clientX`/`clientY`.
- Leave the `onMouseEnter`/`onMouseLeave` pair on the popup `<div>` itself untouched (the delayed-hide timer logic from task 3b) — that part already works correctly and isn't part of this feedback.
- Double-check the popup doesn't run off the right/bottom edge of the viewport for runs in the last column/row of a long list — if `PlansScreen.tsx`'s table can scroll and rows near the bottom of the viewport are common, a simple viewport-edge clamp (e.g. `Math.min(e.clientX + 6, window.innerWidth - <popup approx width>)`) is reasonable defensive polish, but only add it if it doesn't overcomplicate the change — this wasn't explicitly requested, so keep it minimal unless the smoke test surfaces an actual off-screen clipping issue.

---

## Verification (frontend-only prototype — no backend/DB involved)

Per the project's mandatory post-change smoke test:

1. `pnpm build`
2. `pnpm dev` (stop any stale dev server first if `.next` was rebuilt)
3. Browser smoke test on `/DP/plans` (or equivalent project key):
   - Find or create a test run with a mix of Passed, Failed, Blocked, Skipped, and Not run executions (all 5 rows populated) so the list is at its tallest. Hover its `.pl-run-bar` and confirm all 5 status rows (Passed/Failed/Blocked/Skipped/Not run) are fully visible with no bottom cropping, and the donut still looks proportionate to the list next to it (not oversized/undersized relative to the text).
   - Hover a `.pl-run-bar` and confirm the tooltip appears essentially right at the cursor (small fixed offset, not a large gap below the row). Move the mouse straight down from the hovered row's results bar into the tooltip and confirm it doesn't get replaced by the next row's tooltip or disappear before you reach it.
   - Confirm segment-hover tooltips inside the donut (from `interactive`) still work at the new size.
   - Core regression routes (minimum): `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`.
4. Record WebM evidence where tooling supports it; screenshots for any failures.
5. Write QA report to `/tmp/relay-qa-mvp-test-plans/qa-report.md` (append to or supersede the prior report — pass/fail summary, bugs, known limitations, push readiness).
6. Do not push until smoke test evidence is reviewed or explicitly waived.

## Documentation

UI polish only — no new routes, no schema/localStorage/RBAC change. No changes needed to `docs/product/user-guide.md`, `docs/product/feature-flow.md`, `docs/_authoritative/AS_BUILT_SNAPSHOT.md`, or `docs/_authoritative/FRONTEND_CONTRACTS.md`. Update `docs/claude/handoff.md` with a short "Completed work" entry for this task once done.

## Out of scope / do not touch

- `demo-model.ts`, `CasesScreen.tsx`, `RunsScreen.tsx`, `/runs/api`, `RunStatusInfographic.tsx`, `RunDonut.tsx` — no changes needed.
- `prototype-plans.css` — no changes expected (see Item 1's fallback note if the smoke test proves otherwise).
- No schema version bump, no `migrate-demo-state.ts` change (v14 unchanged).
- No backend/DB/Docker/auth/API route work.
- No new commits without explicit request.
