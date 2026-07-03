# Task 03 — Per-field project assignment (Add/Edit Custom Field → Projects tab)

Branch: `mvp-custom-fields` (continues from task-01/task-02 on this branch)
Schema: v15 (or v16 if task-02 bumped it) → **bump by one more version** for the `projects: string` → `projectIds` change below.

This is task 3 of 3 on this branch. Depends on task-01 (field type/value-list groundwork) being applied first.

Files touched:
- `apps/web/src/fresh/data/demo-model.ts`
- `apps/web/src/fresh/data/admin-initial-settings.ts`
- `apps/web/src/fresh/data/migrate-demo-state.ts`
- `apps/web/src/fresh/data/FreshProvider.tsx` (add `updateAdminCustomField` action — see Part C)
- `apps/web/src/fresh/components/admin/pages/AdminCustomFieldsPageContent.tsx`
- `apps/web/src/fresh/components/admin/AdminProjectPanel.tsx`

Do not touch `CasesScreen.tsx` in this task — field rendering is already correct from task-01, this task is purely about which projects a field is assigned to at the admin level.

---

## Background

In Testiny, a custom field is created once in a single org-wide catalog, then explicitly assigned to whichever projects should use it via a checkbox list of every project, plus a top-level "Add custom field automatically in all future projects" toggle.

Relay's `AdminCustomField.projects` is currently just a **free-text display string** (e.g. `'CTMS, IAM'`, `'All'`) set once on creation and never actually used to filter anything — `AdminCustomFieldsPageContent.tsx`'s `handleAdd()` hardcodes `projects: 'All'` on every new field regardless of what's typed, and `AdminProjectPanel.tsx`'s "Custom fields" tab (~line 349-375) lists **every** field in `adminSettings.customFields` unconditionally as togglable for **every** project — there's no actual per-field project restriction happening anywhere. `inNewProjects` (the "auto-add to new projects" flag) already exists and works correctly for its stated purpose — don't change that.

Because Relay's demo data only ever seeds one real project (`DP` / "My Demo Project") via `projectsById`, the existing free-text values like `'CTMS, IAM'` don't correspond to real `Project` records — they're purely illustrative copy. Don't try to reverse-map them; see the migration note in Part B.

---

## Part A — `demo-model.ts`: replace `projects` with a real relational field

In `AdminCustomField` (already modified by task-01 — this task adds to the same interface):

```ts
export interface AdminCustomField {
  id: string
  name: string
  type: /* ...unchanged from task-01... */
  required: boolean
  enabled: boolean
  inNewProjects: boolean
  /** Which projects this field is assigned to. `'all'` means every current and future project. */
  projectIds: string[] | 'all'
  values?: string[]
  asDropdown?: boolean
}
```

Remove the old `projects: string` field entirely — search the codebase for any remaining reads of `.projects` on an `AdminCustomField` (there should only be the admin table display and the seed file) and update them (Part D/B below).

---

## Part B — `admin-initial-settings.ts` + migration: convert seed data

In `seedCustomFields()`, replace every row's `projects: '...'` with `projectIds: 'all'` — since none of the free-text project names correspond to real seeded `Project` records, `'all'` is the closest faithful equivalent to "this field is currently visible wherever it's active" (which, given only `DP` exists by default, is functionally identical to what already happens today).

In `migrate-demo-state.ts`, add a v(N)→v(N+1) migration step (following the existing pattern in this file — this continues on from whatever version task-01/02 left `DEMO_SCHEMA_VERSION` at): for every entry in `adminSettings.customFields`, drop the old `projects` string key and add `projectIds: 'all'`. This preserves current behavior exactly for anyone with existing localStorage state — no field silently disappears from any project it was previously visible in.

---

## Part C — `FreshProvider.tsx`: add an update action

There's currently `addAdminCustomField` and `deleteAdminCustomField` but no way to edit a field after creation (~line 700-701, 1125-1134, and the context value exports around 1230/1304). Add:

- Action type: `{ type: 'admin/updateCustomField'; payload: DemoState['adminSettings']['customFields'][number] }` (full replace by id, same pattern as `updateAdminRole`).
- Reducer case in `admin-reducer.ts`: replace the matching entry in `adminSettings.customFields` by `id`.
- Context method: `updateAdminCustomField: (field: AdminCustomField) => void`, dispatching the above — mirror `updateAdminRole`'s exact shape/wiring (same file, same style) and add it to both places in the context value object where other admin methods are listed (~1230 and ~1304 in the current file — line numbers will have shifted after task-01/02, search for `deleteAdminCustomField,` and add `updateAdminCustomField,` right after it in both spots).

---

## Part D — `AdminCustomFieldsPageContent.tsx`: Details/Projects tabs + edit support

