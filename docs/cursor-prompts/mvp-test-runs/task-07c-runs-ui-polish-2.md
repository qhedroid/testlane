# Task 07c — Test Runs UI Polish (5 fixes)

## Context

Branch: `mvp-test-runs`
Schema: v11 (no schema changes in this task)

Feedback fixes following Task 07b. Items 2, 4, and 5 were verified against live Testiny
at `https://testiny.trialinteractive.com/DP/testruns` before specifying behaviour.

---

## Files that WILL change

- `apps/web/src/fresh/screens/RunsScreen.tsx`
- `apps/web/src/fresh/screens/CasesScreen.tsx`
- `apps/web/src/fresh/data/FreshProvider.tsx`
- `apps/web/src/fresh/styles/prototype-runs.css`

## Files that will NOT change

- `demo-model.ts`, `migrate-demo-state.ts` — no schema changes
- `TestRunsTopbar.tsx` — already updated in 07b; only touch if the create-run guard is verified missing
- Any component not listed above

---

## Fix 1 — Step-comment hyperlinking in Comments tab

**Location:** `RunsScreen.tsx` → `ExecDetailPane` → the `tab === 'comments'` panel.

When a comment was added to a specific step (not a general comment), the Comments tab shows
a label like "Step 3: [step title]". This label should be clickable and navigate the user to
that step in the Details tab.

### Implementation

**1a. Add a scroll-target ref inside `ExecDetailPane`:**

```tsx
const scrollToStepRef = useRef<string | null>(null)
```

**1b. Add a `useEffect` that fires when `tab` changes to `'details'`:**

