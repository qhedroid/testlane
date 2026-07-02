# Relay — Final Claude Project Handover

Last updated: 1 July 2026

Purpose: this is the consolidated handover for moving Relay planning and review into Claude while keeping Cursor as the implementation agent. It combines the latest Cursor-verified repository state, the earlier Claude handovers, the BetterTestiny architecture notes, and the current working process.

Rule: if this document conflicts with the live repository, the repository wins. Claude and Cursor must inspect the repo before planning or changing anything.

---

## 1. Current project identity

Relay is a frontend-first TI Test Management Tool MVP. It is a CTMS/Testiny-inspired QA workspace designed around internal Trial Interactive-style workflows, not a generic TestRail/Testiny clone.

Current product direction:

- Frontend-first prototype
- Local/demo data via `FreshProvider` and `localStorage`
- Backend/API work exists in places but is not the main demo path
- No real auth, SSO, email, Jira sync, Excel update, backend persistence, or external integration unless explicitly approved
- `mvp-main` is the MVP integration branch
- Feature branches merge into `mvp-main`, not `main`

Canonical route convention:

```text
/DP/dashboard
/DP/testcases
/DP/testruns
/DP/plans
/DP/settings
/admin/users
/admin/roles
/admin/audit-log
```

Important: use `/DP/testcases`, not `/DP/cases`.

---

## 2. AI operating model going forward

We now have a work Claude subscription. The preferred workflow is:

Claude:

- Main planning and review layer
- Reads repo/docs/tracker/context
- Produces gap analysis
- Writes strict Cursor prompts
- Reviews Cursor output
- Drafts Jira/Excel recommendations, but does not execute without approval

Cursor:

- Implementation agent
- Runs repo commands
- Edits code/docs
- Runs build and smoke tests
- Records WebM evidence where supported
- Creates QA reports
- Commits/pushes/opens PRs only after approval

ChatGPT:

- Backup review layer
- Handover and prompt support
- Second opinion when context is messy

Hard rule: Claude should not jump straight into writing implementation prompts. It should inspect current repo state first, then produce a gap analysis.

---

## 3. Canonical local repo and workspace warnings

Use this repo as the current verified working copy:

```text
/Users/nquadri/Documents/Relay-zip-build/Relay
```

Do not treat these as canonical unless explicitly reconciling copies:

```text
/Users/nquadri/Documents/Relay-shaun-local/Relay
/Users/nquadri/Documents/Relay-shaun-local
/Users/nquadri/Relay
/Users/nquadri/Documents/Relay
```

The parent folder is not the git root. Always `cd` into the actual `Relay` folder before running Git or pnpm commands.

Before any work, Claude/Cursor should verify:

```bash
git status
git branch --show-current
git log --oneline --decorate -n 10
git remote -v
```

---

## 4. Current verified repo state from Cursor

Cursor verified the current repo from:

```text
/Users/nquadri/Documents/Relay-zip-build/Relay
```

Current branch at the time of handover:

```text
mvp-requirements-defects-slice @ a9212fc
```

Remote:

```text
https://github.com/qhedroid/Relay.git
```

Current feature branch:

```text
mvp-requirements-defects-slice
```

Latest verified status:

```text
Working tree: clean
Branch pushed: yes
Merged to mvp-main: no
PR: #14 open against mvp-main
```

Current base:

```text
origin/mvp-main @ 50c0e1e
```

Important open/not-yet-mainline branches:

```text
mvp-requirements-defects-slice
chore/cursor-tracked-rules
```

Important merged PRs:

```text
PR #11: mvp-test-runs → mvp-main
PR #12: mvp-user-role-access → mvp-main
PR #13: mvp-test-plans → mvp-main
```

Important open PR:

```text
PR #14: mvp-requirements-defects-slice → mvp-main
```

---

## 5. Completed feature work so far

### 5.1 Project and test case foundation

Completed earlier feature branches established:

- Project-key routing
- Demo project seed (`DP`)
- Test case library
- Case CRUD and detail views
- Folder organisation
- Case URL sync
- LocalStorage-backed demo state

