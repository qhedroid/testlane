> **STALE / SUPERSEDED** — This was a one-off prompt to create agent context. Use [`docs/_authoritative/PROJECT_CONTEXT.md`](../_authoritative/PROJECT_CONTEXT.md) instead.

Testlane — Create Agent Source-of-Truth Context File

Context:
I have made changes to the Testlane app locally. We need a durable markdown file that future Cursor/ChatGPT sessions must use as the project source of truth.

This is not a personal handover for Noel.
This is a product/engineering context file designed to reduce hallucination, repeated token-heavy context dumps, and incorrect assumptions about what exists in the repo.

Goal:
Create a single, accurate, repo-grounded markdown file that documents the current Testlane implementation, constraints, architecture, working areas, non-working areas, and next ticket-led steps.

Output file:
docs/collaboration/relay-agent-context.md

Important:
This file must be factual and based on the current repo.
Do not invent features.
Do not describe planned work as implemented.
Do not assume routes, APIs, services, tabs, or database behaviour exist unless confirmed in the repo.
Clearly separate:
Implemented
Partially implemented
Placeholder
Not implemented
Planned next

Do not change product code.
Do not change API logic.
Do not change schema, migrations, seed data, or services.
Do not touch the HTML prototype.
Do not commit anything unless explicitly asked.
This task is documentation only.

Before writing the file:
Inspect the repo carefully.

Run or inspect as needed:

git status
git log --oneline -15
git branch --show-current
git diff --stat
git diff --name-only
find apps/web/src -maxdepth 5 -type f | sort
find packages/db/src -maxdepth 5 -type f | sort
find docs -maxdepth 5 -type f | sort
cat package.json
cat apps/web/package.json
cat README.md
cat docs/implementation/current-state.md if it exists
cat docs/collaboration/working-agreement.md if it exists
cat docs/collaboration/getting-started.md if it exists

Inspect key implementation areas:
apps/web/src/app
apps/web/src/components
apps/web/src/lib
packages/db/src
packages/db/src/services if it exists
packages/db/src/schema if it exists
scripts
docker-compose.yml or compose files if present
mockup folder

If there are uncommitted changes:
Summarise them from git status and git diff --stat.
List changed files.
Explain what appears to have changed.
Do not paste large diffs.
Do not claim uncommitted changes are stable unless verified.

The markdown file must contain the following sections:

1. Purpose of this file
Explain that this file is the source-of-truth context for future AI agent sessions and collaborators.
State that future agents should read this file before planning or coding.
State that if the repo conflicts with this file, the repo wins and this file must be updated.

2. Current project identity
Explain what Testlane is in plain English.
State that it is currently a local-dev QA/test execution prototype/MVP.
State that it is not production-ready.

3. Current branch, commits, and repo state
Include:
Current branch.
Latest commit hash.
Recent relevant commits.
Whether working tree is clean or dirty.
Any uncommitted changes.
Known previous checkpoints:
8f84e3a Complete execution experience workspace.
ae9c068 Add collaborator onboarding docs and refresh README.
Any newer Shaun commits or local changes if present.

4. Tech stack
List confirmed stack only.
Include:
Next.js 15 App Router if confirmed.
pnpm workspace if confirmed.
Drizzle ORM if confirmed.
MySQL 8 if confirmed.
Docker Compose if confirmed.
OpenSearch container if confirmed.
Any tunnel/demo tools only if actually present or used.

5. Repository structure
Explain confirmed directories and their purpose:
apps/web
packages/db
docs
mockup
scripts
Any other relevant folders discovered.

6. Architectural rules
State the rules future agents must follow:
Keep API routes thin.
Keep business logic in packages/db/services.
Do not put database/business logic directly into React components.
Do not add new infrastructure unless required by a ticket.
Do not build unrequested modules.
Prefer vertical slices.
Preserve existing validation.
Avoid over-engineering.
No production/auth assumptions unless implemented.

7. Implemented product areas
List what genuinely works today.
Include routes/pages that work.
For each route, state:
route path
purpose
data source
known limitations

Very important:
Clarify the current demo route.
Clarify whether /runs works.
Clarify whether the visible “Test Cases” tab is the only working tab.
Clarify which nav/sidebar tabs are placeholders.
Clarify what Tom should be shown in a demo.

