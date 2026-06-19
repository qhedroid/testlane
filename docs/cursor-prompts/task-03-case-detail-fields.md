# Task 03 — Case detail: Details tab fields + dynamic custom fields

## Context from previous task
Branch: `mvp-test-cases`.

Tasks 01–02 are complete:
- Schema is at v6. `DEMO_SCHEMA_VERSION = 6` in `demo-model.ts`.
- `Project` has `activeCustomFieldIds: string[]` (IDs referencing `state.adminSettings.customFields`).
- `Case` currently has: `id`, `projectId`, `title`, `folderId`, `priority`, `type`, `preconditions`, `steps`, `generalComments`, `tags`, `updatedAt`, `assignee`.
- CaseDetail panel has 7 tabs (added in Task 02).
- `nextCaseNumByProject: Record<string, number>` already exists in `DemoState`.

## Objective
1. Add three new fields to the `Case` type: `template`, `references`, `summary`.
2. Add `customFieldValues` to `Case` for storing per-case custom field data.
3. Bump schema to **v7** and write the v6→v7 migration.
4. Update the Details tab in `CaseDetail` to show these new fields.
5. Dynamically render the active custom fields for the current project below the built-in fields.
6. Fix the History tab to show entries in a consistent format (currently hardcoded strings; keep the seed data but use a `.hist-item` layout that matches existing styles).

## Files that will change
- `apps/web/src/fresh/data/demo-model.ts`
- `apps/web/src/fresh/data/migrate-demo-state.ts`
- `apps/web/src/fresh/screens/CasesScreen.tsx`

## Files that will NOT change
- `FreshProvider.tsx` (no new actions needed — `replaceCase` already handles the updated Case shape)
- `demo-seed.ts` (no seed changes needed)
- Any other file

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/data/demo-model.ts
Read apps/web/src/fresh/data/migrate-demo-state.ts
Read apps/web/src/fresh/screens/CasesScreen.tsx
```

---

## Step 2 — Update `Case` in `demo-model.ts`

Add the following fields to the `Case` interface (after `assignee`):

```ts
/** Step template format. Defaults to 'text'. */
template?: 'text' | 'bdd'
/** Free-text references (issue links, doc links, etc.). */
references?: string
/** One-line summary / description. */
summary?: string
/** Values for active custom fields. Key = AdminCustomField.id */
customFieldValues?: Record<string, string | boolean | string[]>
```

Bump `DEMO_SCHEMA_VERSION` from `6` to `7`.

---

## Step 3 — Fix the v5→v6 migration, then add v6→v7

### 3a — Fix `migrateProjectCustomFields` to stamp the correct version

In `migrate-demo-state.ts`, find the `migrateProjectCustomFields` function. Its return currently reads:

```ts
return { ...state, projectsById, schemaVersion: DEMO_SCHEMA_VERSION }
```

Change it to stamp `6` explicitly:

```ts
return { ...state, projectsById, schemaVersion: 6 }
```

**Why:** this function runs when `schemaVersion < 6`. If it stamps `DEMO_SCHEMA_VERSION` (now 7 after this task), the new `< 7` migration block below will be skipped for users coming from v5, and their cases will never get the new fields backfilled. Stamping `6` makes the chain run sequentially.

### 3b — Add v6→v7 migration

After the existing v5→v6 block (`if (state.schemaVersion < 6) { ... }`), add:

```ts
// v6 → v7: add template, references, summary, customFieldValues to existing cases
if (s.schemaVersion < 7) {
  s.cases = s.cases.map((c: Case) => ({
    ...c,
    template: c.template ?? 'text',
    references: c.references ?? '',
    summary: c.summary ?? '',
    customFieldValues: c.customFieldValues ?? {},
  }))
  s.schemaVersion = 7
}
```

Make sure to import `Case` if it is not already imported in this file.

---

## Step 4 — Update the Details tab in `CasesScreen.tsx`

### 4a — Pass project data into `CaseDetail`

`CaseDetail` needs to know the active project's `activeCustomFieldIds` and the global `adminSettings.customFields` list.

In `CasesScreen`, destructure two more values from `useFresh()`:

```ts
const { ..., activeProject, adminSettings } = useFresh()
```

(Check what is already destructured — `activeProject` is likely already there. Add `adminSettings` if missing.)

Pass them to `CaseDetail`:

```tsx
<CaseDetail
  ...existing props...
  activeCustomFieldIds={activeProject.activeCustomFieldIds}
  allCustomFields={adminSettings.customFields}
/>
```

### 4b — Update the `CaseDetail` prop signature

Add to the `CaseDetail` props interface:

```ts
activeCustomFieldIds: string[]
allCustomFields: import('../data/demo-model').AdminCustomField[]
```

### 4c — Add Summary and References rows to the Metadata section (view mode)

Inside the `dp-mg` grid (view mode), add two new rows after the existing ones:

```tsx
{c.summary ? (
  <div style={{ gridColumn: 'span 2' }}>
    <div className="dp-ml">Summary</div>
    <div className="dp-mv" style={{ whiteSpace: 'pre-wrap' }}>{c.summary}</div>
  </div>
) : null}
{c.references ? (
  <div style={{ gridColumn: 'span 2' }}>
    <div className="dp-ml">References</div>
    <div className="dp-mv" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{c.references}</div>
  </div>
) : null}
<div>
  <div className="dp-ml">Template</div>
  <div className="dp-mv">{c.template === 'bdd' ? 'BDD (Given/When/Then)' : 'Text (Action/Expected)'}</div>
