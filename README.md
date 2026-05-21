# Relay

**Internal QA test management platform — design and architecture exploration.**

Relay is a purpose-built replacement for TestRail and Testiny, designed for QA teams working across multiple enterprise product modules. This repository contains the interactive prototype, architecture documentation, MVP scope, and proposal materials.

---

## Why Relay exists

Generic test management tools serve every team equally, which means they serve no team particularly well. QA engineers working across CTMS, eTMF, SSO/IAM, Viewer, Reporting, and API Gateway modules spend time translating between a tool's generic mental model and their actual work.

Relay removes that translation layer. Folder structures, test plans, run assignments, and execution flows are organised around real module boundaries. The product is QA-first.

**Problems it addresses directly:**
- No full-text search in Testiny (the most frequently cited pain point)
- TestRail's legacy UI adds unnecessary clicks to every workflow
- Audit logs and SSO paywalled at enterprise tier in both tools
- No API precondition setup before test execution begins
- Seat-based pricing does not suit an internal team

---

## Repository structure

```
relay/
├── README.md
├── LICENSE
├── docs/
│   ├── product-vision.md
│   ├── architecture.md
│   ├── mvp-scope.md
│   ├── design-system.md
│   ├── ux-philosophy.md
│   └── changelog.md
├── mockup/
│   └── index.html              — Interactive prototype (open in browser)
├── presentation/
│   └── proposal-deck.pptx
└── backups/
    └── v1.0/
```

---

## Interactive prototype

Open `mockup/index.html` directly. No build step required.

| View | What it demonstrates |
|---|---|
| Dashboard | Active run cards, pass rate, failures, module coverage |
| Test Cases | Resizable three-panel layout with detail tabs |
| Test Plans | Tabbed detail with Overview / Test Cases / Runs / Metrics |
| Test Runs | Searchable run selector, execution panel with full tab set |
| Global Search | Cmd K palette across cases, runs, and plans |
| Audit History | Append-only event log |

Keyboard shortcuts in Test Runs: `P` Pass · `F` Fail · `B` Blocked · `S` Skip · `D` Defect · `J/K` Navigate · `?` Shortcuts

---

## Architecture

```
Browser → Next.js (App Router, full-stack)
  └── Service layer
        ├── TestCaseService / TestRunService / TestPlanService
        ├── SearchService → AWS OpenSearch (_msearch fan-out)
        └── AuditService  → append-only audit_log table
  └── Drizzle ORM (MySQL adapter) → MySQL on AWS RDS 8.0 / Aurora MySQL
  └── AWS hosting (ECS or App Runner)
```

---

## Stack

| Layer | Decision |
|---|---|
| Frontend / Backend | Next.js (App Router, API routes) |
| Database | MySQL on AWS RDS 8.0 / Aurora MySQL 3.x |
| ORM | Drizzle ORM, MySQL adapter |
| Search | AWS OpenSearch Service |
| Hosting | AWS — required by internal DevOps |
| Auth | In-house (architecture designed, deferred) |
| Storage | AWS S3 (Phase 2) |

---

## MVP scope

1. Test case management — folders, steps, creation, editing, assignment
2. Test runs — create, execute, assign, track, seal (immutable); Admin reopen only
3. Test plans — configure environment, assignees, case selection, spawn runs
4. Dashboard and metrics — pass rate, active runs, failures, coverage
5. Full-text search — Cmd K palette, typo-tolerant, grouped results
6. Audit logs — append-only, built in, not paywalled

---

## Key decisions

- **Execution snapshotting** — results are tied to the case as it existed at run time
- **Run sealing enforced at the API layer** — not just the UI
- **Append-only audit log** — no deletions or updates to event rows
- **MySQL primary, OpenSearch for search, no NoSQL at MVP**

---

## Licence

MIT