8. Current /runs or execution workspace behaviour
If /runs exists and works, describe:
run list
run creation
case list
case detail panel
status updates
comments
filters/search
summary cards
RBAC/viewer read-only behaviour
Any recent UI changes made by Shaun

If /runs does not currently work, say that clearly and explain what route does work.

9. Current APIs and services
List only implemented API routes and services confirmed in the repo.
For each API route:
method
path
purpose
validation
service used if known

For services:
name
purpose
major constraints

Include known APIs:
GET /api/health
GET /api/runs
POST /api/runs
GET /api/runs/:runId
POST /api/runs/:runId/cases/:runCaseId/result

Only include additional routes if confirmed.

10. Database and seed state
Summarise confirmed database state:
migrations
schema
seed org/project/users
seed test plans/cases/steps
RBAC roles
ref counters
audit log behaviour
Any changes Shaun made

Do not claim production data or real auth exists.

11. Auth and RBAC reality
Clearly explain:
real auth is not implemented unless it actually is
dev auth mechanism
seed users
roles
what is enforced in services
what is only UI-level

12. Demo/tunnel/access setup
Document current demo access method:
local URL
temporary public URL if active
tool used, such as here.now or cloudflared, if confirmed
commands used
what must stay running
how to stop it
limitations and security warnings

If no tunnel is active, state:
No tunnel currently active.

13. Validation and run commands
Document exact commands:
pnpm install
pnpm docker:up
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm build
pnpm api:validate
pnpm dev:reset

State which commands were actually run in this pass and their result.

14. Known limitations and non-working areas
Use clear categories:

Implemented
Partially implemented
Placeholder
Not implemented

Include:
auth/SSO
dashboard
global search
OpenSearch integration
Test Plans screen
Test Cases library
step-level execution
defects
activity/history UI
production deployment
workers/notifications
sidebar routes

Be brutally clear. This is to prevent hallucination.

15. GitHub delivery state
Include:
Repo URL: https://github.com/qhedroid/testlane
Project board: Testlane v0.1 Execution Readiness
Current issues:
REL-001 Manual UX audit of /runs — issue #1
REL-002 Resolve duplicate result controls — issue #2
REL-003 Improve loading, empty, and error states — issue #3
REL-004 Confirm RBAC/viewer mode UX — issue #4
REL-005 Add README and collaborator setup guide — issue #5, closed
REL-006 Add v0.1 readiness checklist — issue #6
REL-007 Tag execution checkpoint — issue #7

Mention that new work should map to a REL issue.

16. Agent operating instructions
Add explicit instructions for future Cursor/ChatGPT sessions:
Read this file first.
Check git status before changes.
Do not assume missing features exist.
Do not broaden scope beyond the selected issue.
Before coding, identify files to inspect.
After coding, run validation where relevant.
Summarise changed files.
Do not commit unless requested.
Keep UK English in docs.
If uncertain, inspect the repo instead of guessing.

17. Recommended next build sequence
State the next practical order:
stabilise demo access if Tom still needs it
REL-001 manual UX audit
REL-002 duplicate result controls if confirmed as a UX problem
REL-003 loading/empty/error states
REL-004 viewer mode polish
REL-006 readiness checklist
REL-007 stable tag

18. Copy-paste prompt for future agents
Include this prompt at the end:

“You are working on Testlane. First read docs/collaboration/relay-agent-context.md and treat it as the current source-of-truth unless the repo contradicts it. Then inspect the selected REL issue and the relevant files before planning. Do not assume unimplemented modules exist. Keep the work ticket-led, narrow, and repo-grounded. Preserve thin API routes and service-layer business logic. Do not commit unless asked.”

19. Final human summary
Add a short plain-English summary:
What currently works.
What is demoable.
What is not built.
What needs attention next.

Tone:
Use UK English.
Be direct and practical.
Avoid corporate bloat.
Avoid marketing language.
Be honest about rough edges.

After creating the file:
Show:
git status
files changed
short summary of what was added
whether any product files changed
whether validation was run
whether anything needs committing

Do not commit.