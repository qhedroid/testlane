# Task 02 — Owner as a native, mandatory field

Branch: `mvp-custom-fields` (continues from task-01 on this branch)
Schema: v15 → **no further schema bump required** (see note below) unless the investigation in Part B turns up a case-creation path that needs a data shape change — if so, bump to v16 and add a migration step following the same pattern as task-01's.

This is task 2 of 3 on this branch. Depends on task-01 being applied first (this task doesn't touch custom-field types, but shares the same case-detail file).

Files touched:
- `apps/web/src/fresh/screens/CasesScreen.tsx`
- Whatever quick-create / "add case" entry point(s) call `addCase(...)` in `FreshProvider.tsx` (investigate and list exact call sites before editing — see Part B)
- `apps/web/src/fresh/data/migrate-demo-state.ts` (only if Part B finds existing cases with no `assignee` that need backfilling)

Do not touch `AdminUsersPageContent.tsx`, `rbac.ts`, or the admin user-management module — that's a separate, unrelated roadmap item about the admin panel's own user list, not this case-level field.

---

## Background

We benchmarked this feature against Testiny (a reference test-management tool). There, every test case has a mandatory "Owner" field — a dropdown of real users, always required, shown prominently on the case.

Relay already has almost exactly this: `Case.assignee?: string` (in `demo-model.ts`), which is:
- Optional (`?`) — not enforced.
- Editable via a `<select>` in `CasesScreen.tsx` (~line 1592-1600) with an explicit "Unassigned" empty option, populated from `TEAM_USERS` (`apps/web/src/fresh/data/team-users.ts` — already the canonical 8-person demo team: Noel Quadri, Shaun Sevume, Nasir Dipto, Monica Dayalani, Jamil Khan, Arvindh Chandran, Nadim Sharif, Syed Ahmed).
- Displayed read-only via `displayAssigneeName(c.assignee)` under the label "Assigned to" (~line 1692).

So this task is a **relabel + make-mandatory** job, not a new field build. Don't rename the underlying `assignee` property on `Case` (too much churn for no functional benefit — the `assignee` name is used in filters, sort, execution `testedBy`, etc.) — only change the **UI label** to "Owner" and enforce that it's always set.

---

## Part A — `CasesScreen.tsx`: relabel and make mandatory

1. Edit-mode label (~line 1592): change `<label>Assigned to</label>` to `<label>Owner *</label>` (the `*` marks it required, matching the convention already used for required custom fields in task-01's Part F).
2. Edit-mode `<select>` (~line 1593-1600): remove the `<option value="">Unassigned</option>` line — every case must have an owner, so no empty option should be selectable once a value exists. If `draft.assignee` is somehow empty when the form opens (see Part B), default the `<select>`'s effective value to the first `TEAM_USERS` entry rather than showing a blank/invalid selection.
3. Read-only label (~line 1692): change `<div className="dp-ml">Assigned to</div>` to `<div className="dp-ml">Owner</div>`.
4. Add the same required-field validation from task-01 Part F to this field in `saveEdit()`: block save if `draft.assignee` is falsy, with the same inline-error pattern (reuse the `fieldErrors` set from task-01 if that field also touched `saveEdit()` — add `'owner'` or similar as a synthetic key alongside the custom-field ids it already tracks, since `assignee` isn't itself in `activeFields`).
5. Search the rest of `CasesScreen.tsx` for any other place "Assigned to" / "Assignee" appears as a **user-facing label** (not a variable/prop name — e.g. the filter builder's `<option value="assignee">Assignee</option>` at ~line 799 is a filter field label, not a case-detail label; use judgment on whether that one should also say "Owner" for consistency — recommend yes, since Testiny's filter/condition builder also calls it "Owner", but this is a nice-to-have, not required for this task to be considered done).

---

## Part B — investigate: does every case get an owner on creation?

Before editing anything else, find every call site of `addCase(...)` (defined in `FreshProvider.tsx`, ~line 787) across the codebase — likely a "Quick create" case modal and possibly a full "Create case" form in `CasesScreen.tsx`. For each call site:

- If it already passes `assignee` (e.g. defaulting to the current actor or a fixed team member), no change needed there.
- If it does **not** pass `assignee` at all, add a sensible default. Recommended default: try to match `currentActor`'s name (from `useFresh()`) against `TEAM_USERS` via `normalizeAssigneeName()` (already exported from `team-users.ts`); if that resolves to a valid team user, use it; otherwise fall back to `TEAM_USERS[0]`. This mirrors how `displayAssigneeName`/`normalizeAssigneeName` are already used elsewhere in the codebase — don't invent a new resolution scheme.

If, after this investigation, you find there's no gap (every creation path already sets a valid `assignee`), state that clearly in the QA report and skip the migration entirely — no schema bump needed in that case.

If existing persisted demo data (seed cases in `demo-seed.ts` / `demo-template.ts`) has any case with `assignee` undefined, backfill those in the seed file directly (not via migration, since seed data is regenerated fresh) using the same default logic. Only add a `migrate-demo-state.ts` v15→v16 step if there's a realistic path for a **user's already-persisted localStorage state** to contain a case with no `assignee` (e.g. cases created before this task shipped) — in that case, backfill to `TEAM_USERS[0]` on migration, following the existing migration function pattern in that file.

---

## Verification

1. `pnpm build`
2. `pnpm dev`
3. Browser smoke test on `/DP/testcases`:
   - Open any case, confirm the field now reads "Owner" (not "Assigned to") in both edit and read-only views.
   - Edit a case, confirm there is no "Unassigned" option in the Owner dropdown.
   - Try to save with... actually, since there's no empty option, focus this check on: create a brand-new case via whatever quick-create path exists, confirm it lands with a real owner (not blank) — open it immediately after creation and confirm the Owner field shows a real team member, not "—" or empty.
   - If Part B added save-blocking validation, exercise it the same way as task-01's required-field check.
4. Core regression routes (minimum): `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`
5. Record WebM evidence where tooling supports it; screenshots for any failures.
6. Write QA report to `/tmp/relay-qa-mvp-custom-fields/qa-report.md` (append to task-01's report if it's still in the same location, or note continuation — pass/fail summary, whether Part B found any creation-path gap, migration decision, push readiness).
7. Do not push until smoke test evidence is reviewed or explicitly waived.

## Documentation

- Update `docs/product/user-guide.md` / `docs/product/feature-flow.md` wherever "Assigned to" is referenced for test cases, to say "Owner" and note it's mandatory.
- Update `docs/_authoritative/DOMAIN_MODEL.md`'s `Case` row if it explicitly mentions `assignee` as optional — note it's now enforced as mandatory in the UI (the TypeScript type can stay `assignee?: string` if that's simpler than threading required-ness through the type system, since enforcement happens at the save-validation layer, same as required custom fields — use judgment, but don't over-engineer a non-optional type change if it causes churn elsewhere).
- Update `docs/claude/handoff.md` with a short completed-work entry once done, including whether a schema bump was needed.

## Out of scope / do not touch

- Admin panel user management (`AdminUsersPageContent.tsx`, `/admin/users`) — separate roadmap item, unrelated data (`AdminUser[]` vs. the case-level `TEAM_USERS` list used here).
- Custom field types/rendering — task-01, already done.
- Per-project field assignment — task-03.
- No backend/DB/Docker/auth/API route work.
- No new commits without explicit request.
