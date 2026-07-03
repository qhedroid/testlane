# DRAFT — User Management improvements (not a runnable task yet)

> Provisional planning note, not a Cursor-ready task prompt. Part of the "Improvements" tier — batched for later per Shaun's own prioritization, not urgent. Branch name `mvp-user-management` is a guess — confirm/rename when this actually starts.

## Original ask

- Add a "remove user" option (currently only disable exists).
- Replace fake demo names in the admin panel with real ones: Shaun Sevume, Noel Quadri, Nasir Dipto, Arvindh Chandran, Monica Dayalani, Jamil Khan, Nadim Sharif, Syed Ahmed.
- Assign roles: Owner (keep as Demo User), Administrator (Shaun, Noel), Run Manager (Syed), Run Executor (Jamil, Nasir), Editor (Monica), Viewer (Nadim).

## What's known so far (found during Custom Fields research)

The case-level assignee/owner dropdown (`TEAM_USERS` in `apps/web/src/fresh/data/team-users.ts`) **already has all 8 real names** — that list already powers case assignment (`Case.assignee`), execution `testedBy`, etc. This ask is really only about the separate **admin panel** user list (`AdminUser[]`, seeded in `admin-initial-settings.ts`, shown at `/admin/users`), which is a distinct dataset from `TEAM_USERS` and still uses fake names. Scope here is smaller than it initially looked — likely: update the seed `AdminUser[]` entries to the 8 real names with the specified roles, plus add a delete/remove action alongside the existing disable action.

All 6 roles named in the ask (Owner, Administrator, Run Manager, Run Executor, Editor, Viewer) already exist in the static `ADMIN_USER_ROLES` list in `rbac.ts` — so this task is not blocked by the Role Management bug (see `mvp-role-management/draft-notes.md`), since none of these are new custom roles.

## Not yet done

- Haven't looked at whether "remove user" needs different handling than delete (e.g. audit trail implications, reassigning that user's existing case/run history) — `AdminUser` deletion probably needs a confirm dialog similar to role/field deletion elsewhere in the admin panel.
- Haven't checked whether `TEAM_USERS` and the admin `AdminUser[]` list should eventually be unified (right now they're two separate sources of truth for "who are the people in this org") — worth flagging as a design question rather than assuming they should merge.

## Suggested next steps when this is picked up

1. Read `AdminUsersPageContent.tsx` and `admin-initial-settings.ts`'s user seed data in full.
2. Decide whether "remove" is a hard delete or needs any historical-data handling.
3. Follow the `mvp-custom-fields/task-01-field-type-parity.md` format once scoped.
