# Task 04 — Tab Restructure, Arrow Keys, Scrollable Create Modal

## Context from previous tasks

Branch: `mvp-test-runs`. Tasks 01–03 complete.

- `RunsScreen.tsx` is the primary execution screen at `apps/web/src/fresh/screens/RunsScreen.tsx`.
- The `ExecDetailPane` component is defined at the bottom of `RunsScreen.tsx` (not a separate file).
- `EdTab` type and `ED_TABS` array define the tabs shown in `ExecDetailPane`.
- Current tabs: Details, Steps, Activity, History, Comments, Defects.
- The `CreateCaseModal` component lives at `apps/web/src/fresh/components/CreateCaseModal.tsx`.
- Its styles come from `apps/web/src/fresh/styles/fresh.css` (`.create-dialog`, `.create-body`, `.create-foot`).
- No Tailwind. No backend changes.

---

## Objective

Four improvements to `RunsScreen` and the create-case modal:

1. **Remove the "Activity" tab** from `ExecDetailPane` — it is redundant.
2. **Merge the "Steps" tab into "Details"** — remove the Steps tab; move steps content into the Details tab panel below the metadata block and above Result information.
3. **Replace J/K keyboard shortcuts** with Arrow Up / Arrow Down for case navigation.
4. **Make `CreateCaseModal` scrollable** so it doesn't overflow the viewport when many steps are added.

---

## Files to change

### 1. `apps/web/src/fresh/screens/RunsScreen.tsx`

#### A — Remove Activity tab and merge Steps into Details

Update `EdTab` type:
```ts
type EdTab = 'details' | 'history' | 'comments' | 'defects'
```

Update `ED_TABS` array:
```ts
const ED_TABS: { id: EdTab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'history', label: 'History' },
  { id: 'comments', label: 'Comments' },
  { id: 'defects', label: 'Defects' },
]
```

In `ExecDetailPane`, remove the `ed-tp` panel for `activity` entirely.

Remove the `ed-tp` panel for `steps`.

In the `details` `ed-tp`, insert the steps block **after** the metadata grid block and **before** the `ed-result-info` block:

```tsx
{/* Steps — moved from the former Steps tab */}
<div className="ed-steps-section">
  {caseData.steps.map((step, i) => (
    <div key={step.id} className="ed-step-item">
      <div className="ed-step-hd">
        <span className="ed-step-n">{i + 1}</span>
        {step.stepResults && execution?.stepResults?.[step.id] ? (
          <select
            className="ed-step-status"
            value={execution.stepResults[step.id] ?? 'Not run'}
            onChange={(e) => onStepResult(step.id, e.target.value as ExecStatus)}
            disabled={sealed}
          >
            {EXEC_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        ) : null}
      </div>
      <div className="ed-step-act">{step.action}</div>
      {step.expected ? <div className="ed-step-exp">→ {step.expected}</div> : null}
    </div>
  ))}
  {caseData.steps.length === 0 && (
    <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>No steps defined.</div>
  )}
</div>
```

**Important:** Read the existing Steps `ed-tp` content carefully before removing it — copy its exact rendering logic into the Details tab. The step result dropdowns (if any) must be preserved. Only the tab wrapper changes; the inner content moves verbatim.

#### B — Replace J/K with Arrow Up / Arrow Down

Find the `keydown` event handler (currently checks `k === 'j'` and `k === 'k'`). Replace:

```ts
// Before:
if (k === 'j') navCase(1)
if (k === 'k') navCase(-1)

// After:
if (e.key === 'ArrowDown') { e.preventDefault(); navCase(1) }
if (e.key === 'ArrowUp')   { e.preventDefault(); navCase(-1) }
```

`e.preventDefault()` stops the page from scrolling when arrows are pressed. The existing `isTyping(e)` guard (which prevents navigation when focus is inside an input/textarea) must remain in place.

---

### 2. `apps/web/src/fresh/styles/fresh.css`

Make `.create-dialog` a flex column with a capped height so the header and footer stay visible while the body scrolls:

```css
/* Before: */
.create-dialog { width: 430px; background: var(--surface); border-radius: 8px; border: 1px solid var(--border); box-shadow: 0 12px 40px rgba(4,44,83,.22); overflow: hidden; margin-top: 60px }

/* After: */
.create-dialog { width: 430px; background: var(--surface); border-radius: 8px; border: 1px solid var(--border); box-shadow: 0 12px 40px rgba(4,44,83,.22); overflow: hidden; margin-top: 60px; display: flex; flex-direction: column; max-height: 85vh }
```

Make `.create-body` scrollable:
```css
/* Before: */
.create-body { padding: 12px 16px }

/* After: */
.create-body { padding: 12px 16px; overflow-y: auto; flex: 1 }
```

The `.create-foot` already renders after `.create-body` in the DOM so it will naturally stick to the bottom of the flex column — no changes needed there.

---

## Files that will NOT change
- `demo-model.ts`, `FreshProvider.tsx`, `migrate-demo-state.ts`, `project-routes.ts`
- `prototype-runs.css`
- `CreateCaseModal.tsx` (CSS change in `fresh.css` is enough)
- Any other file

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/screens/RunsScreen.tsx
Read apps/web/src/fresh/styles/fresh.css
```

---

## Step 2 — Make changes

Apply in order: `RunsScreen.tsx` (tabs + keyboard) → `fresh.css` (modal scroll).

---

## Step 3 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required.

---

## Step 4 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. Open a test run and select a case — confirm the tab bar shows: **Details, History, Comments, Defects** (no Steps, no Activity).
3. On the **Details** tab, confirm: Preconditions → Metadata grid → Steps list → Result information (in that order).
4. Confirm step result dropdowns still work on the Details tab (set a step result, confirm it persists).
5. **Arrow keys**: click anywhere outside an input, press ↓ — confirm the next case is selected. Press ↑ — confirm previous case. Confirm the page does not scroll.
6. **Arrow keys in input**: click inside the search bar or a textarea, press ↓ — confirm case does NOT change.
7. **Create Case modal**: open "New case" and add 10+ steps — confirm the modal scrolls and the Cancel/Create buttons remain visible at the bottom.

---

## Step 5 — Commit

Run `git diff HEAD` and cross-check actual changes against the message below. Adjust if anything differs, then commit.

```
Test runs: merge Details/Steps tab, remove Activity, arrow key navigation, scrollable create modal

`RunsScreen.tsx`
* Removed 'activity' from `EdTab` type and `ED_TABS` array; removed its `ed-tp` panel
* Removed 'steps' from `EdTab` type and `ED_TABS` array; removed its `ed-tp` panel
* Moved steps rendering block into the 'details' `ed-tp`, positioned after the metadata grid and before Result information
* Replaced J/K keydown handlers with ArrowDown/ArrowUp; added `e.preventDefault()` to both to prevent page scroll

`fresh.css`
* Added `display: flex; flex-direction: column; max-height: 85vh` to `.create-dialog`
* Added `overflow-y: auto; flex: 1` to `.create-body` so the body scrolls while header and footer stay fixed
```

---

## Step 6 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
