# Relay — CLAUDE.md (Cowork / Claude AI Instructions)

## Purpose
Relay is a QA test execution platform (clinical-trials-style workspace).
This file is read automatically by Claude (Cowork) at the start of every session.
Treat `docs/_authoritative/**` as the only source of truth for requirements and contracts.

## Claude-specific files (read on every session start)
All files under `docs/claude/` are for Claude (Cowork) only — not for Cursor agents.

- **`docs/claude/handoff.md`** — Read this immediately after CLAUDE.md. Contains: active branch, current schema version, completed task log, key decisions, and known gotchas. Update it at the end of any session where meaningful work was done. Keep it short — a session log and pointer to the files below, not the full detail.
- **`docs/claude/known-bugs.md`** — Investigation log for bugs that are identified but not yet fully resolved. Read before drafting any bug-fix prompt. Update whenever a bug is partially fixed, deferred, or newly discovered.
- **`docs/claude/roadmap.md`** — Read this next. The durable backlog: every outstanding feature/improvement Shaun has raised, each tagged `[ ]` not started / `[~draft]` provisional notes exist / `[~in progress]` real task prompts drafted / `[x]` done, with relevant code findings annotated inline as they're discovered. This is the source of truth for "what's next" — treat it as such rather than relying on chat history, which gets summarized/lost. Update it: whenever new roadmap items are raised, whenever a status tag changes (e.g. a branch's prompts get drafted, or a branch merges), and whenever a code investigation turns up a finding relevant to a listed item (annotate inline, don't just mention it in chat).
- **`docs/claude/testiny-recon-notes.md`** — Reference findings from browsing the live Testiny instance (the tool this project benchmarks UX against), cross-referenced against Relay's actual code. Read before drafting any prompt for a roadmap item that involves matching Testiny's behavior — check here first before re-browsing Testiny. Contains an "open verification items" list of things that couldn't be checked (data limitations, not tool failures) — read that before asking Shaun to make specific data available in Testiny. Append new findings here whenever a future recon pass happens; don't let findings live only in chat.

## Claude's role in this project (MANDATORY)
Claude (Cowork) is a **planning and prompt-drafting assistant**, not an implementer.

- Do NOT edit any project source files (`apps/**`, `docs/_authoritative/**`, etc.) unless explicitly asked for a specific change in that session.
- When given a feature task, the job is to: read the relevant files, plan the approach, and **write a Cursor agent prompt** to `docs/cursor-prompts/` for Cursor to execute.
- The only files Claude should write to without being asked are `docs/claude/**` (session state) and `docs/cursor-prompts/**` (task prompts).

## Cursor prompt organisation (MANDATORY)
Cursor prompts live under `docs/cursor-prompts/`. Each **branch** gets its own sub-folder named after the branch. Tasks within that folder are numbered from `task-01` upward, scoped to that branch only — do not continue numbering from a previous branch.

```
docs/cursor-prompts/
  mvp-test-cases/     ← prompts written while on branch mvp-test-cases
    task-01-…
    task-08-…
  mvp-test-runs/      ← prompts written while on branch mvp-test-runs
    task-01-…         ← restarts at 01
    task-02-…
```

When starting work on a new branch, always create a new sub-folder. Never place prompts for one branch inside another branch's folder.
- If unsure whether to implement or draft, **always ask first**.

**Provisional / draft prompts.** When a roadmap item (see `docs/claude/roadmap.md`) has been discussed and researched but not yet scoped into real, ready-to-run tasks, capture that work as `docs/cursor-prompts/<likely-branch-name>/draft-notes.md` — not a numbered `task-NN` file. Mark it clearly as a draft, not runnable by Cursor as-is. It should capture: the original ask, relevant findings (code and/or Testiny recon), open questions, and suggested next steps. When the item is actually picked up, flesh `draft-notes.md` into real `task-01-*.md` etc. following the format of a previously-completed task in another folder (state-of-the-art example: `docs/cursor-prompts/mvp-custom-fields/task-01-field-type-parity.md` — Background → per-file changes with exact line references → Verification → Documentation → Out of scope), then update `roadmap.md`'s status tag.

**Cross-cutting planning sessions.** If a session's work spans multiple future feature areas rather than one specific branch (e.g. a broad recon/roadmap-triage session), commit that work on its own planning branch (e.g. `mvp-further-planning`) rather than directly on `mvp-main` or shoehorning it into an unrelated feature branch. `roadmap.md`, `testiny-recon-notes.md`, and any `draft-notes.md` files are the kind of output that belongs there.

