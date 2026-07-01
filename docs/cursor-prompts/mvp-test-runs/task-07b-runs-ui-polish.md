# Task 07b — Test Runs UI Polish (9 fixes)

## Context

Branch: `mvp-test-runs`
Schema: v11 (no schema changes in this task)

This is a feedback-fix prompt following Task 07. All changes are purely UI — no state model, migration, or API route changes required.

---

## Files that WILL change

- `apps/web/src/fresh/screens/RunsScreen.tsx`
- `apps/web/src/fresh/screens/CasesScreen.tsx`
- `apps/web/src/fresh/components/TestRunsTopbar.tsx`
- `apps/web/src/fresh/styles/fresh.css`
- `apps/web/src/fresh/styles/prototype-runs.css`

## Files that will NOT change

- `FreshProvider.tsx`, `demo-model.ts`, `migrate-demo-state.ts` — no schema changes
- Any component not listed above

---

## Fix 1 — Details pane: reorganise field order and rename "Metadata"

**Location:** `RunsScreen.tsx` → `ExecDetailPane` → the `.ed-tp` for the `details` tab (around line 1055).

**Current order in Details tab:**
1. Preconditions block
2. "Metadata" box (grid: Priority, Type, Assigned to, Last result)
3. Steps
4. Result information (collapsible)

**New order:**

1. **Assigned to** — standalone at the very top, outside any grid/box. It stays as an `<select>` when unsealed, or plain text when sealed. Give it a small label `"Assigned to"` in `.ed-sl` style above it. Remove it from the metadata grid.

2. **Custom Fields** — collapsible section (same style as "Result information") with label "Custom Fields". Contains the remaining fields from the old Metadata grid: Priority, Type, Last result. Default open (`useState(true)`). When collapsed, only the header chevron + label are shown.

3. **Preconditions** — moved to after Custom Fields, before Steps. Keep the existing markup.

4. **Steps** — unchanged, below Preconditions.

5. **Result information** — stays at the bottom, unchanged.

**Implementation notes:**
- Add a new state variable in `ExecDetailPane`: `const [customFieldsOpen, setCustomFieldsOpen] = useState(true)`
- The collapsible header should look identical to `.ed-result-info-hd` (chevron + label). Add a CSS class pair in `prototype-runs.css` e.g. `.ed-custom-fields` / `.ed-custom-fields-hd` / `.ed-custom-fields-body` that mirrors the `.ed-result-info` styling.
- The Assigned to block should sit above the Custom Fields section, with a small `ed-sl` label and the `<select>` (or plain text) directly below it, inside a simple `<div style={{ marginBottom: 10 }}>`.

---

## Fix 2 — Steps: show all content, allow scrolling for long case lists

**Symptoms:**
- The "Save" button for step comments is cut off (not visible).
- For test cases with many steps, the lower steps are pushed off-screen with no way to scroll to them.

**Root cause:** The `.ed-tp.on` pane is a flex column. Scrolling is set on `.ed-tp` (`overflow-y: auto`) but the containing `.ed-pane` may not be fully constraining height, meaning the scroll never engages.

**Fix — CSS in `prototype-runs.css`:**

1. Confirm `.runs-v12 .ed-pane` has `display: flex; flex-direction: column; min-height: 0; overflow: hidden` (add if missing). The pane must be height-constrained from above for the inner scroll to work.

2. Confirm `.runs-v12 .ed-tp.on` has both `overflow-y: auto` AND `min-height: 0` AND `flex: 1`. Move `overflow-y: auto` into the `.ed-tp.on` rule so it only applies when the tab is visible.

3. Add `padding-bottom: 12px` to `.runs-v12 .ed-tp.on` so the last step's Save button isn't clipped by the footer.

