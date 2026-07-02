# Relay — Design Review & Wireframe Brief (for Claude Design, Fable 5)

## What Relay is

Relay is a CTMS/Testiny-style QA test management tool — test cases, test plans, test runs/execution, requirements, and defects, built around internal Trial Interactive-style workflows. Current build is a frontend-only prototype (Next.js + React), demo data in localStorage, live at **https://relay-qa.netlify.app**. It is not a generic TestRail clone — the audience is QA/test management users in a clinical-trials-adjacent workflow.

## What to do

1. The attached screenshot folder (from a live-site audit) covers every distinct screen/state and should be your primary visual reference — no need to re-capture pages it already shows. Only use the web capture tool on **https://relay-qa.netlify.app** yourself if something's missing from the screenshots, or you want real computed styles (fonts, spacing, colour values) for the design-system opinion requested below.
2. Reference the attached `TI-TMT MVP Tracker 2.xlsx` (updated 2026-07-02 from a live-site audit — Status column reflects what's actually built, not aspirational) for full feature inventory and what's genuinely finished vs. rough vs. missing.
3. Give a candid design/UX critique first — don't jump straight to a redesign. Then produce wireframes (start with Wireframe fidelity, not High Fidelity) for the areas flagged weak below.

## Current state, from the live audit + manual verification pass (updated 2026-07-02 — this reflects the final tracker, not the first automated pass)

**Solid and mostly complete:** Test Planning (9/9 complete), Test Execution (7/8), Test Case Management (9/13), Project Management (4/5), Defect Management (4/5). Treat their existing patterns (three-pane layout, folder/query organization) as the established visual language, not as things to casually discard.

**Better than a prior tracker version gave credit for:** Requirements Management (2/5 Completed, 1 In Progress) — a stale tracker once marked this whole area "Not Started"; requirement creation/linking genuinely works. Still worth wireframing the gaps (coverage tracking, traceability, external sync remain Not Started).

**Genuinely weak, worth design attention — this list grew after manual re-verification, not shrank:**
- **Reporting & Analytics** — zero rows fully "Completed" after the manual pass (5 In Progress, 3 Not Started out of 8). This is the single roughest area in the whole product right now, more than the first automated audit suggested.
- **Test Case Organization** — also downgraded on manual review: 0/7 Completed, 5 Not Started. Folder/subfolder management, move/copy, and cross-project movement all need a real look.
- **Export & Reporting** — no row fully "Completed"; where export buttons exist in the UI, clicking them does not produce a file (confirmed dead UI, not just an unbuilt feature). This is the kind of thing that erodes trust in a demo — flag it explicitly.
- **Re-Run Management** — 0/4, all Not Started. A "duplicate run" exists but there's no real failed/blocked-only re-run flow.
- **Login & User Access** — no real authentication; only a demo actor switcher under `/admin/users`. Any redesign of onboarding/login should assume this will eventually become real auth, but treat it as out of scope for wireframing unless you think the demo-switcher pattern itself needs a UX pass.
- **User & Role Management** — also came down on manual review, from "fully complete" to half (2/4); "User removal" specifically was found not to work.
- **Test case ordering** — no visible drag handles or reorder affordance found on `/DP/testcases`, despite an earlier tracker version marking it Completed. Worth a design opinion on whether ordering should be explicit and visible.

## Constraints — please respect these, or call out explicitly if you think they should change

- The three-pane execution workspace (run list · case list · case detail) on Test Runs is the one piece of UX the team has explicitly protected from casual rework during engineering — if your review suggests changing it, say so as a distinct recommendation, don't fold it into a general refresh.
- Admin routes (`/admin/*`) are a separate, global (non-project-scoped) area — keep that separation legible in any redesign, don't merge it into the per-project navigation.
- This is a frontend-only MVP; backend/auth is real but not yet wired to the UI. Wireframes can gesture at future real-data states, but shouldn't assume real-time collaboration, notifications, or server push unless flagged as a distinct "future" concept.

## What we want back

1. A written UX critique: what's working, what's confusing, what's inconsistent, independent of the feature-completeness data.
2. Wireframes for: Reporting & Analytics (currently the roughest area — dashboard, historical/trend views), Export & Reporting (a real, credible export flow), Re-Run Management, and a second look at Test Case Organization (folder/subfolder/move-copy) and ordering.
3. A broader design-system opinion if you see one worth having (typography, spacing, colour use across the existing `prototype-*.css` per-module stylesheets) — the current app has no shared design system, each module was styled independently.
4. Flag anything else that stood out during the live walkthrough that isn't captured in the tracker.

Attach: `TI-TMT MVP Tracker 2.xlsx` (updated), the audit screenshot folder, and this brief.