Canonical test case route:

```text
/DP/testcases
/DP/testcases/tc/:caseKey
```

Do not reintroduce `/DP/cases` as a canonical route.

### 5.2 Test Runs slice — merged PR #11

Implemented the main execution workspace:

- `/DP/testruns`
- `/DP/testruns/tr/:runKey`
- `/DP/testruns/tr/:runKey/tc/:caseKey`
- Run picker
- Case list
- Step execution
- Result buttons
- Add cases to run
- Duplicate/delete run
- Run seal/reopen
- History and summary panel polish
- Project-switch guards

Do not replace the current `RunsScreen` execution UX with an older layout.

### 5.3 User and Role Access slice — merged PR #12

Implemented frontend-only admin/user access:

- `/admin/users`
- `/admin/roles`
- `/admin/audit-log`
- User search
- Invite user
- Silent invite
- Pending invite
- Edit user
- Disable/reactivate user
- Project access display
- Role management
- Seven built-in roles
- Custom role CRUD
- Permission matrix
- Demo actor switcher
- Admin-scoped RBAC
- Final Owner/Admin disable guard
- Audit entries for user/role/actor changes
- Schema v12

Important status values:

```text
Active
Pending invite
Silent created
Disabled
```

Silent invite must remain. It supports dummy/demo/internal accounts without sending real email.

Known limitation: RBAC is admin-scoped only. It is not yet enforced across `/DP/testcases`, `/DP/testruns`, `/DP/plans`, or project execution actions.

### 5.4 Test Plans slice — merged PR #13

Implemented:

- `/DP/plans`
- `/DP/plans/tp/:planKey`
- Test plan data model
- Query groups
- Static/folder/condition query selection
- Spawn run from plan
- Schema v13

### 5.5 Requirements and Defects slice — open PR #14

Branch:

```text
mvp-requirements-defects-slice
```

Commit:

```text
a9212fc — feat: add local requirements and execution defects slice
```

Status:

```text
Pushed: yes
PR open: yes
Merged: no
```

Delivered scope:

Test Cases:

- Requirements create/link from case context
- Linked requirements visible on case
- Defects view-only from case context
- Defects shown on cases derive from execution defects linked in test runs

Test Runs:

- Requirements view-only from linked test case requirements
- Defects create/link from failed or blocked execution results
- Defect create/link disabled for Passed, Skipped, Not run, and sealed runs

Defects:

- Local `DEF-*` records are merged into `/DP/defects`
- Module-level full defect CRUD is not implemented

Schema:

```text
v14
```

New concepts:

```text
Requirement
Defect
requirementsById
defectsById
Case.requirementIds
CaseExecution.defectIds
REQ-* counters
DEF-* counters
```

Known limitations:

- No Requirements module route
- No requirement coverage dashboard
- No full traceability matrix
- No real Jira integration
- No external defect sync
- No project-level audit for requirement/defect activity
- No backend/API/database changes

Immediate action: review/smoke-test PR #14, then merge into `mvp-main` only after approval.

---

## 6. Current product routes

Canonical project routes:

```text
/DP/dashboard
/DP/testcases
/DP/testcases/tc/:caseKey
/DP/testruns
/DP/testruns/tr/:runKey
/DP/testruns/tr/:runKey/tc/:caseKey
/DP/plans
/DP/plans/tp/:planKey
/DP/defects
/DP/settings
/DP/audit
/DP/reports
/DP/integrations
```

Admin routes:

```text
/admin
/admin/users
/admin/roles
/admin/audit-log
/admin/projects
/admin/profile
/admin/account
```

Special API-backed route:

```text
/runs/api
```

This is separate from the main frontend demo path and may require Docker/MySQL.

Invalid/stale:

```text
/DP/cases
/DP/requirements
```

`/DP/cases` should be treated as stale/invalid. `/DP/requirements` does not exist yet.

---

## 7. Current data model and storage

Storage key:

