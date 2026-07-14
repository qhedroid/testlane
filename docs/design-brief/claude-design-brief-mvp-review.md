# Testlane — Design Review & Wireframe Brief (for Claude Design, Fable 5)

## What Testlane is

Testlane is a CTMS/Testiny-style QA test management tool — test cases, test plans, test runs/execution, requirements, and defects, built around internal Trial Interactive-style workflows. Current build is a frontend-only prototype (Next.js + React), demo data in localStorage, live at **https://relay-qa.netlify.app**. It is not a generic TestRail clone — the audience is QA/test management users in a clinical-trials-adjacent workflow.

## What to do

1. Use the web capture tool on **https://relay-qa.netlify.app** directly — don't rely only on the attached screenshots, they're a point-in-time sample. Walk through at minimum: `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`, `/DP/defects`, `/DP/settings`, `/admin/users`, `/admin/roles`, `/admin/audit-log`.
2. Reference the attached `TI-TMT MVP Tracker 2.xlsx` (updated 2026-07-02 from a live-site audit — Status column reflects what's actually built, not aspirational) for full feature inventory and what's genuinely finished vs. rough vs. missing.
3. Give a candid design/UX critique first — don't jump straight to a redesign. Then produce wireframes (start with Wireframe fidelity, not High Fidelity) for the areas flagged weak below.

## Current state, from the live audit (verified 2026-07-02, not guessed)

**Solid and mostly complete:** Test Case Management, Test Planning, Project Management, User & Role Management, Test Execution. These carried the highest Completed counts in the audit — treat their existing patterns (three-pane layout, folder/query organization) as the established visual language, not as things to casually discard.

**Further along than expected, worth highlighting positively:** Requirements & Defects. A prior tracker version marked these "Not Started"; the live audit found working requirement creation/linking and a full defects module with create/link from execution — this is more mature than the product's own documentation currently credits it for.

**Genuinely weak, worth design attention:**
- **Export & Reporting** — mostly Not Started, and where export buttons exist in the UI, clicking them does not produce a file (confirmed dead UI, not just an unbuilt feature). This is the kind of thing that erodes trust in a demo — flag it explicitly.
- **Re-Run Management** — Not Started. A "duplicate run" exists but there's no real failed/blocked-only re-run flow.
- **Login & User Access** — no real authentication; only a demo actor switcher under `/admin/users`. Any redesign of onboarding/login should assume this will eventually become real auth, but treat it as out of scope for wireframing unless you think the demo-switcher pattern itself needs a UX pass.
- **Test case ordering** — audited as `?` (uncertain): no visible drag handles or reorder affordance were found on `/DP/testcases`, despite the tracker previously marking it Completed. Worth a design opinion on whether ordering should be explicit and visible.

## Constraints — please respect these, or call out explicitly if you think they should change

- The three-pane execution workspace (run list · case list · case detail) on Test Runs is the one piece of UX the team has explicitly protected from casual rework during engineering — if your review suggests changing it, say so as a distinct recommendation, don't fold it into a general refresh.
- Admin routes (`/admin/*`) are a separate, global (non-project-scoped) area — keep that separation legible in any redesign, don't merge it into the per-project navigation.
- This is a frontend-only MVP; backend/auth is real but not yet wired to the UI. Wireframes can gesture at future real-data states, but shouldn't assume real-time collaboration, notifications, or server push unless flagged as a distinct "future" concept.

## What we want back

1. A written UX critique: what's working, what's confusing, what's inconsistent, independent of the feature-completeness data.
2. Wireframes for: Export & Reporting (a real, credible export flow), Re-Run Management, and a second look at Test Case ordering/organization.
3. A broader design-system opinion if you see one worth having (typography, spacing, colour use across the existing `prototype-*.css` per-module stylesheets) — the current app has no shared design system, each module was styled independently.
4. Flag anything else that stood out during the live walkthrough that isn't captured in the tracker.

Attach: `TI-TMT MVP Tracker 2.xlsx` (updated), the audit screenshot folder, and this brief.
