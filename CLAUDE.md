# Relay — CLAUDE.md (Cowork / Claude AI Instructions)

## Purpose
Relay is a QA test execution platform (clinical-trials-style workspace).
This file is read automatically by Claude (Cowork) at the start of every session.
Treat `docs/_authoritative/**` as the only source of truth for requirements and contracts.

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

## localStorage
- Key: `relay-demo-v2`
- Always add a migration step in `migrate-demo-state.ts` when bumping the schema version.
- See `DEMO_SCHEMA_VERSION` in `demo-model.ts` for the current value.

## Commit message format
Subject: `<Scope>: <short imperative summary>` (≤72 chars, sentence case, no trailing period)

Body: one bullet per logical change. Be specific — name components, routes, and behaviours.
Mention: schema/model changes, new routes/components, store actions, functional behaviours, docs updated.

## Merge request description format
- **Header:** one-paragraph summary of the feature and its UI entry point
- **What's included:** one sub-section per commit — short SHA, subject, tight bullet list of what it delivers
- **⚠️ Caveats:** accidental commits, known gaps, deferred work
- **Testing:** build status, key manual checks, migration/localStorage notes

Prefer specifics over summaries in every bullet.

## When information is missing
Do not guess. Ask, or add a TODO in the relevant `docs/_authoritative/*` file.
