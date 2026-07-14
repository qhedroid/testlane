# Task 01 — Custom field type parity + fix broken rendering + required enforcement

Branch: `mvp-custom-fields` (new branch off latest `mvp-main`)
Schema: v14 → **v15** (see migration section below)

This is task 1 of 3 on this branch. This task does **not** touch per-project field assignment (that's task-03) or the Owner field (that's task-02). Scope here is: making every declared custom field type actually render correctly, adding the missing types to reach parity with the reference tool (Testiny) we benchmarked against, and enforcing `required`.

Files touched:
- `apps/web/src/fresh/data/demo-model.ts`
- `apps/web/src/fresh/data/admin-initial-settings.ts`
- `apps/web/src/fresh/data/migrate-demo-state.ts`
- `apps/web/src/fresh/components/admin/pages/AdminCustomFieldsPageContent.tsx`
- `apps/web/src/fresh/screens/CasesScreen.tsx`

Do not touch `FreshProvider.tsx`'s reducer shape beyond adding the two new `AdminCustomField` fields described below. Do not touch `RunsScreen.tsx`, `PlansScreen.tsx`, `AdminProjectPanel.tsx`, or backend/DB/Docker/auth/API routes (frontend-only prototype).

---

## Background

Testiny (the tool this feature is being benchmarked against) supports these custom field types: Text, Number (integer), Number (float), URL, Boolean, Multi-Line Text, Date, Date & Time, Duration, Multi-Select. It also has an "As Dropdown" toggle available on Text fields that turns them into a single-select populated from a defined value list.

Relay's current `AdminCustomField['type']` union (in `demo-model.ts`, line ~298) only has: `'Text' | 'Multi-Line Text' | 'Number (integer)' | 'Boolean' | 'Multi-Select' | 'Date & Time'`. Worse, in `CasesScreen.tsx`'s case-detail render (both the edit form around line 1653-1688 and the read-only view around line 1713-1726), the type switch only has real branches for `'Boolean'` and `'Multi-Line Text'` — **everything else, including `'Multi-Select'` and `'Date & Time'`, silently falls through to a plain text `<input>`.** `Multi-Select` fields have no defined value list anywhere in the data model at all, so there's currently no way for one to render as anything but a raw text box.

---

## Part A — `demo-model.ts`: expand the type union and add value-list support

In the `AdminCustomField` interface (~line 295-303):

```ts
export interface AdminCustomField {
  id: string
  name: string
  type: 'Text' | 'Multi-Line Text' | 'Number (integer)' | 'Boolean' | 'Multi-Select' | 'Date & Time'
  required: boolean
  enabled: boolean
  inNewProjects: boolean
  projects: string
}
```

Change to:

```ts
export interface AdminCustomField {
  id: string
  name: string
  type:
    | 'Text'
    | 'Multi-Line Text'
    | 'Number (integer)'
    | 'Number (float)'
    | 'URL'
    | 'Boolean'
    | 'Multi-Select'
    | 'Date'
    | 'Date & Time'
    | 'Duration'
  required: boolean
  enabled: boolean
  inNewProjects: boolean
  projects: string
  /** Option list for `type: 'Multi-Select'`, or for `type: 'Text'` when `asDropdown` is true. Ignored for all other types. */
  values?: string[]
  /** Only meaningful when `type === 'Text'`. Renders as a single-select populated from `values` instead of a free-text input. */
  asDropdown?: boolean
}
```

Leave `projects: string` in place for now — task-03 replaces it with a real per-project relational model. Don't touch it here.

`Case.customFieldValues` (~line 85) stays `Record<string, string | boolean | string[]>` — no change needed. Multi-Select and dropdown-Text values are stored as `string[]` / `string` respectively (already covered by the existing union); Number (float), Date, Date & Time, Duration, and URL are all stored as plain strings from their native input elements (`e.target.value` is always a string), consistent with how Number (integer) is already handled.

---

## Part B — `admin-initial-settings.ts`: backfill seed Multi-Select fields with real values

`seedCustomFields()` (~line 128-140) currently defines three `'Multi-Select'` fields (`TI Version`, `CTMS Tags`, `Component`) with no values at all — they'd render as empty checkbox groups once Part C lands. Give each a plausible demo value list:

```ts
{ name: 'TI Version', type: 'Multi-Select', required: false, enabled: true, inNewProjects: false, projects: 'DP', values: ['v1.0', 'v1.1', 'v2.0', 'v2.1', 'v2.2'] },
...
{ name: 'CTMS Tags', type: 'Multi-Select', required: false, enabled: true, inNewProjects: false, projects: 'CTMS', values: ['Regression', 'Smoke', 'Usability', 'Performance'] },
...
{ name: 'Component', type: 'Multi-Select', required: false, enabled: true, inNewProjects: false, projects: 'All', values: ['UI', 'API', 'Auth', 'Reporting', 'Data'] },
```