Restructure the single "Add custom field" modal into a two-tab modal (Details / Projects), matching the pattern already used elsewhere in this codebase for tabbed panels (e.g. `AdminProjectPanel.tsx`'s tab bar), and make it reusable for both create and edit:

1. Add a `mode: 'create' | 'edit'` concept — either a single modal component driven by an `editing: AdminCustomField | null` state (null = create), or keep the existing add flow and add a parallel edit flow — use whichever is the smaller diff given how `AdminRolesPageContent.tsx` already handles create-vs-edit for roles (that file has this exact pattern already — mirror it).
2. **Details tab**: everything currently in the modal (name, type, required, enabled, inNewProjects, the task-01 values/asDropdown editor) — unchanged, just now living under a "Details" tab.
3. **Projects tab**: 
   - A checklist of every project from `useFresh().projects` (each with a checkbox bound to whether `draftProjectIds` includes that project's id — `draftProjectIds` being local edit-state mirroring the eventual `projectIds` value).
   - An "all projects" mode: when `projectIds` is `'all'`, all checkboxes show checked and are effectively read-only/disabled with a note like "This field is assigned to all projects automatically." Provide a way to drop out of "all" mode (e.g. an "Assign to specific projects instead" link/checkbox) which switches to an explicit array seeded with all current project ids (so unchecking one doesn't silently orphan the field with zero projects).
   - Keep the existing `inNewProjects` toggle (from the Details tab or move it here if it fits better next to the projects list — your call, but don't duplicate it in both tabs).
4. Add an edit entry point in the fields table (~line 71-87) — e.g. a pencil icon next to the existing delete trash icon — that opens the same modal pre-filled with the selected field's current values, calling `updateAdminCustomField` on save instead of `addAdminCustomField`.
5. The table's "Projects" column (~line 66, 79) should now display a computed label instead of the raw removed string field: `"All projects"` when `projectIds === 'all'`, otherwise `"${projectIds.length} project(s)"` or the actual project names joined (prefer names if `useFresh().projects` is easily available in this component — nicer UX, matches Testiny showing actual project names).

---

## Part E — `AdminProjectPanel.tsx`: filter by assignment, not everything

The "Custom fields" tab (~line 349-375) currently maps over `adminSettings.customFields` unconditionally. Filter it to only fields assigned to the project being viewed:

```tsx
const assignedFields = adminSettings.customFields.filter(
  (field) => field.projectIds === 'all' || field.projectIds.includes(project.id)
)
```

...and map over `assignedFields` instead of `adminSettings.customFields` in the table body. This is the other half of the relational model — a field only shows up as toggleable-active-for-this-project if it's actually assigned to this project at all. Everything else in this tab (the `activeFieldDraft` active/inactive checkbox logic) stays unchanged — assignment (this task) and activation (already-existing `activeCustomFieldIds`) are two independent layers, same as in Testiny.

---

## Verification

1. `pnpm build`
2. `pnpm dev`
3. Browser smoke test:
   - `/admin/custom-fields`: create a new field, assign it to specific project(s) (not "all"), confirm the Projects column shows the right count/names.
   - Edit an existing seeded field via the new edit action, toggle it from "all projects" to specific projects and back, confirm it saves correctly.
   - `/DP/settings` (or wherever the project panel opens) → Custom fields tab: confirm only fields assigned to `DP` (or "all") appear in the list; if you unassign `DP` from a field in the admin custom-fields screen, confirm it disappears from this project's list and (per task-01/existing behavior) its values stop rendering on cases in that project.
   - Confirm a field created with default settings (no changes to Projects tab) still behaves as "all projects" / consistent with pre-task behavior — no regression for the common case.
4. Core regression routes (minimum): `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`
5. Record WebM evidence where tooling supports it; screenshots for any failures.
6. Write QA report to `/tmp/relay-qa-mvp-custom-fields/qa-report.md` (append/continue from task-01 & task-02 — full branch summary: schema version history v14→final, all three tasks' pass/fail, known limitations, push readiness).
7. Do not push until smoke test evidence is reviewed or explicitly waived. This is the last task on the branch — flag in the QA report that the branch is ready for a PR description to be drafted (mirroring the `mvp-test-plans` polish round's `pr-description-*.md` pattern) once evidence is reviewed.

## Documentation

- Update `docs/product/user-guide.md` / `docs/product/feature-flow.md` to describe the Projects tab and the assignment vs. activation distinction.
- Update `docs/_authoritative/DOMAIN_MODEL.md`'s `AdminCustomField` row for the `projectIds` shape (replacing the `projects: string` mention).
- Update `docs/_authoritative/FRONTEND_CONTRACTS.md` if it documents the admin custom-fields data contract.
- Update `docs/claude/handoff.md` with a completed-work entry for the whole `mvp-custom-fields` branch (all three tasks), final schema version, and QA evidence location.

## Out of scope / do not touch

- `CasesScreen.tsx` — no changes needed, rendering is already correct from task-01.
- Owner field — task-02, already done.
- No backend/DB/Docker/auth/API route work.
- No new commits without explicit request.
