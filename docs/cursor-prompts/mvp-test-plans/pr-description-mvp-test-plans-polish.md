# PR: mvp-test-plans → mvp-main

## Summary

This branch reuses `mvp-test-plans` (previously merged as PR #13) for a UI polish round on the Test Plans screen, driven by three rounds of direct user feedback gathered after PR #13 and PR #14 (`mvp-requirements-defects-slice`) landed on `mvp-main`. It adds an "Unfiled" folder-query option, a hover preview donut with live status breakdown on the run history table, a real coverage donut on the Overview tab, a maximize/minimize toggle and a resizable (not collapsible) list sidebar for the plan detail layout, plus two follow-up passes tightening the hover-donut's color, size, and cursor-tracking behavior. A small unrelated developer-tooling addition (a one-click local dev restart script and a `?relay-reset=1` demo-reset URL param) is also included, committed earlier on this branch. No schema change — `DEMO_SCHEMA_VERSION` remains v14 throughout.

---

## What's included

### Developer Tooling

**Dev tooling: Add restart script and demo reset URL** ([`60a43cf`](https://github.com/qhedroid/Relay/commit/60a43cf))
- `scripts/restart-web-dev.command` — double-clickable Mac script that resets the dev server, runs `pnpm dev`, waits for port 3000, then opens Chrome to a fresh demo state
- `FreshProvider.tsx` — added a `?relay-reset=1` URL param handler that clears the `relay-demo-v2` localStorage key, reseeds initial demo state, and strips the param from the URL via `history.replaceState` afterward

### Test Plans — Overview Tab Polish

**Test plans: Polish Plans screen with five UI feedback items** ([`abbb329`](https://github.com/qhedroid/Relay/commit/abbb329))
- `demo-model.ts` — `resolvePlanCases()` folder branch now handles the `'__unfiled__'` sentinel by adding `null` to the allowed-folder set, matching the existing `casesInFolder()` behavior
- `PlansScreen.tsx` — added an "Unfiled" entry to the `FolderQueryBody` folder picker with matching chip label; added a hover popup on the run history Results bar (`runBarTooltip` state) showing a `RunDonut`; replaced the plain coverage percentage with a `RunDonut` (pass = resolved cases, notrun = uncovered); added a plan detail maximize/minimize toggle (`.dp-max-btn`, resets on plan change); added a collapsible plan list sidebar (32px collapsed width)
- `prototype-plans.css` — styles for the collapsed list pane, maximized layout, and run-bar hover popup

### Test Plans — Follow-up Feedback Round

**Test plans: Follow up Plans screen with three UI feedback items** ([`950c3f0`](https://github.com/qhedroid/Relay/commit/950c3f0))
- `RunDonut.tsx` — added an optional `notrunColor` prop (defaults to the existing gray, so every other usage is unaffected) for per-instance not-run wedge color overrides
- `useResizablePanes.ts` — fixed the `'plan-list'` resize case, which referenced a stale `.tp-list-pane` selector left over from an earlier pre-rename version of the screen; now targets `.pl-list-pane`
- `PlansScreen.tsx` — set the coverage donut's uncovered wedge to `#555556` via `notrunColor`; replaced the collapsible plan list sidebar with a resizable one (drag handle, matching the Test Cases/Test Runs sidebars); upgraded the run history hover popup from a bare `RunDonut` to `RunStatusInfographic` (adds per-segment hover tooltips and a status count column) with a delayed-hide timer so the popup stays open while the mouse moves into it
- `prototype-plans.css` — plan list width now driven by `--plan-list-width`; removed the collapsed-state rules; hides the resizer handle when the panel is maximized; enabled `pointer-events` on the run-bar hover popup so it can receive hover events

### Test Plans — Run History Tooltip Fix

**Test plans: Fix run history hover tooltip size and position** ([`a70a798`](https://github.com/qhedroid/Relay/commit/a70a798))
- `PlansScreen.tsx` — increased the run history hover `RunStatusInfographic` size from 80 to 92 (~15%, donut and status list stay proportional since both scale off the same `--pieSize` CSS variable) to stop the status list clipping at the bottom; repositioned the hover popup to the mouse cursor (`clientX/clientY + 6`) instead of the hovered cell's bounding rect, so dragging the mouse down into the popup no longer crosses into the next run's row and swaps the tooltip

---

## ⚠️ Caveats

- **Docs-only commits interleaved throughout:** `0db2641`, `c2a52e9`, `8d33d60`, and `a16683f` are Cursor-prompt-drafting and session-handoff artifacts (`docs/claude/**`, `docs/cursor-prompts/**`) with no source changes — intentional planning history, safe to ignore or squash during review.
- **`pnpm build` / browser smoke test not independently verified in this session.** Each Cursor prompt (task-03, task-3b/task-04, task-3c) requires the implementing agent to run `pnpm build`, `pnpm dev`, and a browser smoke test before push, with evidence written to `/tmp/relay-qa-mvp-test-plans/qa-report.md` on the machine that ran it — that report was not reviewed as part of drafting this PR description and should be checked (or the build re-verified) before merge.
- **`?relay-reset=1` is a destructive, unauthenticated action gated only by a URL query param** — visiting a link containing it wipes the visitor's local demo state with no confirmation prompt. Fine for a frontend-only prototype with no real user data, but worth flagging since it's a silent, irreversible local data wipe triggered by URL alone.
- **Dead CSS left in place on purpose:** `fresh.css`'s `.tp-lay` / `.tp-list-pane` rules (from an earlier pre-rename version of this screen) were confirmed unused by any current component but intentionally not removed, to keep this PR's diff scoped to the reported feedback items.
- **Coverage percentage / donut** still reflects `resolvedCases.length` vs. total active project cases — this is the same placeholder calculation noted as a caveat in the original PR #13 description, now visualized as a donut instead of raw text but not otherwise changed.

---

## Testing

- **Build:** Not run in this docs-drafting session — see Caveats. `pnpm build` should be confirmed clean before merge.
- **localStorage:** Key `relay-demo-v2`, schema unchanged at v14 (no migration needed for this branch). The new `?relay-reset=1` param (from the dev-tooling commit) clears and reseeds this key when present in the URL.
- **Manual smoke checks:**
  - `/DP/plans` → Test cases tab → add a folder query group → "Unfiled" appears in the folder picker once no other folder excludes it → selecting it shows an "Unfiled" chip and includes cases with no folder in the resolved panel
  - Overview tab → run history table → hover a run's Results bar → popup shows a donut with Passed/Failed/Blocked/Skipped/Not run columns and per-segment hover tooltips, sized to avoid clipping the status list, appearing right at the cursor; moving the mouse down into the popup keeps it open instead of triggering the next row's popup
  - Overview tab → Test case coverage card shows a donut (green = covered, `#555556` = uncovered) with the case count label below it
  - Plan detail header → maximize toggle hides the list pane and expands the detail pane; toggling back restores it; switching to a different plan resets it to non-maximized
  - Plan list pane → drag the resizer handle between the list and detail panes; width adjusts smoothly and persists across plan selection; no collapse button present
  - Local dev: run `scripts/restart-web-dev.command`, confirm it restarts the dev server and opens Chrome to a reset demo state; manually visit a URL with `?relay-reset=1` appended and confirm localStorage is cleared/reseeded and the param is stripped from the address bar afterward
  - Core regression routes unaffected: `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`