(Keep exact wording/order of the other fields in the array unchanged — only add the `values` key to these three rows.)

---

## Part C — `migrate-demo-state.ts`: schema bump + backfill

Bump `DEMO_SCHEMA_VERSION` in `demo-model.ts` from `14` to `15`.

Add a `v14 → v15` migration step: for every entry in `adminSettings.customFields` where `type === 'Multi-Select'` and `values` is missing/undefined, set `values: []` (safe empty default — don't invent option text for user-created fields, only the three seed fields above get real values, and those come from the seed file directly for fresh installs; this migration step only matters for already-persisted localStorage state from before this change). No other fields need backfilling — `asDropdown` being `undefined` is falsy and behaves correctly as "not a dropdown" with no migration needed.

Follow the existing migration function pattern in this file (look at the v13→v14 step for the shape to match — same file, same style, additive/defensive).

---

## Part D — `AdminCustomFieldsPageContent.tsx`: expand the create form

1. Expand `FIELD_TYPES` (~line 10-12) to include the new types, in the same order as the Background section's list:

```ts
const FIELD_TYPES: AdminCustomField['type'][] = [
  'Text', 'Multi-Line Text', 'Number (integer)', 'Number (float)', 'URL', 'Boolean',
  'Multi-Select', 'Date', 'Date & Time', 'Duration',
]
```

2. Add local state: `asDropdown` (boolean, default `false`) and `values` (string array, default `[]`), plus a small "new value" text input + add button for building the list (mirroring the roadmap's "Add value" pattern).

3. In the modal body, after the Type `<select>`:
   - When `type === 'Text'`: show an "As Dropdown" checkbox bound to `asDropdown`.
   - When `type === 'Multi-Select'` OR (`type === 'Text'` AND `asDropdown`): show the value-list editor — a text input + "+ Add value" button that appends to `values` (trim, ignore empty/duplicate), and each existing value rendered as a small removable chip/row (X button removes it from the array).
   - Reset `asDropdown`/`values` whenever `type` changes away from a state that uses them (e.g. switching from Multi-Select to Boolean should clear `values` in the draft — but only in the *creation form* draft state, not on already-saved fields elsewhere).

4. Wire `values` and `asDropdown` into the `addAdminCustomField` payload in `handleAdd()`, and reset them (along with the other draft fields) after a successful add.

5. Add a "Type" column value display fix: no change needed to the table itself, `row.type` already renders correctly as a string for all new type names.

---

## Part E — `CasesScreen.tsx`: fix rendering for every type

**Edit-mode branch** (~line 1653-1688, the `activeFields.map(...)` block inside the editing conditional). Replace the three-way `Boolean / Multi-Line Text / else` switch with a full switch covering every type:

- `'Boolean'` — unchanged (existing Yes/No `<select>`).
- `'Multi-Line Text'` — unchanged (existing `<textarea>`).
- `'Multi-Select'` — a checkbox group, one checkbox per entry in `field.values ?? []`, checked state derived from whether that value is present in `(draft.customFieldValues?.[field.id] as string[] | undefined) ?? []`. Toggling adds/removes the value from that array (immutable update, same `setDraft` pattern as the other branches). If `field.values` is empty, render a small muted "No options configured for this field" message instead of an empty checkbox group.
- `field.type === 'Text' && field.asDropdown` — a `<select>` populated from `field.values ?? []`, plus an empty `<option value="">—</option>` at the top when the field isn't `required`. Same `customFieldValues` string-storage pattern as the existing plain-text branch.
- `'Date'` — `<input type="date" />`.
- `'Date & Time'` — `<input type="datetime-local" />`.
- `'Duration'` — plain text input for now (Testiny's duration picker is its own can of worms — a free-text field like `"2h 30m"` is an acceptable prototype stand-in; note this as a known limitation in the QA report, don't over-build it).
- `'URL'` — `<input type="url" placeholder="https://…" />`.
- `'Number (float)'` — `<input type="number" step="any" />`.
- `'Number (integer)'`, plain `'Text'` (no dropdown) — unchanged (existing default branch), just make sure the fallthrough `else` only catches these two now instead of everything.

**Read-only branch** (~line 1713-1726, the `activeFields.map(...)` block in the non-editing conditional). Extend the `display` computation:

- `'Boolean'` — unchanged (Yes/No).
- `'Multi-Select'` — join the stored `string[]` with `', '`; empty array or undefined shows the existing em-dash placeholder.
- `field.type === 'Text' && field.asDropdown` — unchanged from plain text display (just show the stored string).
- `'URL'` — if a value is present, render as a clickable `<a href={val} target="_blank" rel="noreferrer">{val}</a>` instead of plain text.
- Everything else — unchanged (`String(val)` fallback already works for Date/Date & Time/Duration/Number (float) since they're all stored as strings).

---

## Part F — required-field enforcement on save

`saveEdit()` (~line 1501-1504) currently does no validation at all:

```ts
function saveEdit() {
  onSave({ ...draft, updatedAt: new Date().toISOString() })
  setEditing(false)
}
```

Add validation against `activeFields` (already computed at ~line 1526 in this component) before saving:

1. Add state: `const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set())` near the other local state in this component.
2. In `saveEdit()`, before calling `onSave`, compute the set of active+enabled+required fields whose `draft.customFieldValues?.[field.id]` is empty (`undefined`, `null`, `''`, or an empty array for Multi-Select). If that set is non-empty: call `setFieldErrors(new Set(that set's field ids))` and `return` early (don't save, don't exit edit mode). If empty: clear `setFieldErrors(new Set())` and proceed with the existing save logic.
3. In both the edit-mode custom field render loop, add a small red inline message (same visual pattern as the admin panel's `nameError` — a `<div className="admin-form-error">` or equivalent existing error-text style already used elsewhere in this file) under any field whose id is in `fieldErrors`, e.g. "This field is required."
4. Clear a field's entry from `fieldErrors` as soon as the user changes its value (in each type branch's `onChange`, after updating `draft`, also do `setFieldErrors((prev) => { const next = new Set(prev); next.delete(field.id); return next })` — or simpler, just clear the whole set on any custom-field change and let the next save re-validate).

Don't add required-field validation anywhere else (list view, quick-create, etc.) in this task — scope is the case detail edit form only.

---

## Verification

1. `pnpm build`
2. `pnpm dev` (stop any stale dev server first if `.next` was rebuilt)
3. Browser smoke test on `/DP/testcases`:
   - Open a case, edit it, confirm the custom fields section renders every type correctly (add/activate one of each type via `/admin/custom-fields` and `/admin/projects` → My Demo Project → Custom fields tab if needed to get them active for this project).
   - Multi-Select: toggle a few checkboxes, save, reopen — confirm the read-only view shows them comma-joined and re-editing shows the same checkboxes checked.
   - Date / Date & Time / URL / Number (float): enter values, save, confirm read-only display (URL should be a clickable link).
   - Mark a custom field `required` via `/admin/custom-fields`, leave it empty on a case, try to save — confirm save is blocked and the inline error shows; fill it in and confirm save then succeeds.
   - Confirm existing seeded Multi-Select fields (TI Version, CTMS Tags, Component) now show their checkbox options instead of a blank text box.
4. Core regression routes (minimum): `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`
5. Record WebM evidence where tooling supports it; screenshots for any failures.
6. Write QA report to `/tmp/relay-qa-mvp-custom-fields/qa-report.md` (pass/fail summary, bugs, known limitations — explicitly note Duration is a free-text stand-in — and push readiness).
7. Do not push until smoke test evidence is reviewed or explicitly waived.

## Documentation

This task changes the custom-field data shape (schema v14 → v15) and fixes user-visible rendering behavior, so:
- Update `docs/product/feature-flow.md` and `docs/product/user-guide.md` wherever custom fields are described, to reflect the full type list and that Multi-Select/dropdown-Text now render properly.
- Update `docs/_authoritative/DOMAIN_MODEL.md`'s `AdminCustomField` row to reflect the new type union and the `values`/`asDropdown` fields.
- Update `docs/_authoritative/AS_BUILT_SNAPSHOT.md` if it documents the custom-fields feature status.
- Update `docs/claude/handoff.md` with a "Completed work" entry for this task (schema version, what changed) once done — bump the schema version noted there to v15.

## Out of scope / do not touch

- Per-project field assignment relational model (`projects` string stays as-is) — task-03.
- Owner field — task-02.
- `AdminProjectPanel.tsx`'s Custom Fields tab — unrelated to this task's rendering fixes, don't touch.
- `RunsScreen.tsx`, `PlansScreen.tsx` — no custom-field rendering there currently, out of scope.
- No backend/DB/Docker/auth/API route work.
- No new commits without explicit request.