</div>
```

### 4d — Add Summary, References, and Template fields to edit mode

Inside the `dp-edit-grid` (edit mode), add after the existing Assigned to field:

```tsx
<div className="form-field" style={{ gridColumn: 'span 2' }}>
  <label>Summary</label>
  <input
    type="text"
    value={draft.summary ?? ''}
    onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
    placeholder="One-line summary…"
  />
</div>
<div className="form-field" style={{ gridColumn: 'span 2' }}>
  <label>References</label>
  <input
    type="text"
    value={draft.references ?? ''}
    onChange={(e) => setDraft((d) => ({ ...d, references: e.target.value }))}
    placeholder="e.g. JIRA-123, https://…"
  />
</div>
<div className="form-field">
  <label>Template</label>
  <select
    value={draft.template ?? 'text'}
    onChange={(e) => setDraft((d) => ({ ...d, template: e.target.value as 'text' | 'bdd' }))}
  >
    <option value="text">Text (Action / Expected)</option>
    <option value="bdd">BDD (Given / When / Then)</option>
  </select>
</div>
```

### 4e — Render active custom fields (view + edit mode)

After the Tags section and before the closing fragment of the `tab === 'details'` block, add a new section that dynamically renders custom fields:

```tsx
{(() => {
  const activeFields = allCustomFields.filter((f) => activeCustomFieldIds.includes(f.id) && f.enabled)
  if (activeFields.length === 0) return null
  return (
    <div className="dp-sec" style={{ borderBottom: 'none' }}>
      <div className="dp-sl">Custom fields</div>
      {editing ? (
        <div className="dp-edit-grid">
          {activeFields.map((field) => (
            <div key={field.id} className="form-field" style={{ gridColumn: field.type === 'Multi-Line Text' ? 'span 2' : undefined }}>
              <label>{field.name}{field.required ? ' *' : ''}</label>
              {field.type === 'Boolean' ? (
                <select
                  value={String(draft.customFieldValues?.[field.id] ?? false)}
                  onChange={(e) => setDraft((d) => ({
                    ...d,
                    customFieldValues: { ...d.customFieldValues, [field.id]: e.target.value === 'true' },
                  }))}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              ) : field.type === 'Multi-Line Text' ? (
                <textarea
                  rows={3}
                  className="dp-edit-area"
                  value={String(draft.customFieldValues?.[field.id] ?? '')}
                  onChange={(e) => setDraft((d) => ({
                    ...d,
                    customFieldValues: { ...d.customFieldValues, [field.id]: e.target.value },
                  }))}
                />
              ) : (
                <input
                  type={field.type === 'Number (integer)' ? 'number' : 'text'}
                  value={String(draft.customFieldValues?.[field.id] ?? '')}
                  onChange={(e) => setDraft((d) => ({
                    ...d,
                    customFieldValues: { ...d.customFieldValues, [field.id]: e.target.value },
                  }))}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="dp-mg">
          {activeFields.map((field) => {
            const val = c.customFieldValues?.[field.id]
            const display = val === undefined || val === '' || val === null
              ? <span style={{ color: 'var(--text3)' }}>—</span>
              : field.type === 'Boolean'
              ? (val ? 'Yes' : 'No')
              : String(val)
            return (
              <div key={field.id} style={field.type === 'Multi-Line Text' ? { gridColumn: 'span 2' } : undefined}>
                <div className="dp-ml">{field.name}</div>
                <div className="dp-mv">{display}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})()}
```

---

## Step 5 — Update DOMAIN_MODEL.md

Open `docs/_authoritative/DOMAIN_MODEL.md` and add the new `Case` fields and schema v7 info where the `Case` interface is documented. Add a bullet noting the v6→v7 migration.

---

## Step 6 — Build verification

```bash
cd /path/to/repo && pnpm build
```

Zero TypeScript errors required. `adminSettings` must be a valid property on the FreshProvider return — check `useFresh()` return type if the build fails.

---

## Step 7 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. Clear localStorage for `relay-demo-v2` (DevTools → Application → Local Storage) to force the v7 migration.
3. Open `/DP/testcases/`, click a case, go to Details tab.
4. Click **Edit case** — confirm Summary, References, and Template fields are present.
5. In the DP project (which has activeCustomFieldIds `['admin-cf-priority', 'admin-cf-references', 'admin-cf-automated']`), confirm the three custom fields appear under "Custom fields" in view mode and are editable.
6. Save changes and confirm the values persist.
7. Switch to a project with no active custom fields — confirm the "Custom fields" section is hidden.

---

## Step 8 — Commit

```
Test cases: add Summary/References/Template fields and dynamic custom fields to case detail

- Add template, references, summary, customFieldValues fields to Case interface in demo-model.ts
- Bump DEMO_SCHEMA_VERSION to 7; fix migrateProjectCustomFields to stamp schemaVersion 6 (not DEMO_SCHEMA_VERSION) so the migration chain runs sequentially; add v6→v7 migration (backfills new fields with defaults on existing cases)
- Case detail Details tab (view mode): show Summary, References, Template rows in metadata grid
- Case detail Details tab (edit mode): add Summary text input, References text input, Template dropdown
- Case detail Details tab: render active custom fields section dynamically from project.activeCustomFieldIds + adminSettings.customFields; supports Text, Multi-Line Text, Number, Boolean field types in both view and edit mode
- Pass activeCustomFieldIds and allCustomFields props into CaseDetail from CasesScreen
- Update DOMAIN_MODEL.md for schema v7
```