```tsx
useEffect(() => {
  if (tab !== 'details') return
  const stepId = scrollToStepRef.current
  if (!stepId) return
  scrollToStepRef.current = null
  setTimeout(() => {
    document.getElementById(`step-${stepId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 50)
}, [tab])
```

**1c. Give each step card an `id`:**

In the step map loop, add `id={`step-${s.id}`}` to the outer `.esc` div:

```tsx
<div key={s.id} id={`step-${s.id}`} className="esc">
```

**1d. Make the step label in Comments tab clickable:**

In the Comments tab, find where `c.kind === 'step'` is rendered:

```tsx
{c.kind === 'step' ? (
  <div className="ed-cmt-step-lbl">Step {c.stepNum}: {c.stepTitle...}</div>
) : ...}
```

Change it to:

```tsx
{c.kind === 'step' && c.stepId ? (
  <div
    className="ed-cmt-step-lbl ed-cmt-step-link"
    onClick={() => {
      scrollToStepRef.current = c.stepId!
      onTab('details')
    }}
    title="Go to step"
  >
    ↗ Step {c.stepNum}: {c.stepTitle && c.stepTitle.length > 40 ? `${c.stepTitle.slice(0, 40)}…` : c.stepTitle}
  </div>
) : (
  <div className="ed-cmt-step-lbl">General comment</div>
)}
```

**Note:** `c.stepId` must be added to the `allComments` memo items. Currently the items have
`{ kind, stepNum, stepTitle, author, createdAt, body }`. Add `stepId?: string` and populate it
from `s.id` when building step comments:

```tsx
items.push({
  kind: 'step',
  stepId: s.id,         // ← add this
  stepNum: i + 1,
  stepTitle: s.action,
  ...
})
```

**1e. CSS — add `.ed-cmt-step-link` style in `prototype-runs.css`:**

```css
.runs-v12 .ed-cmt-step-link {
  cursor: pointer;
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.runs-v12 .ed-cmt-step-link:hover { opacity: 0.8; }
```

---

## Fix 2 — Defects and Requirements tabs: correct behaviour per context

**Verified against Testiny.** The key difference between the two screens:

| Tab | Test Cases screen | Test Runs execution panel |
|-----|-------------------|--------------------------|
| Defects | Read-only. Shows defects linked in runs. Empty state: "No defects have yet been linked to this test case in a test run." No action buttons. | **Interactive.** Empty state: "Create defect — Test runs can be linked to defects from configured integrations." + "Create defect" and "Link defect" buttons (disabled stubs in prototype). |
| Requirements | **Interactive.** Shows "Create requirement — Link requirements from configured integrations with test cases." + "Create requirement" and "Link requirement" buttons (disabled stubs). | Read-only. Empty state: "No requirements — No requirements have been linked." No action buttons. |

### 2a — Defects tab in `ExecDetailPane` (`RunsScreen.tsx`)

The current Defects tab shows defect tags from `execution.defects` plus a "Link defect" button.
Update it to match Testiny's run context:

- When `execution.defects` is empty (or undefined), show the empty state header and messaging:
  ```
  Create defect
  Test runs can be linked to defects from configured integrations.
  [Create defect (disabled)] [Link defect (disabled)]
  ```
  Keep the existing "Link defect" behaviour (`onLinkDefect`) on the "Link defect" button.
  "Create defect" button is a disabled stub for now.

- When `execution.defects` has items, list them as before (existing `.ed-dtag` tags), then show the two action buttons below the list.

- Remove the keyboard shortcut `D` call from the "Link defect" button label (keep the `D` shortcut functional globally but don't annotate it in the panel since we have the shortcut bar).

### 2b — Requirements tab in `ExecDetailPane` (`RunsScreen.tsx`)

The current Requirements tab shows `caseData.references` as plain text.
Update it to read-only mode matching Testiny:

- If `caseData.references` is non-empty, show:
  ```
  [ed-sl label] Linked requirements
  [ed-pt content] {caseData.references}
  ```
- If `caseData.references` is empty or undefined, show the empty state:
  ```
  No requirements
  No requirements have been linked.
  ```

No action buttons — this is purely read-only in execution context.

### 2c — Defects tab in `CasesScreen.tsx` (Test Cases screen)

The existing Defects tab in CasesScreen currently shows defects linked via runs. Its empty state
should read: "No defects. No defects have yet been linked to this test case in a test run." Verify
that this message is already correct. If it reads anything different, update it.
No action buttons — read-only in test case context.

### 2d — Requirements tab in `CasesScreen.tsx` (Test Cases screen)

Update to match Testiny's interactive test-case context:

Show:
```
Create requirement
Link requirements from configured integrations with test cases.
[Create requirement (disabled)] [Link requirement (disabled)]
```

Both buttons are disabled stubs in the prototype. Style them like the existing `.btn` style.

---

## Fix 3 — Verify and fix "Create test run" greyed out on Test Runs screen

**Background:** Task 07b was supposed to grey out the "Create run" button when `activeCases.length === 0`.
Verify the following locations are all correctly guarded — fix any that are not:

### 3a — Run picker dropdown (`RunsScreen.tsx`)

Find the run picker dropdown footer button:
```tsx
<button type="button" className="run-sel-create" onClick={...}>
  <i className="ti ti-plus" /> Create new run…
</button>
```
This button was NOT addressed in 07b. Add `disabled={!hasCases}` to it.

### 3b — `TestRunsTopbar.tsx` "More…" dropdown

Verify that the "Create new run…" button already has `disabled={!hasCases}`.
If it doesn't, add it now (07b may not have been fully applied).

### 3c — Empty-state and no-run-state "Create test run" buttons

In the two early-return states (when `activeRuns.length === 0` and when `!currentRun`),
verify the "Create test run" button has `disabled={!hasCases}`. Fix if missing.

`hasCases` is derived from `activeCases.length > 0` — verify `activeCases` is destructured
from `useFresh()` at the top of `RunsScreen`. Add it if missing.

---

## Fix 4 — Add Team/Defects/Details tabbed panel next to pie chart

**Verified against Testiny.** The SUMMARY section contains:
- **Left:** The donut/pie chart with completion percentage and status counts
- **Right:** A tabbed panel with three tabs: **Team**, **Defects**, **Details**

The existing team summary (shown below the chart in our current layout) moves into the Team tab.

### 4a — Layout change in `RunsScreen.tsx`

The `ec-run-summary` and `ec-team-summary` sections currently stack vertically.
Replace them with a horizontal layout:

```tsx
{summaryOpen && (
  <div className="ec-summary-body">
    <div className="ec-run-summary">
      <RunStatusInfographic ... />
    </div>
    <div className="ec-summary-tabs-panel">
      <div className="ec-summary-tab-bar">
        {(['team', 'defects', 'details'] as const).map((t) => (
          <div
            key={t}
            className={`ec-summary-tab${summaryTab === t ? ' on' : ''}`}
            onClick={() => setSummaryTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>
      {summaryTab === 'team' && (
        <div className="ec-summary-tab-content">
          {teamSummary.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--text3)', padding: '6px 0' }}>0 users</div>
          ) : (
            teamSummary.map((m) => (
              <div key={m.name} className="ec-team-row">
                <div className="ec-team-av">{m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</div>
                <div className="ec-team-name">{m.name}</div>
                <div className="ec-team-stats">
                  {m.passed > 0 && <span style={{ color: 'var(--pass)' }}>{m.passed}P</span>}
                  {m.failed > 0 && <span style={{ color: 'var(--fail)' }}>{m.failed}F</span>}
                  {m.blocked > 0 && <span style={{ color: 'var(--block)' }}>{m.blocked}B</span>}
                  {m.notRun > 0 && <span style={{ color: 'var(--text3)' }}>{m.notRun}N</span>}
                </div>
                <div className="ec-team-total">{m.total}</div>
              </div>
            ))
          )}
        </div>
      )}
      {summaryTab === 'defects' && (
        <div className="ec-summary-tab-content">
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>Create defect</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Test runs can be linked to defects from configured integrations.</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn" style={{ fontSize: 11, padding: '2px 8px' }} disabled>
              <i className="ti ti-bug" style={{ fontSize: 11 }} /> Create defect
            </button>
            <button type="button" className="btn" style={{ fontSize: 11, padding: '2px 8px' }} disabled>
              <i className="ti ti-link" style={{ fontSize: 11 }} /> Link defect
            </button>
          </div>
        </div>
      )}
      {summaryTab === 'details' && (
        <div className="ec-summary-tab-content">
          {currentRun?.description ? (
            <div style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: 'var(--text3)', minWidth: 72 }}>Description:</span>
              <span style={{ color: 'var(--text2)' }}>{currentRun.description}</span>
            </div>
          ) : null}
          {currentRun?.due ? (
            <div style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: 'var(--text3)', minWidth: 72 }}>Due:</span>
              <span style={{ color: 'var(--text2)' }}>{currentRun.due}</span>
            </div>
          ) : null}
          {currentRun?.planName ? (
            <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
              <span style={{ color: 'var(--text3)', minWidth: 72 }}>Plan:</span>
              <span style={{ color: 'var(--text2)' }}>{currentRun.planName}</span>
            </div>
          ) : null}
          {!currentRun?.description && !currentRun?.due && !currentRun?.planName ? (
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>No additional details.</div>
          ) : null}
        </div>
      )}
    </div>
  </div>
)}
```

Remove the old standalone `ec-team-summary` block that currently sits below `ec-run-summary`.

Add a new state variable:
```tsx
const [summaryTab, setSummaryTab] = useState<'team' | 'defects' | 'details'>('team')
```

Also remove the existing `{currentRun.due}` and `{currentRun.planName}` spans from `ec-rmt` since they now live in the Details tab (avoid duplication).

### 4b — CSS in `prototype-runs.css`

```css
/* Summary section body: pie chart + tabbed panel side by side */
.runs-v12 .ec-summary-body {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 6px 0 4px;
}