```text
relay-demo-v2
```

Important files:

```text
apps/web/src/fresh/data/FreshProvider.tsx
apps/web/src/fresh/data/demo-model.ts
apps/web/src/fresh/data/migrate-demo-state.ts
apps/web/src/fresh/data/demo-seed.ts
apps/web/src/fresh/data/project-selectors.ts
```

Recent schema history:

```text
v11: case createdAt / test case support
v12: admin users, roles, currentActorUserId, RBAC demo
v13: test plans
v14: requirements and defects slice
```

Before touching localStorage shape, Cursor must:

- Inspect existing schema
- Add migration
- Preserve existing demo data
- Update domain docs
- Run build and smoke test

---

## 8. Workflow and QA rules

Mandatory post-change workflow for any user-visible feature, route, schema/localStorage, RBAC, or module-flow change:

```text
1. Run pnpm build
2. Run pnpm dev
3. Browser smoke test affected routes and core regression routes
4. Record WebM evidence where supported
5. Capture screenshots for failures
6. Write QA report under /tmp/relay-qa-<branch-or-feature>/qa-report.md
7. Update docs
8. Do not push until approved
```

Core regression routes:

```text
/admin/users
/admin/roles
/admin/audit-log
/DP/settings
/DP/dashboard
/DP/testcases
/DP/testruns
/DP/plans
```

Important note: do not run `pnpm build` while `pnpm dev` is active if it risks `.next` corruption. Stop dev server or clean `.next` when needed.

---

## 9. Cursor project rules status

Cursor-native rules exist locally in the zip-build repo as:

```text
.cursor/rules/relay-core.mdc
.cursor/rules/relay-web.mdc
.cursor/rules/relay-docs.mdc
```

However, Cursor verified that `.cursor/rules/*.mdc` is not yet on `mvp-main` because `.gitignore` still ignores `.cursor/` on the current branch.

A branch exists:

```text
origin/chore/cursor-tracked-rules
```

Purpose:

- Track `.cursor/rules/*.mdc`
- Keep `.cursor/settings.json`, `.cursor/plans/`, and local state ignored
- Prevent local-only Cursor rule drift

Recommended action: merge `chore/cursor-tracked-rules` into `mvp-main` soon after PR #14 or before the next feature branch, so Cursor rules are shared across clones.

---

## 10. Documentation state

Claude/Cursor should read these before planning:

```text
.cursor/rules/*.mdc
CLAUDE.md
docs/_authoritative/README.md
docs/_authoritative/AS_BUILT_SNAPSHOT.md
docs/_authoritative/DOMAIN_MODEL.md
docs/_authoritative/FRONTEND_CONTRACTS.md
docs/product/user-guide.md
docs/product/feature-flow.md
docs/claude/handoff.md
docs/claude/known-bugs.md
```

Living docs:

```text
docs/product/user-guide.md
docs/product/feature-flow.md
```

Authoritative docs:

```text
docs/_authoritative/**
```

Known stale/conflicting docs:

- Some docs still mention `/cases`; repo route is `/testcases`
- Some headers still reference old branches such as `demo/contract-aware-prototype`
- `docs/claude/handoff.md` may describe requirements slice as uncommitted in some versions, but repo shows commit `a9212fc` pushed
- Older backend-first handovers are historical context, not current implementation direction

Rule: repo wins over docs. If there is a conflict, flag it and propose a docs-fix task.

---

## 11. BetterTestiny architecture guidance that still matters

Older architecture notes are still valuable for backend/future integration but should not override the current frontend-first scope.

Still-important principles:

- Execution snapshots are non-negotiable
- Execution history must not depend on live TestCase records
- Run sealing should eventually be enforced server-side
- Audit logging should be append-only
- Domain-first over generic test tool design
- Search is a first-class future feature
- Mock auth is acceptable for MVP, real auth later

Historical/backend-first items should be treated as later phases, not today’s frontend prototype scope.

---

## 12. Jira and Excel policy

Do not update Jira without Noel’s approval.