4. Individual step cards (`.esc`) already expand to content height via `overflow: hidden` on the outer card — the content inside (`.esc-body`) should be fully visible. Do NOT add a fixed height to `.esc`. The `overflow: hidden` on `.esc` is for border-radius clipping only; content must not be cut off. If cutting is happening, change `.esc { overflow: hidden }` to `.esc { overflow: visible }` and rely on `border-radius` clipping being a non-issue (or use `border-radius` with `clip-path` alternative if needed — but simplest fix is `overflow: visible` since the card's own border handles visual boundaries).

5. The step textarea (`rows={1}`) is very short. In `RunsScreen.tsx`, change the step comment textarea `rows` from `1` to `2` for slightly more comfortable writing height. Also add `style={{ resize: 'vertical' }}` to the textarea so users can expand it manually if needed.

---

## Fix 3 — Shortcut bar: update J/K → ↑/↓

**Location:** `RunsScreen.tsx`, bottom of `ExecDetailPane` return, in `.sc-bar`.

Find:
```tsx
<div className="sc-h"><span className="kbd">J/K</span>Navigate</div>
```

Replace with:
```tsx
<div className="sc-h"><span className="kbd">↑/↓</span>Navigate</div>
```

No other shortcut bar changes required.

---

## Fix 4 — Grey out "Create run" when project has no cases

**Context:** There is already a guard in `CasesScreen.tsx` that disables the "Create test run" button when `activeCases.length === 0`. The same enforcement must be applied to `RunsScreen.tsx` and `TestRunsTopbar.tsx`.

### 4a — `RunsScreen.tsx`

Add `activeCases` to the `useFresh()` destructure at the top of `RunsScreen`:

```tsx
const {
  activeProject,
  activeCases,   // ← add this
  activeFolders,
  activeRuns,
  ...
} = useFresh()
```

Compute:
```tsx
const hasCases = activeCases.length > 0
```

Pass `hasCases` to every `<TestRunsTopbar>` instance (there are 4 in the file — the two early-return states and the two in the main render). Add `hasCases={hasCases}` prop to each.

Also, in the **empty-state** early return (`activeRuns.length === 0`) and the **no-run** state (`!currentRun`), the "Create test run" `<button>` should receive `disabled={!hasCases}` and `title={!hasCases ? 'Add test cases to this project before creating a run' : undefined}`.

### 4b — `TestRunsTopbar.tsx`

Add `hasCases?: boolean` to `TestRunsTopbarProps` (default `true` to avoid breaking callers that don't pass it yet):

```tsx
interface TestRunsTopbarProps {
  ...
  hasCases?: boolean
}
```

Destructure it:
```tsx
export function TestRunsTopbar({ ..., hasCases = true }: TestRunsTopbarProps) {
```

In the "Create new run…" button in the More dropdown, add `disabled={!hasCases}`:
```tsx
<button
  type="button"
  className="tr-more-item tr-more-create"
  disabled={!hasCases}
  onClick={() => { closeMore(); onCreateRun() }}
>
  Create new run…
</button>
```

Greyed-out disabled buttons already inherit styling via the existing `.btn:disabled` / `tr-more-item:disabled` rules — no new CSS needed.

---

## Fix 5 — Sparkline tooltip: show TR-XXXXX format

**Location:** `CasesScreen.tsx`, the sparkline tooltip block (search for `"Go to execution"`).

The run key is stored as a zero-padded 5-digit number (e.g., `00001`). The tooltip currently renders `{lr.run.runKey}` which shows `00001`. It should show `TR-00001`.

Find:
```tsx
<span style={{ color: 'var(--text3)', fontSize: 11 }}>Go to execution: </span>
<a
  href={testRunPath(activeProject.key, lr.run.runKey)}
  onClick={(e) => { e.preventDefault(); router.push(testRunPath(activeProject.key, lr.run.runKey)) }}
  style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 11, textDecoration: 'none' }}
>
  {lr.run.runKey}
</a>
```

Change `{lr.run.runKey}` to `` {`TR-${lr.run.runKey}`} `` (just the link text — the `href` and `router.push` still use `lr.run.runKey` unchanged):

```tsx
>
  {`TR-${lr.run.runKey}`}
</a>
```

---

## Fix 6 — Test Runs case list: tooltip only on ID text + blue/underlined styling

**Context:** The case ID tooltip in `RunsScreen.tsx` (`caseIdTooltip`) is already correctly triggered from the `.ec-cid` div's `onMouseEnter`/`onMouseLeave` — it is NOT on the whole row. However the `.ec-cid` text has no visual affordance (it looks like plain dimmed text), so users don't know it's hoverable/linkable.

**Changes:**

### 6a — `fresh.css`

Make `.ec-cid` look like a hyperlink. Add to the `.ec-cid` rule (or scope under `.runs-v12` in `prototype-runs.css` to avoid affecting CasesScreen):

Add in `prototype-runs.css` (scoped to avoid touching CasesScreen's caseKey display):
```css
.runs-v12 .ec-cid {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
```

### 6b — Verify hover scope in `RunsScreen.tsx`

The `onMouseEnter`/`onMouseLeave` handlers are on the `.ec-cid` div. No change needed to JS. Just confirm (read-only check) that nothing additional has been added since — the handlers should remain on `.ec-cid` only, not on `.ec-case`.

---

## Fix 7 — Test case row font sizes

**Location:** `fresh.css` (global rules for `.ec-cid`, `.ec-cnm`, `.ec-cby`).

These classes are shared between CasesScreen and RunsScreen. To avoid affecting CasesScreen, add scoped overrides in `prototype-runs.css`:

```css
/* Test case row typography in runs view */
.runs-v12 .ec-cid {
  font-size: 11px;
}
.runs-v12 .ec-cnm {
  font-size: 14px;
}
.runs-v12 .ec-cby {
  font-size: 11px;
}
```

Note: `.runs-v12 .ec-cid` will merge with the rule added for Fix 6 above — combine them into one `.runs-v12 .ec-cid` block.

---

## Fix 8 — Summary section: collapsible with "Summary" title

**Location:** `RunsScreen.tsx`, the `ec-run-hd` section containing `<RunStatusInfographic>` (around the `ec-run-summary` div).

**Changes:**

### 8a — `RunsScreen.tsx`

Add state near the top of `RunsScreen`:
```tsx
const [summaryOpen, setSummaryOpen] = useState(true)
```

Wrap the existing `ec-run-summary` div:

**Before:**
```tsx
<div className="ec-run-summary">
  <RunStatusInfographic ... />
</div>
```

**After:**
```tsx
<div className="ec-summary-section">
  <div
    className="ec-summary-hd"
    onClick={() => setSummaryOpen((v) => !v)}
  >
    <i className={`ti ${summaryOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ fontSize: 10 }} />
    <span>Summary</span>
  </div>
  {summaryOpen && (
    <div className="ec-run-summary">
      <RunStatusInfographic
        pass={summary.passed}
        fail={summary.failed}
        blocked={summary.blocked}
        notrun={summary.notRun}
        skipped={summary.skipped}
        size={DONUT_CHART_SIZE}
        compact
        showCompleteLabel
        interactive
        activeStatus={filter}
        onStatusClick={(s) => setFilter((prev) => (prev === s ? 'all' : s))}
      />
    </div>
  )}
</div>
```

### 8b — `prototype-runs.css`

Add CSS for the summary section header (mirrors `.ed-result-info-hd` style):

```css
.runs-v12 .ec-summary-section {
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

.runs-v12 .ec-summary-hd {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .07em;
  color: var(--text3);
  user-select: none;
}
.runs-v12 .ec-summary-hd:hover { color: var(--text); }
```

---

## Fix 9 — Reorder tabs + add Requirements tab

**Location:** `RunsScreen.tsx`, `ExecDetailPane`.

### 9a — Update `EdTab` type

**Before:**
```tsx
type EdTab = 'details' | 'history' | 'comments' | 'defects'
```

**After:**
```tsx
type EdTab = 'details' | 'comments' | 'defects' | 'requirements' | 'history'
```

### 9b — Update `ED_TABS` array

**Before:**
```tsx
const ED_TABS: { id: EdTab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'history', label: 'History' },
  { id: 'comments', label: 'Comments' },
  { id: 'defects', label: 'Defects' },
]
```

**After:**
```tsx
const ED_TABS: { id: EdTab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'comments', label: 'Comments' },
  { id: 'defects', label: 'Defects' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'history', label: 'History' },
]
```

### 9c — Add Requirements tab panel

After the existing Defects tab panel (`ed-tp` for `tab === 'defects'`) and before the History tab panel, add a Requirements panel:

```tsx
<div className={`ed-tp${tab === 'requirements' ? ' on' : ''}`}>
  {caseData.references ? (
    <div style={{ padding: '8px 10px' }}>
      <div className="ed-sl" style={{ marginBottom: 6 }}>Linked requirements</div>
      <div className="ed-pt" style={{ whiteSpace: 'pre-wrap' }}>{caseData.references}</div>
    </div>
  ) : (
    <div style={{ padding: 12, color: 'var(--text3)', fontSize: 12 }}>
      No requirements linked to this test case.
    </div>
  )}
</div>
```

**Note on difference from CasesScreen Requirements tab:** In the Test Cases view (CasesScreen), the Requirements tab supports editing and shows structured requirement links. In the Test Runs execution context, requirements are read-only — the tester is referencing what the case validates, not editing the links. This read-only display from `caseData.references` is the correct behaviour for the runs context.

---

## Build check

After all changes, run:
```
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required before considering this task complete.
