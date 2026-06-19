# Task 02 — Case detail: 4 missing tabs

## Context from previous task
Branch: `mvp-test-cases` (created from `mvp-main`).

Task 01 added per-project active custom fields to the data model (schema v6):
- `activeCustomFieldIds: string[]` added to `Project` in `demo-model.ts`
- `UPDATE_ACTIVE_CUSTOM_FIELDS` and `UPDATE_PROJECT_SETTINGS` actions added to `FreshProvider.tsx`
- Admin project panel (`AdminProjectPanel.tsx`) wired to these actions
- `DEMO_SCHEMA_VERSION` is currently **6**; v5→v6 migration is in `migrate-demo-state.ts`

## Objective
Add four missing tabs to the `CaseDetail` panel inside `CasesScreen.tsx`:
**Attachments**, **Defects**, **Requirements**, **Runs**.

These are UI shells only — no new store actions or schema changes are needed.

## Files that will change
- `apps/web/src/fresh/screens/CasesScreen.tsx`

## Files that will NOT change
- `demo-model.ts`, `FreshProvider.tsx`, `migrate-demo-state.ts`, any other file

---

## Step 1 — Read the file before touching it

```
Read apps/web/src/fresh/screens/CasesScreen.tsx
```

Confirm you understand the current structure before making any edits.

---

## Step 2 — Extend the tab type

In `CasesScreen.tsx`, change:

```ts
type DetailTab = 'details' | 'history' | 'activity'
```

to:

```ts
type DetailTab = 'details' | 'attachments' | 'defects' | 'requirements' | 'runs' | 'history' | 'activity'
```

---

## Step 3 — Update the tab bar render

In the `CaseDetail` component, the tab bar currently renders:

```tsx
{(['details', 'history', 'activity'] as const).map(...)}
```

Replace with all 7 tabs in this order:

```tsx
{(['details', 'attachments', 'defects', 'requirements', 'runs', 'history', 'activity'] as const).map((t) => (
  <div key={t} className={`nav-tab${tab === t ? ' on' : ''}`} onClick={() => onTab(t)}>
    {t.charAt(0).toUpperCase() + t.slice(1)}
  </div>
))}
```

---

## Step 4 — Add tab body content

After the existing `{tab === 'details' ? (...) : null}` block, add these four shells before the history block.

### Attachments
```tsx
{tab === 'attachments' ? (
  <div className="dp-empty-tab">
    <i className="ti ti-paperclip" style={{ fontSize: 28, color: 'var(--text3)', marginBottom: 8 }} />
    <div style={{ fontWeight: 600, fontSize: 13 }}>No attachments</div>
    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
      Drag and drop files here, or click to upload.
    </div>
    <button type="button" className="btn" style={{ marginTop: 10, fontSize: 12 }}>
      <i className="ti ti-upload" style={{ fontSize: 12 }} /> Add attachment
    </button>
  </div>
) : null}
```

### Defects
```tsx
{tab === 'defects' ? (
  <div className="dp-empty-tab">
    <i className="ti ti-bug" style={{ fontSize: 28, color: 'var(--text3)', marginBottom: 8 }} />
    <div style={{ fontWeight: 600, fontSize: 13 }}>No defects linked</div>
    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
      No defects have yet been linked to this test case in a test run.
    </div>
  </div>
) : null}
```

### Requirements
```tsx
{tab === 'requirements' ? (
  <div className="dp-empty-tab">
    <i className="ti ti-list-check" style={{ fontSize: 28, color: 'var(--text3)', marginBottom: 8 }} />
    <div style={{ fontWeight: 600, fontSize: 13 }}>No requirements linked</div>
    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
      Link this test case to a requirement to track coverage.
    </div>
    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
      <button type="button" className="btn btn-p" style={{ fontSize: 12 }}>
        <i className="ti ti-plus" style={{ fontSize: 12 }} /> Create requirement
      </button>
      <button type="button" className="btn" style={{ fontSize: 12 }}>
        <i className="ti ti-link" style={{ fontSize: 12 }} /> Link requirement
      </button>
    </div>
  </div>
) : null}
```

### Runs
```tsx
{tab === 'runs' ? (
  <div style={{ padding: '10px 12px' }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
      Recent results
    </div>
    <table className="tbl" style={{ fontSize: 11.5 }}>
      <thead>
        <tr>
          <th>Run</th>
          <th style={{ width: 80 }}>By</th>
          <th style={{ width: 90 }}>At</th>
          <th style={{ width: 72, textAlign: 'center' }}>Result</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ color: 'var(--accent)' }}>Sprint 44 Regression</td>
          <td style={{ color: 'var(--text2)' }}>Nadim Sharif</td>
          <td style={{ color: 'var(--text3)' }}>2d ago</td>
          <td style={{ textAlign: 'center' }}><span className="pill pill-pass">Passed</span></td>
        </tr>
        <tr>
          <td style={{ color: 'var(--accent)' }}>Sprint 43 Smoke</td>
          <td style={{ color: 'var(--text2)' }}>Jamil Khan</td>
          <td style={{ color: 'var(--text3)' }}>15d ago</td>
          <td style={{ textAlign: 'center' }}><span className="pill pill-fail">Failed</span></td>
        </tr>
      </tbody>
    </table>
  </div>
) : null}
```

---

## Step 5 — Add the empty tab CSS class

Open `apps/web/src/app/globals.css` (or wherever `.dp-*` styles live — search for `.dp-hd` to find the right file).

Add this utility class near the other `.dp-*` rules:

```css
.dp-empty-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  flex: 1;
}
```

---

## Step 6 — Build verification

```bash
cd /path/to/repo && pnpm build
```

Zero TypeScript errors and zero build errors required before committing.

---

## Step 7 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. Open `/DP/testcases/`
3. Click any case row to open the detail panel
4. Verify all 7 tabs render in order: Details · Attachments · Defects · Requirements · Runs · History · Activity
5. Click each new tab and confirm the empty state / seed content is shown
6. Confirm the Details tab still works (editing, saving, steps)

---

## Step 8 — Commit

```
Test cases: add Attachments, Defects, Requirements, Runs tabs to case detail panel

- Extend DetailTab union type to include 'attachments' | 'defects' | 'requirements' | 'runs'
- Add tab bar entries for all 7 tabs in CaseDetail (Details · Attachments · Defects · Requirements · Runs · History · Activity)
- Attachments tab: empty state with drag-drop copy and upload button
- Defects tab: empty state explaining no defects linked yet
- Requirements tab: empty state with Create requirement and Link requirement buttons
- Runs tab: seed table with two recent run rows (Run · By · At · Result columns)
- Add .dp-empty-tab utility class for centred empty-state layout
```