Do not create Jira tickets without Noel’s approval.

Do not edit the Excel tracker without Noel’s approval.

Cursor/Claude may inspect, compare, and propose updates.

Recommended tracker updates after requirements/defects slice, pending approval:

```text
Requirement creation: Completed (local/Test Cases only)
Requirement linking: Completed (local only)
Requirement traceability: In Progress / Partial
Requirement coverage tracking: Not Started
Integration-based requirement synchronisation: Not Started
Defect creation: Completed (local, Failed/Blocked execution only)
Defect linking: Completed (local execution link only)
Defect tracking from test execution: Completed
Defect traceability: In Progress / Partial
Defect integration with external tools: Not Started
```

Potential follow-up Jira tickets, pending approval:

```text
Build dedicated Requirements module route
Add requirement coverage dashboard/reporting
Add full requirement traceability matrix
Add project-level audit events for requirements/defects
Add real Jira/external defect sync
Add full defect lifecycle management
Merge tracked Cursor project rules into mvp-main
```

---

## 13. Immediate next actions

### For Noel

1. Review PR #14: `mvp-requirements-defects-slice → mvp-main`.
2. Run or ask Cursor to run the required smoke test if the evidence is missing locally.
3. Merge PR #14 only after review/approval.
4. Merge `chore/cursor-tracked-rules` so Cursor rules become mainline.
5. Approve or reject proposed Excel/Jira updates.

### For Claude

1. Read this handover.
2. Inspect repo state.
3. Trust repo over docs.
4. Do not code.
5. Produce gap analysis before any Cursor prompt.
6. Draft Cursor prompts only after understanding current branch/schema/routes.

### For Cursor

1. Use `/Users/nquadri/Documents/Relay-zip-build/Relay`.
2. Branch from latest `origin/mvp-main` after PR #14 merge.
3. Follow mandatory smoke-test workflow.
4. Do not touch backend/API/database/Jira/Excel unless explicitly approved.
5. Do not push without approval.

---

## 14. Claude onboarding instruction

Paste this at the start of the Claude project/session:

```text
You are taking over as the main planning/review layer for Relay.

First read the attached final handover. Then inspect the repo at:
/Users/nquadri/Documents/Relay-zip-build/Relay

Before planning, run or request:
git status
git branch --show-current
git log --oneline --decorate -n 10

Trust the repo over docs if they conflict.

Current direction: frontend-first localStorage prototype.
Do not implement backend/API/database/Jira/Excel changes unless explicitly approved.
Do not code directly unless explicitly asked.
Your default job is gap analysis, product review, and strict Cursor prompt drafting.

Always ensure Cursor follows:
pnpm build
pnpm dev
browser smoke test
WebM evidence where supported
QA report under /tmp/relay-qa-<branch-or-feature>/qa-report.md
docs updates
no push without approval

Immediate known work:
Review/merge requirements-defects PR #14 if still open.
Then merge tracked Cursor rules if still open.
Then produce the next gap analysis from latest mvp-main.
```

---

## 15. Suggested next Cursor prompt strategy

For any next feature, ask Cursor to:

1. Fetch latest `mvp-main`.
2. Confirm branch and schema version.
3. Read `.cursor/rules/*.mdc`, `CLAUDE.md`, docs, handoff.
4. Inspect actual implementation before coding.
5. Produce gap analysis first.
6. Ask approval before Jira/Excel/ticket actions.
7. Implement narrowly.
8. Update docs.
9. Run build and recorded smoke test.
10. Produce QA report.
11. Do not commit/push until approved.

---

## 16. Final source-of-truth hierarchy

Use this order:

```text
1. Live repo state
2. .cursor/rules/*.mdc and CLAUDE.md
3. docs/_authoritative/**
4. docs/product/user-guide.md and docs/product/feature-flow.md
5. docs/claude/handoff.md and docs/claude/known-bugs.md
6. This final handover
7. Older chat summaries and historical backend-first handovers
```

This document is intended to reduce context dumping, not replace repo inspection.

