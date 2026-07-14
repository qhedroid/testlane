# DRAFT — Role Management fixes (not a runnable task yet)

> Provisional planning note, not a Cursor-ready task prompt. Part of the "Improvements" tier — batched for later, not urgent. Branch name `mvp-role-management` is a guess.

## Original ask

- Pre-existing (built-in) roles can't be edited or deleted, only viewed.
- New custom roles created in Role Management don't show up in the invite-user role dropdown.

## What's known so far (root cause found during Custom Fields research)

This is a real architecture gap, not a small UI tweak. The invite/edit-user role `<select>` (in `AdminUsersPageContent.tsx`) reads from a **hardcoded static union type**, `ADMIN_USER_ROLES` in `rbac.ts` (Owner, Administrator, Project Administrator, Editor, Run Manager, Run Executor, Viewer). Role Management (`AdminRolesPageContent.tsx`) instead operates on a completely separate **dynamic CRUD entity**, `AdminRole` (`adminSettings.roles`), via `createAdminRole`/`updateAdminRole`/`deleteAdminRole`. These two systems don't talk to each other at all — a role created via Role Management has no path to ever appearing as an assignable user role, regardless of any dropdown-refresh bug. Built-in roles being read-only is likely intentional in the current code (a `detailRole.isBuiltIn` flag gates edit permissions in the roles panel per `AdminRolesPageContent.tsx`) — worth confirming whether "should be editable" is really the ask, or whether the real complaint is just the disconnected-systems issue above.

## Not yet done

- Haven't checked whether anything else in the codebase (RBAC permission checks, `useActorRbac`, project access logic) keys off `AdminUserRole` (the static union) vs. `AdminRole.id` (the dynamic entity) — unifying them likely touches more than just the two UI screens.
- Haven't scoped what "editable built-in roles" should even mean — if permissions on a built-in role change, does that affect every user with that role immediately? Is there a concept of "reset to default"? This needs a product decision, not just a code fix.

## Suggested next steps when this is picked up

1. Grep every reference to `AdminUserRole` and `ADMIN_USER_ROLES` vs. `AdminRole`/`adminSettings.roles` to map the full blast radius before proposing a unification approach.
2. Get Shaun's call on whether built-in-role editing is actually wanted, or whether just fixing the dropdown disconnect (so custom roles become assignable) satisfies the ask.
3. This is likely a bigger task than most "Improvements" tier items — may warrant its own multi-task branch (like `mvp-custom-fields`) rather than a single task, given the RBAC blast radius.