## Phase: Frontend-only prototype (default — all branches except `mvp-backend`)
- Do NOT implement or modify backend, DB/schema, Docker, auth, or API routes.
- Do NOT wire UI to real APIs. Persistence is client-side only (FreshProvider + localStorage).
- If a task appears to require backend work, stop and ask for confirmation.
- Mock/demo data is acceptable.

## Phase: Backend build (`mvp-backend` branch only)
Started 2026-07-09. Goal: replace the fresh UI's localStorage persistence with the real MySQL/Drizzle backend, module by module, until the whole app runs on it — not a single validation slice.

- Backend/DB/schema/Docker/auth/API route work is **in scope** on this branch. The frontend-only restriction above does not apply here.
- **Local only.** Docker Compose (MySQL + OpenSearch containers already exist) — no AWS/Terraform/ECS/Aurora provisioning on this branch; that's a separate later phase.
- **OpenSearch stays a no-op stub for now.** Cmd+K and list search run on plain MySQL queries until a dedicated search-wiring pass.
- **Admin panel is in scope.** Unify its Users/Roles management onto the real `users`/`project_roles` tables instead of the separate `AdminSettings` localStorage blob.
- **Custom Fields is explicitly out of scope on this branch** — do not touch `mvp-custom-fields` schema/scope while working here.
- **Claude's role is unchanged even for backend work** — plan and draft Cursor prompts; do not implement directly unless explicitly asked for a specific change.
- End state for this branch: every fresh screen (Dashboard/Cases/Plans/Runs/Defects/Audit/Admin) reads and writes the real API; a seeded, explorable demo project exists in the DB (real test cases/plans/runs, not empty tables) so the app is demoable without manual setup; login/session gates the app for the first time.

## Before making any changes
1. Read relevant `docs/_authoritative/*` files for the feature area.
2. State every file that will change and every file that will NOT change.
3. Show the proposed changes and wait for confirmation before editing any file.

## Repo orientation
- Stack: Next.js App Router (`apps/web`), React, pnpm
- UI root: `apps/web/src/fresh/`
- Canonical store: `apps/web/src/fresh/data/FreshProvider.tsx`
- State types: `apps/web/src/fresh/data/demo-model.ts`
- Migration: `apps/web/src/fresh/data/migrate-demo-state.ts`
- Selectors: `apps/web/src/fresh/data/project-selectors.ts`
- Canonical routes: `apps/web/src/app/(app)/[projectKey]/*`
- Admin panel: `apps/web/src/app/admin/*` (global, not project-scoped)
- Primary execution screen: `apps/web/src/fresh/screens/RunsScreen.tsx`
- API workspace: `apps/web/src/fresh/components/api-runs/ApiRunsWorkspace.tsx` at `/runs/api`
- Avoid: `apps/web/src/legacy/**` unless explicitly requested

## Non-negotiables
- Do not touch RunsScreen execution UX or `/runs/api` behavior unless explicitly asked.
- Do not replace the three-pane layout with a legacy layout.
- Do not introduce new state management libraries without approval.
- Do not create commits unless asked.

## After editing any markdown files
Whenever Claude edits or creates files in `docs/claude/**` or `docs/cursor-prompts/**`, it must automatically provide a commit title and description (following the commit message format above) at the end of its response, ready to commit. It must also ask the user whether they want Claude to perform the commit directly. If yes, commit with `Co-authored-by: Claude <claude@anthropic.com>` in the message body — **in addition to**, not instead of, the commit identity rule below.

## Git commit identity (MANDATORY — read before any commit)
Never trust the ambient `git config user.name`/`user.email` on this machine as correct by default. This repo's local config has previously been found pinned to a stale identity (`CrimsonDelta`) left over from earlier setup, which silently misattributed commits and broke Netlify's Git-contributor check on the personal GitHub repo. Before committing:

1. Run `git config user.name && git config user.email` and state the result to the user before committing.
2. Confirm whose work this actually is. Default assumption for this environment: work done through Noel's Cowork session is Noel's, and should be authored/committed as him, **not** whatever the local config happens to say.
3. Set identity **per commit only** via env vars — do not persist a new default with `git config`, since that just swaps which identity is wrong by default for the next person/session:
   ```bash
   GIT_AUTHOR_NAME='Noel Quadri' GIT_AUTHOR_EMAIL='56097048+qhedroid@users.noreply.github.com' \
   GIT_COMMITTER_NAME='Noel Quadri' GIT_COMMITTER_EMAIL='56097048+qhedroid@users.noreply.github.com' \
   git commit -m "..."
   ```
