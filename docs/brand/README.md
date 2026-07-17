<div align="center">
  <img src="./readme-banner.png" alt="Testlane — QA test management workspace" width="100%" />
</div>

<div align="center">

![noel-quadri](https://img.shields.io/badge/noel--quadri-apps--tools-0F6E56?style=flat-square&labelColor=0B3D2E)
![build](https://img.shields.io/badge/build-passing-4FB89F?style=flat-square&labelColor=0B3D2E)
![stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Drizzle%20%7C%20MySQL-B5791E?style=flat-square&labelColor=1A1D20)

</div>

## Testlane

A QA test management workspace — test cases, test runs, test plans,
requirements, and defects, woven into one workflow instead of scattered
across a spreadsheet and a bug tracker.

Built as a full-stack, from-scratch project: a Next.js App Router frontend,
a real MySQL/Drizzle backend, role-based access control, and an audited admin
panel. Started as a frontend-only prototype over local storage, then rebuilt
module by module onto a real database and API layer.

---

## What it does

- **Test cases** — organise cases into folders, tag them, track history, and
  link them to requirements they verify.
- **Test runs** — execute a plan against a project, record pass/fail/blocked
  results per case, and see run history at a glance.
- **Test plans** — group cases into a run-ready set for a release or a cycle.
- **Requirements** — create and link requirements to the test cases that
  cover them, so coverage isn't guesswork.
- **Defects** — raise and link a defect straight from a failed or blocked run
  result, with full traceability back to the case and run that caught it.
- **Admin panel** — user and role management, a demo actor switcher, an
  audit log, and project-scoped RBAC enforced at the service layer.

## What's still a work in progress

Built as a portfolio project, so some areas are intentionally further along
than others: reporting, the AI-assisted test authoring studio, and a couple
of secondary screens are further out on the roadmap than the core test
case/run/plan/requirements/defects workflow above, which is real and wired to
the database end to end.

## Tech stack

- **Frontend**: Next.js (App Router), React, Tailwind
- **Backend**: Next.js API routes, Drizzle ORM, MySQL
- **Auth**: NextAuth.js (credentials + JWT sessions)
- **Tooling**: pnpm workspaces, Docker Compose for local MySQL

## Running it locally

```bash
pnpm install
pnpm docker:up      # starts local MySQL
pnpm db:migrate
pnpm db:seed        # seeds a demo project with sample data
pnpm dev
```

Then open `http://localhost:3000` and sign in with any of the seeded demo
accounts (see the seed script output for emails — password is a shared demo
value, not meant for anything beyond local exploration).

## Author

Built by **Noel Quadri** ([@noel-q](https://github.com/noel-q)) —
Solutions Engineer, Cloud & DevOps, London, UK.

[LinkedIn](https://www.linkedin.com/in/noelquadri2001) ·
[GitHub](https://github.com/noel-q)
