# Relay — CLAUDE.md (Cowork / Claude AI Instructions)

## Purpose
Relay is a QA test execution platform (clinical-trials-style workspace).
This file is read automatically by Claude (Cowork) at the start of every session.
Treat `docs/_authoritative/**` as the only source of truth for requirements and contracts.

## Claude-specific files (read on every session start)
All files under `docs/claude/` are for Claude (Cowork) only — not for Cursor agents.

- **`docs/claude/handoff.md`** — Read this immediately after CLAUDE.md. Contains: active branch, current schema version, completed task log, key decisions, and known gotchas. Update it at the end of any session where meaningful work was done.
- **`docs/claude/known-bugs.md`** — Investigation log for bugs that are identified but not yet fully resolved. Read before drafting any bug-fix prompt. Update whenever a bug is partially fixed, deferred, or newly discovered.

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

## Phase: Frontend-only prototype
- Do NOT implement or modify backend, DB/schema, Docker, auth, or API routes.
- Do NOT wire UI to real APIs. Persistence is client-side only (FreshProvider + localStorage).
- If a task appears to require backend work, stop and ask for confirmation.
- Mock/demo data is acceptable.

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
Whenever Claude edits or creates files in `docs/claude/**` or `docs/cursor-prompts/**`, it must automatically provide a commit title and description (following the commit message format above) at the end of its response, ready to commit. It must also ask the user whether they want Claude to perform the commit directly. If yes, commit with `Co-authored-by: Claude <claude@anthropic.com>` in the message body.

## localStorage
- Key: `relay-demo-v2`
- Always add a migration step in `migrate-demo-state.ts` when bumping the schema version.
- See `DEMO_SCHEMA_VERSION` in `demo-model.ts` for the current value.

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
- **Header:** one-paragraph summary of the feature and its UI entry point.
- **What's included:** group commits by feature area (e.g. "Admin Panel", "Test Cases"). Each area is a `###` heading. Under it, list each commit as a bold title followed by the short SHA in parentheses, then bullet points of what it delivers. Format: `**Commit title** (sha)` with no leading SHA prefix.
- **⚠️ Caveats:** accidental commits, known gaps, deferred work.
- **Testing:** build status, key manual checks, migration/localStorage notes.

Prefer specifics over summaries in every bullet.

Example structure:
```
### Admin Panel

**Project panel with per-project custom field activation** (398f45a)
- Added /admin route and AdminProjectPanel with five tabs
- Per-project custom field activation toggle

**Fix project panel layout** (87b419f)
- Corrected panel layout from block to inline-flex

### Test Cases

**Per-row context menu** (98ec34d)
- Row ... button opens a fixed-position context menu
- Duplicate, Edit, Open folder, and Delete actions
```

When writing for GitHub, link the SHA: `([`398f45a`](https://github.com/qhedroid/Relay/commit/398f45a))`.

## When information is missing
Do not guess. Ask, or add a TODO in the relevant `docs/_authoritative/*` file.