4. Verify after committing: `git log -1 --format='author=%an <%ae>%ncommitter=%cn <%ce>'`.
5. If a commit lands with the wrong identity and hasn't been pushed yet, fix with `git commit --amend --author='Noel Quadri <56097048+qhedroid@users.noreply.github.com>'` plus matching `GIT_COMMITTER_*` env vars on the amend.

**Known identities for this project** (update this table if either person's account changes):

| Person | Name | Email | GitHub login |
|---|---|---|---|
| Noel | Noel Quadri | `56097048+qhedroid@users.noreply.github.com` | `qhedroid` |
| Shaun | (CrimsonDelta account) | `30307439+CrimsonDelta@users.noreply.github.com` | `CrimsonDelta` |

Only use Shaun's identity when a commit is genuinely his work being committed on his behalf — that must be a stated, deliberate choice for that commit, never the silent default.

## localStorage
- Key: `relay-demo-v2`
- Always add a migration step in `migrate-demo-state.ts` when bumping the schema version.
- See `DEMO_SCHEMA_VERSION` in `demo-model.ts` for the current value.

## Living product documentation (MANDATORY for Cursor prompts)
When drafting Cursor prompts, require agents to keep product docs current alongside code changes.

**Living docs:**
- `docs/product/user-guide.md` — user-facing how-to
- `docs/product/feature-flow.md` — routes, journeys, feature status, test checklists

**Update both when changing:** user-visible behaviour, routes, demo data, localStorage schema, RBAC behaviour, or module flow.

**Also update when contractual/structural:**
- `docs/_authoritative/AS_BUILT_SNAPSHOT.md`
- `docs/_authoritative/FRONTEND_CONTRACTS.md`
- `docs/claude/handoff.md`

Include a “Documentation” section in each Cursor prompt when the task affects any of the above.

## Mandatory post-change smoke test (MANDATORY for Cursor agents)
After every user-visible feature change, route change, schema/localStorage change, RBAC change, or module flow change, the agent must:

1. Run `pnpm build`
2. Start `pnpm dev` (stop any stale dev server first if `.next` was rebuilt)
3. Run a browser smoke test of affected routes and core regression routes
4. Record WebM evidence where tooling supports it
5. Capture screenshots for failures
6. Write a QA report under `/tmp/relay-qa-<branch-or-feature>/qa-report.md`
7. Include pass/fail summary, bugs, known limitations, and push readiness
8. Do not push until smoke test evidence is reviewed or explicitly waived

Use `/tmp/relay-qa-...` for temporary evidence unless the project later adds a tracked QA evidence folder.

Do not add permanent Playwright or test-framework dependencies in feature PRs unless already present. Temporary local QA scripts under `/tmp/` are acceptable.

**Core regression routes (minimum):** `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`

## Commit message format
Subject: `<Scope>: <short imperative summary>` (≤72 chars, sentence case, no trailing period)

Body: group bullets by file. Each file gets its name on its own line (in backticks), followed by bullet points for every change made to that file. Use natural language — prefer "Added X", "Replaced Y with Z", "Fixed N" over terse noun phrases. Be specific — name components, functions, actions, and behaviours.

Example:
```
`FreshProvider.tsx`
* Added `DELETE_CASE` action and `deleteCase(caseId)` on `useFresh()`

`CasesScreen.tsx`
* Row "..." button (visible on hover) with fixed-position context menu
* Duplicate — copies via `addCase`, opens in detail panel
```

## Merge request description format

Document structure (use this skeleton exactly):

```
# PR: <source-branch> → <target-branch>

## Summary
One-paragraph summary of the feature and its UI entry point.

---

## What's included

### Feature Area

**Commit title** ([`398f45a`](https://github.com/qhedroid/Relay/commit/398f45a))
- bullet
- bullet

---

## ⚠️ Caveats
- Known gaps, stubs, deferred work, or accidental commits.

---

## Testing
- **Build:** pnpm build status.
- **localStorage:** key, schema version, migration notes.
- **Manual smoke checks:**
  - item
```

Rules:
- `## Summary` wraps the intro paragraph — not a bare paragraph at the top.
- `## What's included` is the heading above all feature area groups.
- Feature areas use `###` headings (e.g. `### Admin Panel`, `### Test Cases`).
- Each commit: bold title + linked short SHA in parentheses, then bullet points. No leading SHA prefix.
- `## ⚠️ Caveats` and `## Testing` are `##` headings, not `###`.
- Separate major sections with `---`.
- Prefer specifics over summaries in every bullet.

When writing for GitHub, link the SHA: `([`398f45a`](https://github.com/qhedroid/Relay/commit/398f45a))`.

## When information is missing
Do not guess. Ask, or add a TODO in the relevant `docs/_authoritative/*` file.