/* Tabbed panel to the right of the donut */
.runs-v12 .ec-summary-tabs-panel {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 5px;
  overflow: hidden;
}

.runs-v12 .ec-summary-tab-bar {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--surface2);
}

.runs-v12 .ec-summary-tab {
  padding: 4px 10px;
  font-size: 11px;
  color: var(--text3);
  cursor: pointer;
  border-right: 1px solid var(--border);
  user-select: none;
}
.runs-v12 .ec-summary-tab:hover { color: var(--text); background: var(--surface); }
.runs-v12 .ec-summary-tab.on { color: var(--text); background: var(--surface); font-weight: 600; border-bottom: 2px solid var(--accent); }

.runs-v12 .ec-summary-tab-content {
  padding: 8px 10px;
  font-size: 11px;
  max-height: 120px;
  overflow-y: auto;
}
```

Also remove the old `.runs-v12 .ec-team-summary` rule or leave it (it will simply be unused).

### 4c — Resize minimum width

In `RunsScreen.tsx`, the resizer:
```tsx
<div className="resizer-v" data-resize="run-list" data-min="220" data-max-half="true" />
```

Change `data-min="220"` to `data-min="475"`.

Also update the default CSS width variable for `ec-pane` in `prototype-runs.css`:
```css
.runs-v12 .ec-pane {
  width: var(--run-list-width, 500px);   /* was 300px */
  ...
}
```

---

## Fix 5 — Delete safeguard: warn about affected runs

**Verified against Testiny.** When deleting a test case, Testiny shows:

> "Confirm test case deletion. Do you want to delete test case TC-XXXXX?
> The test case will also be removed from N open test runs (TR-XXXXX, TR-YYYYY)."

**Behaviour confirmed:** deletion removes the case from open (unsealed) runs. Sealed (closed) runs
are treated as immutable historical records and are left untouched.

### 5a — Update `DELETE_CASE` reducer in `FreshProvider.tsx`

Currently:
```tsx
case 'DELETE_CASE':
  next = { ...state, cases: state.cases.filter((c) => c.id !== action.caseId) }
  break
```

Replace with:
```tsx
case 'DELETE_CASE':
  next = {
    ...state,
    cases: state.cases.filter((c) => c.id !== action.caseId),
    runs: state.runs.map((r) => {
      if (r.sealed) return r // sealed runs are immutable historical records
      return {
        ...r,
        caseOrder: r.caseOrder.filter((id) => id !== action.caseId),
        executions: Object.fromEntries(
          Object.entries(r.executions).filter(([id]) => id !== action.caseId)
        ),
      }
    }),
  }
  break
```

No new action type needed. No schema version bump — this is a reducer logic fix.

### 5b — Replace `window.confirm` in `CasesScreen.tsx`

**Current code** (in the row context menu's Delete handler):
```tsx
if (window.confirm('Delete this test case?')) {
  if (detailCaseId === menuCase.id) setDetailCaseId(null)
  deleteCase(menuCase.id)
}
setContextMenu(null)
```

**Replace with:**

Add state at the top of `CasesScreen`:
```tsx
const [deleteCaseConfirm, setDeleteCaseConfirm] = useState<{ caseId: string; affectedRuns: { id: string; runKey: string; name: string }[] } | null>(null)
```

Change the Delete handler in the context menu to:
```tsx
const affectedRuns = activeRuns
  .filter((r) => !r.sealed && r.caseOrder.includes(menuCase.id))
  .map((r) => ({ id: r.id, runKey: r.runKey, name: r.name }))
setDeleteCaseConfirm({ caseId: menuCase.id, affectedRuns })
setContextMenu(null)
```

Add a confirmation modal at the bottom of the CasesScreen JSX (similar to the existing `createRunModal` inline modal):

```tsx
{deleteCaseConfirm ? (
  <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 24px', minWidth: 360, maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,.24)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <i className="ti ti-trash" style={{ fontSize: 20, color: 'var(--fail)' }} />
        <div style={{ fontSize: 14, fontWeight: 600 }}>Confirm test case deletion</div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text2)', marginBottom: 10 }}>
        Do you want to delete test case{' '}
        <strong style={{ fontFamily: 'var(--mono)' }}>
          {activeCases.find((c) => c.id === deleteCaseConfirm.caseId)?.caseKey ?? deleteCaseConfirm.caseId}
        </strong>?
      </div>
      {deleteCaseConfirm.affectedRuns.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 5, padding: '8px 10px', marginBottom: 14 }}>
          The test case will also be removed from{' '}
          <strong>{deleteCaseConfirm.affectedRuns.length}</strong> open test run
          {deleteCaseConfirm.affectedRuns.length > 1 ? 's' : ''} (
          {deleteCaseConfirm.affectedRuns.map((r) => (
            <span key={r.id} style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>TR-{r.runKey}</span>
          )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [])}
          ).
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={() => setDeleteCaseConfirm(null)}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-danger"
          style={{ background: 'var(--fail)', color: '#fff', border: 'none' }}
          onClick={() => {
            if (detailCaseId === deleteCaseConfirm.caseId) setDetailCaseId(null)
            deleteCase(deleteCaseConfirm.caseId)
            setDeleteCaseConfirm(null)
          }}
        >
          <i className="ti ti-trash" style={{ fontSize: 11 }} /> Delete
        </button>
      </div>
    </div>
  </div>
) : null}
```

**Note:** `activeRuns` is already destructured from `useFresh()` in `CasesScreen`. No additional imports needed.

---

## Build check

After all changes, run:
```
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required before considering this task complete.

---

## Commit

Once `pnpm build` passes with zero errors, stage and commit the changed files with this message:

```
Runs: Task 07c — UI polish (5 fixes)

`RunsScreen.tsx`
* Step comment labels in Comments tab are now clickable links — clicking
  switches to Details tab and scrolls to the relevant step card
* Defects tab: updated empty state messaging to match Testiny run context;
  added disabled Create defect / Link defect stubs
* Requirements tab: updated to read-only mode matching Testiny run context;
  empty state shows "No requirements have been linked"
* Summary section: replaced vertical team summary with horizontal
  Team/Defects/Details tabbed panel next to the donut chart; added
  summaryTab state; team rows moved into Team tab
* Run picker "Create new run…" button disabled when hasCases is false
* Resizer data-min updated from 220 to 475

`CasesScreen.tsx`
* Replaced window.confirm delete with modal showing affected open run count
  and run keys; deleteCase only called on explicit confirmation
* Requirements tab: updated to interactive mode with disabled
  Create/Link requirement stubs (matches Testiny test-case context)
* Defects tab: verified read-only empty state messaging

`FreshProvider.tsx`
* DELETE_CASE reducer now also removes the case from caseOrder and
  executions of all unsealed runs; sealed runs left untouched

`prototype-runs.css`
* Added .ec-summary-body flex layout for chart + tabbed panel
* Added .ec-summary-tabs-panel, .ec-summary-tab-bar, .ec-summary-tab,
  .ec-summary-tab-content styles
* .ec-pane default width updated from 300px to 500px
* Added .ed-cmt-step-link styles for clickable step comment labels

Co-authored-by: Claude <claude@anthropic.com>
```
