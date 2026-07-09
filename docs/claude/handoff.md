# Claude Session Handoff

> Read this at the start of every new Claude (Cowork) session on this project.
> Update this file at the end of any session where meaningful work was done.

---

## Claude's role (read this first)
Claude is a **planning and prompt-drafting assistant**. It does not implement changes to project source files.

- Feature work → draft a Cursor agent prompt in `docs/cursor-prompts/`, then hand it to the user to run in Cursor.
- The only files Claude writes freely are `docs/claude/**` and `docs/cursor-prompts/**`.
- All actual code/config changes are made by Cursor agents working from those prompts.
- If explicitly asked to make a specific file change, that's the exception — not the default.

---

## Active branch
`mvp-visual-overhaul` — full-app Compass (TransPerfect) UI reskin. **Phase 1 (tasks 01–06) and Phase 2 (tasks 07–13) both complete.** Schema stays v14. **Ready for PR** — see `docs/cursor-prompts/mvp-visual-overhaul/pr-description-mvp-visual-overhaul.md` for the combined Phase 1 + Phase 2 MR description.

Previously: `mvp-dashboard-metrics` — all work committed (`5544fc0`, `1352efe`, `323ce6f`); ready for PR description / review before merge to `mvp-main`.

---

## This session — `mvp-visual-overhaul` (Compass reskin) — prompts drafted 2026-07-08 🎨

Goal: apply the approved **Compass (TransPerfect)** visual system to the whole app as a **pure re-skin** — no behaviour / route / schema / data change. This precedes functional work; the team reworks/restores functionality on later branches. Ideally no functionality is lost — Cursor "re-skins" what already exists.

**Design context:** the approved look was designed and signed off in a Claude Design mockup (built screen-by-screen from the live app). A self-contained reference build now lives at **`mockup/Relay Compass Reskin Mockup.html`** (opens in a browser, no build) — it is the **visual** source of truth for the reskin. The app stays the **structural** source of truth (layouts don't change).

**Prompts at `docs/cursor-prompts/mvp-visual-overhaul/`** — hand Cursor `_kickoff.md` first, then hand
it each numbered task file **one at a time, as its own Cursor session**; run everything inside a
given task file (including its internal Parts, where present) continuously, with no stopping for
confirmation. Originally split into 8 finer-grained tasks purely to manage Cursor's token budget per
session; consolidated to 6 after real usage data from other branches showed comfortable headroom at
this coarser size (Shaun: no more stop-and-ask between tasks — see 2026-07-08 follow-up below).

| Task | Scope | Primary files |
|------|-------|---------------|
| `_kickoff.md` | Branch framing: golden rules (zero behaviour change), protected Runs UX, icon policy, task sequence, out-of-scope | — |
| task-01 | Part A: Compass token & primitive foundation — the linchpin (~70% of the reskin cascades from here). Part B: app shell — sidebar + top bar | `fresh.css` `:root` + shared classes, fonts, `FreshShell`, `FreshTopbar`, `ProjectSwitcher`, `ModuleSwitcher` |
| task-02 | Part A: Dashboard. Part B: remaining screens — Defects, Audit, per-project Settings, modals, placeholders | `DashboardScreen`, `RunDonut`, `RunStatusInfographic`, `DefectsScreen`, `AuditScreen`, `SettingsScreen`, `*Modal`, `PlaceholderScreen`, `fresh.css` |
| task-03 | Test Cases | `CasesScreen`, `fresh.css` |
| task-04 | Test Runs — **protected three-pane UX; visual-only** | `RunsScreen`, `TestRunsTopbar`, `prototype-runs.css` |
| task-05 | Test Plans | `PlansScreen`, `prototype-plans.css` |
| task-06 | Admin / Project Settings (keep `/admin/*` a separate global area), plus the branch's final regression sweep + PR description | `admin.css`, `admin/**` |

Schema unchanged (**v14**) — this branch is CSS / classNames / fonts only.

**2026-07-08 follow-up (task consolidation):** Shaun flagged that Cursor had not been hitting token
limits in practice (measured on other branches: 5 combined tasks on one screen ≈ 51% usage; a single
task on a ~1,300-line screen ≈ 45% usage) and asked for the 8 original tasks to be bundled into as
few as possible without risking the ceiling, plus explicit "run continuously, don't stop for
confirmation" language throughout. Sized each original task by the line count of the files it
touches (`CasesScreen.tsx` 2,014 lines; `RunsScreen.tsx`+`prototype-runs.css` ~2,650; `PlansScreen.tsx`+`prototype-plans.css`
~2,060; the admin area ~3,000 across 16 files — each already comparable to the measured 45% data
point on its own) and kept those four screens solo; merged only the lighter foundation/shell/
dashboard/remaining-screens tasks. Result: 8 tasks → 6, detailed in the table above. The former
task-02 checkpoint ("stop after shell + Dashboard") is removed — there's no cross-task checkpoint
now, since each task file is its own Cursor session and its own review point. The final
regression-sweep + PR-description step (previously the end of the old task-08) moved to the end of
the new task-06 (Admin), since that's now the last task to run.

**2026-07-08 actuals (calibrating the sizing model as tasks run):** measured Cursor usage per session
so far — task-01 (foundation + shell, ~1,150 lines across 7 files, 2 original tasks merged) 46%;
task-02 (Dashboard + remaining screens, ~2,250 lines across 14 files, 2 original tasks merged) 41%;
task-03 + task-05 run together in one session as an explicit experiment (Test Cases + Test Plans,
~4,074 lines combined — the two largest of the four remaining solo-sized tasks) 41%. All three
sessions land in a tight 41–46% band regardless of file count or line volume, which is a stronger
signal than line-count sizing alone predicted: usage looks dominated by fixed per-session overhead
(reading `_kickoff.md`, `pnpm build`/`pnpm dev`, the smoke-test sweep) rather than scaling with
content size within this range. Decision: bundle the two remaining tasks — task-04 (Test Runs,
protected UX) and task-06 (Admin, plus the branch's final regression sweep + PR description) — into
one final combined session too, run back-to-back the same way (no new merged file; Cursor is just
pointed at both existing task files in one prompt, same pattern as the task-03+05 session). One
caveat worth keeping in mind regardless of the token-budget headroom: task-04 is the branch's one
protected-UX screen, so its own "protected-UX regression (critical)" verification step should still
get the same careful attention it would if run alone — token safety margin doesn't reduce the
behavioural-regression risk on that screen.

**Key decisions baked into the prompts:**
- **Pure re-skin, zero behaviour change** is the branch's golden rule. The Test Runs three-pane execution UX and `/runs/api` are flagged protected (visual-only).
- **Icons stay** — the fresh app keeps Tabler (`ti ti-*`), admin keeps Lucide; no library swap (~180 `ti` sites). Material-glyph parity is a possible future `mvp-icon-migration`, out of scope here.
- **Reskin via tokens, not rewrites** — retarget the ~15 `:root` vars in `fresh.css` + polish the shared classes (`.btn`/`.panel`/`.tbl`/`.chip`/`.pill`/`.sb*`/`.topbar`…); most screens reskin themselves.
- One deliberate status-colour change to match the mockup: **Blocked → amber** (`#E4AF03`, text `#8C6A00`). **Skipped stays the app's existing purple** (`#4527A0`) — explicitly *not* changed to gray (the mockup was updated to match this).
- **Gotham SSm** display font: prompts tell Cursor to drop the licensed web files into `apps/web/public/fonts/`, else fall back to Open Sans (documented substitute) — no random substitute.
- **Two icon systems + per-module CSS confirmed:** `fresh.css` (`:root` tokens + most screens), `admin.css`, `prototype-runs.css` (the live `.runs-v12` three-pane workspace), `prototype-plans.css`; `globals.css` is an empty reset. This is why the token retarget in task-01 is so leveraged.

`docs/product/design-system.md` rewritten during task-01 with the Compass token set.

QA evidence for this branch lands at `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` (per task).

---

## Completed work — `mvp-visual-overhaul` (task-01) ✅

**Schema:** unchanged (v14). CSS, font loading, and presentational shell markup only.

| Part | What it delivered |
|------|-------------------|
| Part A | Compass `:root` tokens in `fresh.css`; light-mode pin; shared primitives (`.btn`, `.panel`, `.tbl`, `.pill`, `.chip`, `.prog`, status dots, result buttons); Open Sans via `next/font/google`; Gotham `@font-face` declared (files not yet in repo — Open Sans fallback active) |
| Part B | Sidebar reskin (216px, white-chip active state, 68px collapsed rail); top bar reskin (56px, project switcher, ⌘K search, module switcher chrome); `FreshShell`, `FreshTopbar`, `ProjectSwitcher` presentational updates |

**Deliberate palette notes:** Blocked → Compass amber (`#E4AF03` / text `#8C6A00`). Skipped stays purple `#4527A0`.

**Next:** task-04 (Test Runs) — done; task-06 (Admin) — done. Phase 1 complete; see "2026-07-08 Phase 2" below for what's next on this branch.

---

## Completed work — `mvp-visual-overhaul` (task-04) ✅

**Schema:** unchanged (v14). Presentational CSS only — protected UX untouched.

| What it delivered |
|-------------------|
| Test Runs reskin — `prototype-runs.css` token polish: result buttons (blocked dark-on-amber), Compass keycaps, pane/case/tab/step radii, popover shadows; scoped `.runs-v12` active-case accent-lt + left accent |
| Protected UX verified unchanged (Playwright): auto-advance, P/F/B/S + arrow keys, detail open/close, status filter, `/runs/api` untouched |

**Next:** task-06 (Admin) — done; see task-06 section below.

---

## Completed work — `mvp-visual-overhaul` (task-06) ✅

**Schema:** unchanged (v14). Presentational CSS only.

| What it delivered |
|-------------------|
| Admin reskin — sidebar white-chip active (matches main shell), Compass form chrome (34px inputs, focus rings), table/badge/card/modal tokens, toggles → `--pass`, selected rows → `--accent-lt` |
| Branch wrap-up: full 19-route regression sweep PASS; PR description at `docs/cursor-prompts/mvp-visual-overhaul/pr-description-mvp-visual-overhaul.md` |

**Branch status:** `mvp-visual-overhaul` Phase 1 (tasks 01–06) complete and committed. **Not opening a PR yet** — see "2026-07-08 Phase 2" below.

---

## 2026-07-08 Phase 2 — Compass IA/layout overhaul (kept on this branch)

Shaun reviewed the Phase 1 (pure-reskin) result and requested a much larger follow-on pass: adopt more of the mockup directly rather than just its colours/type. This is explicitly **not** a pure re-skin anymore — it includes new screens, sidebar/topbar structural changes, and rebuilding several screens from the mockup. Deliberately kept on `mvp-visual-overhaul` rather than split into a new branch (Shaun's call, weighed against the recommendation to branch since this breaks the Phase 1 charter's "zero behaviour change / no new screens" rules).

**Decisions locked in:**
- Continue on `mvp-visual-overhaul`, no new branch. Phase 1's "branch complete" status and PR description are superseded until Phase 2 also lands.
- Sidebar's current "Pinned Modules" section (eTMF Module, API Gateway, Add shortcut) — not in the mockup at all — is **removed**, not kept.
- Login page is a **reachable route only** (`/login` or similar), not a gate on app load — no change to how the app is entered today, just an additional static page matching the mockup 1:1.
- Font: Gotham SSm licensed woff2/woff files were found already embedded (base64) inside `mockup/Relay Compass Reskin Mockup.html` itself (real Hoefler & Co. files, TransPerfect-supplied, per the mockup's own header comment) — extracted directly into `apps/web/public/fonts/gotham-ssm/`, `fresh.css` `@font-face` rules updated with woff fallback, stale TODO removed, `design-system.md` updated. No more Open-Sans-fallback caveat.

**Critical risk flagged for the task prompts (read before drafting task-07+):** several of Shaun's per-screen asks say "abandon ours completely" / "implement as-is from the mockup" (Dashboard, Defects, Audit, Test Plans). The mockup's own content is static demo data. Confirmed by reading the code:
- `DashboardScreen.tsx` computes every widget live from `FreshProvider` (the `mvp-dashboard-metrics` work) — **must not** be replaced with the mockup's hardcoded numbers ("342 test cases" etc.); adopt its layout/component structure only, re-wire to the same live data.
- `DefectsScreen.tsx` reads `activeDefects` from `useFresh()` (real local defects), merged with a static mock list — same rule: layout from mockup, real data underneath.
- `AuditScreen.tsx` is already static (`AUDIT_EVENTS` from `data/seed`), so swapping to the mockup's own static demo audit rows is low-risk.
- Test Plans/Test Cases already compute live from `FreshProvider`; Shaun's own notes for those are more surgical/hybrid already, lower risk of this trap.

This must be a standing rule in every relevant task-07+ prompt: **mockup markup + real app data, never mockup's static numbers wholesale.**

**Mockup research findings (from decoding `mockup/Relay Compass Reskin Mockup.html`'s self-contained bundle):**
- Sidebar nav order/labels (mockup uses sentence case, e.g. "Test cases" — Shaun wants Title Case, an intentional deviation, not a copy-mockup-verbatim item): Dashboard, My work, [Testing] Test cases/Test plans/Test runs, Milestones, [Traceability] Requirements/Defects/Reports/Audit history, AI Studio. No Integrations entry (confirms removal).
- Global top bar (search, New test case, New test run, AI Studio, Notifications, Help) renders once outside any per-screen conditional — confirms it's safe to freeze it identically across screens; each screen keeps its own local page-head for screen-specific actions.
- "Project settings" in the mockup is a single sidebar item (bottom cluster, near collapse) opening one page with an embedded admin-subnav panel — different from the app's real behaviour of swapping the whole global sidebar into an admin nav. Shaun wants to keep the app's real swap-sidebar behaviour, only restyle the content per the mockup.
- Test Runs mockup includes the actual Pass/Fail/Blocked/Skip buttons and P/F/B/S/↑↓/? keyboard-shortcut legend — structurally close to the protected three-pane workspace, lower risk than initially assumed, but Cursor must still wire mockup markup onto real handlers and run the full protected-UX regression check.
- Test Cases mockup's case list has real underlying mock data with titles/steps/owners — it just needs to be viewed in an actual browser (not read as raw markup) to see populated rows; no separate written spec needed.
- My Work / Milestones / Requirements / Reports / AI Studio are all genuinely new but, like the rest of this mock app, are static/demo-only underneath (AI Studio's "Generate" flow has no real backend call) — safe to build as visual-only shells with hardcoded mock content, consistent with the app's existing frontend-only/demo-data pattern.

**Task-07…13 drafted** at `docs/cursor-prompts/mvp-visual-overhaul/` (7 Cursor sessions, confirmed with Shaun before drafting): task-07 shell (sidebar/topbar/route stubs) → task-08 six new screens (Login, My Work, Milestones, Requirements, Reports, AI Studio) → task-09 Dashboard → task-10 Test Cases (hybrid) → task-11 Test Plans → task-12 Test Runs (protected) → task-13 Defects+Audit+Project Settings (bundled) + branch-wide final wrap-up. `_kickoff.md` §9 has the full Phase 2 ruleset (supersedes several Phase 1 rules — read before task-07).

**2026-07-08 Phase 2 actuals (calibration in progress):** task-07 (shell, solo) **~48%**; task-08 (six new screens, bundled) **~55%**; task-09 (Dashboard rebuild, real data wiring, solo) **~50%**; task-10 (Test Cases hybrid — toolbar relocation + pane restyle, solo) **~54%**; task-11 (Test Plans — full layout rebuild, `resolvePlanCases()`/query logic preserved, solo) **~47%**; task-12 (Test Runs, protected UX, solo) **~61%** — a real outlier, above every prior point including task-08's bundled 55%, breaking the "solo tasks stay in a 47–54% band" read from five points in.

**2026-07-09 concern re: task-12's protected-UX sign-off.** The task-12 prompt required an explicit "protected UX behaviour verified unchanged" note in the QA report (mirroring Phase 1 task-04, whose handoff entry explicitly listed "Protected UX verified unchanged (Playwright): auto-advance, P/F/B/S + arrow keys, detail open/close, status filter, `/runs/api` untouched"). Task-12's own handoff entry only says "QA: build PASS; `/DP/testruns` + core regression routes PASS" — no explicit mention of the P/F/B/S/auto-advance/keyboard-shortcut checks actually being run, despite the task file marking this "critical, run this in full." Given usage hit the highest number recorded (61%), this is exactly the token-thin scenario the standing instruction was written for (prioritize the regression check over visual polish if usage runs high) — the gap in documentation doesn't confirm the check was skipped, but it doesn't confirm it was run either. Claude spot-checked the code diff: the `keydown` listener and its surrounding logic in `RunsScreen.tsx` show no removed/altered lines in the task-12 diff, which is a good sign at the code level, but this is not a substitute for Shaun (or a Cursor session) actually exercising Pass/Fail/Blocked/Skip + arrow-key navigation + auto-advance on `/DP/testruns` and checking `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` for the explicit sign-off line. **Recommend verifying this before treating task-12 as fully done**, independent of what happens with task-13.

**Resolved 2026-07-09:** Shaun manually verified task-12's protected UX on `/DP/testruns` himself (P/F/B/S, auto-advance, arrow keys) and confirmed it's fine. Task-12 treated as fully done.

**2026-07-09 task-13 sizing concern.** task-13 as currently scoped is not just 3 screens — it also carries the *entire* branch final wrap-up: a full regression sweep across every route touched in both phases (~13 routes + all `/admin/*` sub-pages), a re-confirmation of protected Test Runs UX "one more time," a full PR description rewrite covering both phases, and the final `handoff.md` branch-complete update. Phase 1's equivalent (task-06) bundled "Admin reskin + 19-route regression sweep + PR description" as its own **solo** task. Stacking task-13's 3 screens *in front of* that same scale of wrap-up work, right after task-12 (solo) already spiked to 61%, is a real risk of the session running token-thin exactly when the final regression sweep and PR description need full attention. **Decided 2026-07-09:** Shaun opted to run task-13 as-is, bundled (3 screens + full wrap-up, one session) — a deliberate, informed call given the sizing concern above, not an oversight. If this session reports high usage or the final regression sweep / PR description look rushed, that's the first place to check.

**Result:** task-13 landed at **~54%** — back within the solo band, not a repeat of task-12's spike, despite carrying 3 screens plus the full branch wrap-up. Bundling didn't cost as much here as feared. **Full Phase 2 calibration set (all 7 tasks):** 48, 55, 50, 54, 47, 61, 54 — one clear outlier (task-12, 61%, the protected/most structurally complex screen), everything else in a 47–55% band regardless of solo vs. bundled. Takeaway for any future Phase 3-style work on this app: budget ~50–55% per session as the norm, treat screens with heavy behavioural/keyboard complexity (not just visual complexity) as the real risk factor for spikes, not bundle size or line count alone.

**Claude review of task-13 (2026-07-09):** commit `ffb0411` checked out clean — Defects preserves live `activeDefects` + `MOCK_DEFECTS` merge (no data-trap regression), Audit keeps its page header and filter tabs as instructed, admin polish touched only `admin.css`/`SettingsScreen.tsx` styling with no RBAC/CRUD changes. Fixed one loose end in `pr-description-mvp-visual-overhaul.md`: the task-13 commit entry had a `(pending commit — task-13)` placeholder instead of a linked SHA (written before the commit existed) — updated to link `ffb0411`.

**Gap found and being fixed:** `docs/product/user-guide.md` and `docs/product/feature-flow.md` were last updated at task-08 (new screens/routes) and **not touched by task-07, 09, 10, 11, 12, or 13** — despite `CLAUDE.md`'s mandatory living-docs rule ("update both when changing user-visible behaviour, routes, ... or module flow"), which should have applied to task-07's nav/sidebar restructuring and every task-09–13 screen rebuild. Root cause: several Phase 2 task files (07, 09–13) never included a "Documentation" section instructing Cursor to update these files — a gap in the task prompts as drafted, not a Cursor execution slip. Confirmed specific drift by reading both files in full: `user-guide.md`'s `## Settings` section still describes the old settings-preview page (now a pure `/admin` redirect since task-07); its Dashboard section doesn't mention the task-09 rebuild (KPI strip, completion donut, results-over-time chart, assignee bars, milestones slice); neither file mentions the new always-on global top bar cluster (task-07) or the Test Cases toolbar relocation (task-10); `feature-flow.md`'s Settings feature-status row and manual-test-checklist item are inconsistent with its own already-updated routes table (which does correctly show the redirect). The routes table, persistence model, schema notes, RBAC section, and dependency diagram in `feature-flow.md` are otherwise already accurate as of task-08 — this is a targeted-fix gap, not a full rewrite.

**Decided 2026-07-09:** Shaun opted to fix before PR. Drafted `docs/cursor-prompts/mvp-visual-overhaul/task-14-living-docs-sync.md` (docs-only, no `apps/**` changes) — **done**; see task-14 section below.

**Unflagged finding from reviewing task-14's diff (2026-07-09):** task-14's honest checklist rewrite surfaced that task-09's Dashboard rebuild dropped real interactive behaviour that existed before Phase 2 — the *Critical* filter chip (runs-with-failures filter) and the expandable run-card pattern (Overview/Assignees/Defects tabs per card) were replaced by the mockup's flatter static "Open test runs" list. Confirmed in code: `DashboardScreen.tsx` still has a dead `Critical: 'crit'` constant (line 30) with no remaining reference anywhere else in the file — the filter UI/logic is gone, just an orphaned leftover. The completion donut's hover-tooltip interactivity (`interactive` prop) was preserved, so it's not a total loss of interactivity, just those two specific pieces. This was never called out as a judgement call in task-09's own handoff entry or QA notes, unlike Dashboard's other flagged decisions (milestones static placeholder, reduced-fidelity trend fallback, discarded page header) — it surfaced only because task-14's checklist had to be honest about what's actually on the screen now. Given Shaun's brief for Dashboard was "abandon ours completely, implement as-is from the mockup," this may well be an accepted consequence of that instruction rather than a mistake — but it wasn't a **confirmed** decision the way the other Dashboard tradeoffs were. Flagged to Shaun 2026-07-09; not yet resolved.

### Completed work — `mvp-visual-overhaul` (task-07) ✅

**Schema:** unchanged (v14). Sidebar/topbar structure, route stubs, global topbar actions.

| What it delivered |
|-------------------|
| Sidebar reskin — mockup nav order/grouping (Dashboard, My Work, Testing, Traceability); Title Case labels; Tabler icons for new items; removed Pinned Modules + Integrations; single "Project Settings" → `/admin` (sidebar swap preserved); sizing bump (13px/14px padding, 14.5px/500 font, 21px icons) |
| Top bar — global cluster in `FreshTopbar` (New test case, New test run, AI Studio, Notifications, Help); wired to `openCreateCase` / global `CreateRunModal` via `useFreshUI`; `actions` prop retained for not-yet-migrated screens |
| Route stubs — `/mywork`, `/milestones`, `/requirements`, `/aistudio`, `/login` placeholder pages; `MODULE_SLUGS` extended |
| **Judgment call (flag for Shaun):** `/[projectKey]/settings` now redirects to `/admin` — per-project `SettingsScreen` orphaned from sidebar but route won't 404 |

**Claude review of the redirect call:** checked for other references to the orphaned route/`settings` slug — only hits are `project-routes.ts`'s own `MODULE_SLUGS`/`LEGACY_PATH_TO_MODULE` tables (the file this task already edits) and a static `prototype-contracts.ts` docs-only entry (no live routing). Nothing else links to `/[projectKey]/settings`, and `page.tsx` is a clean `redirect('/admin')` — implementation matches spec, no correction needed unless Shaun wants the orphaned `SettingsScreen.tsx` component deleted outright rather than left unreachable.

### Completed work — `mvp-visual-overhaul` (task-08) ✅

**Schema:** unchanged (v14). Six new static/demo screen components + route wiring.

| What it delivered |
|-------------------|
| **Login** — `LoginScreen` at `/:key/login`; fixed full-bleed layout; Sign In / SSO → dashboard; not an auth gate |
| **My Work** — KPI strip, test queue, defects panel (`MyWorkScreen`) |
| **Milestones** — milestone cards with linked runs (`MilestonesScreen`) |
| **Requirements** — read-only list view; uses live `activeRequirements` when populated, else static `REQ-*` demo list |
| **Reports** — report-type chips + Run Summary static dashboard (`ReportsScreen`) |
| **AI Studio** — prompt, quick actions, draft preview (`AiStudioScreen`); `--tp-purple` token added |
| Route pages updated; shared screen CSS in `fresh.css` (`.page-head`, `.kpi-strip`, `.screen-row`, etc.) |

**QA:** `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` — build PASS; all six routes HTTP 200; core regression routes PASS.

**Next:** task-13 (Defects + Audit + Project Settings bundled) + branch wrap-up — **done**; see task-13 section below. Branch ready for PR.

---

## Completed work — `mvp-visual-overhaul` (task-13) ✅ — branch complete

**Schema:** unchanged (v14). Defects + Audit layout rebuilds; admin visual polish; branch wrap-up.

| What it delivered |
|-------------------|
| **Defects** — mockup `.gl-table` toolbar ("All defects" + shown count + status chips + Details toggle), shared `.tbl` table with assignee avatars, right detail panel; live `activeDefects` + `MOCK_DEFECTS` preserved; search + severity filter retained |
| **Audit History** — mockup event-row styling (30px circular icon chips, 13px descriptions, ref links); **page header kept**; filter tabs unchanged; Export CSV button presentational |
| **Admin / Project Settings** — `admin.css` polish: section cards, 240px/1fr form rows with dividers, tighter page title, table/card refinements; no RBAC/CRUD changes |
| **Branch wrap-up** — full regression sweep (tasks 01–13 routes); PR description revised for both phases; QA report at `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` |

**Judgement calls flagged in QA:**
- Defects page header discarded (consistent with Dashboard/TC/TP/TR) — easy to reverse
- Requirements data-source fallback (live vs static) documented in PR Caveats

**QA:** build PASS; 24/24 production-build route checks PASS; task-13 does not touch Test Runs execution code (Shaun verified protected UX after task-12).

**Branch status:** `mvp-visual-overhaul` Phase 1 + Phase 2 **complete**. Ready for PR to `mvp-main`.

---

## Completed work — `mvp-visual-overhaul` (task-14) ✅ — docs-only follow-up

**Schema:** unchanged (v14). No `apps/**` changes.

| What it delivered |
|-------------------|
| **`user-guide.md`** — synced to Phase 2: Navigation section (sidebar groups, global top bar); Dashboard rewrite; Test Cases toolbar relocation; Test Runs page-head; Defects/Audit task-13 layout; Settings redirect; removed stale settings-preview / Pinned Modules references |
| **`feature-flow.md`** — feature status table, shell nav notes, Dashboard/Test cases/Test runs/Defects/Settings/Audit checklists updated |

**Usage:** ~42% (docs-only session).

**Branch status:** unchanged — ready for PR after commit.

---

## Completed work — `mvp-visual-overhaul` (task-12) ✅

**Schema:** unchanged (v14). Layout/visual rebuild from mockup; protected execution UX handlers and keyboard bindings unchanged.

| What it delivered |
|-------------------|
| **Shell** — `FreshTopbar` for global nav; local `page-head` ("Test runs" title + subline) with `TestRunsTopbar` seal/edit/report/more actions moved out of shared top bar |
| **Queue pane** — `.panel` rounded container; run picker, summary (donut kept at `DONUT_CHART_SIZE` 122), Team/Defects/Details tabs, search/add bar, filter tabs, `ec-fold` grouped case list |
| **Exec detail pane** — `.panel` container; mockup-style header nav, tab strip, result footer with icon buttons + keyboard shortcut legend |
| **CSS** — Phase 2 block in `prototype-runs.css` (workspace layout, pane chrome, fold rows, underline filter tabs, result bar) |

**QA:** `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` — build PASS; `/DP/testruns` + core regression routes PASS.

**Next:** task-13 (Defects + Audit + Project Settings bundled) + branch wrap-up.

---

## Completed work — `mvp-visual-overhaul` (task-11) ✅

**Schema:** unchanged (v14). Layout/visual rebuild; all `resolvePlanCases()` and query-resolution logic unchanged.

| What it delivered |
|-------------------|
| **Plan list pane** — rounded panel, `pl-cpill` count badge, `pl-item` rows with mockup id/title/meta typography, selected-row inset accent bar; resizable pane unchanged |
| **Plan detail header** — 18px display title, inline meta line, `btn-sm`/`btn-neutral` action cluster, icon maximize button |
| **Tabs** — `pl-dtabs` strip replacing `nav-tab-bar`; Test cases tab shows live resolved-case count badge |
| **Overview** — three-column `pl-ov-card` metric tiles; horizontal coverage donut; open-run card shows TR-key + run name; live "Linked runs" count added |
| **Run history** — `pl-gl-table` with toolbar header; segmented result bars + hover `RunStatusInfographic` tooltip unchanged |
| **Query builder** — `pl-qg-card` cards, `pl-tagp` folder/source chips, restyled condition selects; add/remove/resolve behaviour unchanged |
| **Resolved cases** — `pl-gl-table` with priority pills and source chips; live data from `resolvePlanCases()` |
| **Page header** — not added (mockup `page-head` discarded per Shaun's ask) |
| **CSS** — full Phase 2 rewrite of `prototype-plans.css` |

**QA:** `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` — build PASS; `/DP/plans` + core regression routes PASS; Playwright screenshots captured.

**Next:** task-13 (Defects + Audit + Project Settings bundled) + branch wrap-up.

---

## Completed work — `mvp-visual-overhaul` (task-10) ✅

**Schema:** unchanged (v14). Layout/visual hybrid rebuild per-pane; no behaviour or data changes.

| What it delivered |
|-------------------|
| **Folder tree pane** — Compass `.panel`-style rounded container; "Folders" header with icon add button; styled filter input; tree rows with chevron + folder icon + count pill (`.st-ct`); existing expand/collapse, create/rename, quick-create behaviour unchanged |
| **Case list pane** — rounded `.tc-main` card; new `.tc-toolbar` with folder title + action buttons moved from `FreshTopbar` (Create test run ▾, Import, Quick create, New case, contextual Details when one row selected); status chips + filter + search row beneath toolbar |
| **Detail panel** — rounded-card container (`.dp.open` border + radius) matching `.panel` treatment elsewhere; tabs, resize, maximize, close behaviour unchanged |
| **Page header** — not added (mockup `page-head` discarded per Shaun's ask) |
| **CSS** — `.btn-ghost`, `.btn-sm`, Phase 2 `.tc-lay`/`.suite-tree`/`.st-*`/`.tc-toolbar`/`.dp` updates in `fresh.css` |

**Toolbar relocation note:** Create test run / Import / Quick create / New case were previously in `FreshTopbar`'s `actions` prop — moved to the case list pane `.tc-toolbar` per task-10 / task-07 pattern.

**QA:** `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` — build PASS; `/DP/testcases` + core regression routes PASS.

**Next:** task-11 (Test Plans rebuild) — **done**; see task-11 section above.

**Note for task-13:** remove unused `FreshTopbar` `actions` prop once all screens stop passing screen-specific topbar actions.

---

## Completed work — `mvp-visual-overhaul` (task-09) ✅

**Schema:** unchanged (v14). Dashboard layout rebuild; new selectors only (no mutations).

| What it delivered |
|-------------------|
| **Dashboard** — full mockup layout rebuild: KPI strip (6 tiles), completion donut + legend, results-over-time SVG chart (7d/30d/90d chips), results-by-assignee bars, open-runs list (click-through to run), milestones slice (static placeholder → `/milestones`), needs-attention panel (unlinked failures from live data) |
| **Coverage by folder** — folded into Completion panel as "Lowest coverage by folder" (live data from active runs) |
| **Selectors** — `computeDashboardKpis`, time series, pass trend, assignee bars, open runs, unlinked failures, coverage rows in `project-selectors.ts` |
| **CSS** — `.dash-*` grid/panel/chart classes in `fresh.css` |
| Dropped mockup "Hey Shaun" page head per Shaun's ask |

**Reduced-fidelity fallbacks (seed data has no `executionLog` / `testedAt` on initial executions):**
- Weekly Passed/Failed deltas show "As of today" until user records results in-session
- Pass-trend sparkline and results-over-time chart show current snapshot as flat lines (labelled in UI)
- After in-session execution changes, `executionLog` timestamps drive real deltas/trends

**QA:** `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` — build PASS; `/DP/dashboard` + core regression routes PASS.

**Next:** task-11 (Test Plans rebuild) — **done**; see task-11 section above.

**Schema:** unchanged (v14). Presentational CSS / className only.

| What it delivered |
|-------------------|
| Test Cases reskin — toolbar search chrome (`.tc-search-*`), bulk bar accent tint, folder tree active rows without left-border, detail panel title/display type, step number chips, quick-create/folder inputs with Compass focus rings, empty-state display font; sparkline/status dot tokens in `CasesScreen` |

**Next:** task-05 (Test Plans).

---

## Completed work — `mvp-visual-overhaul` (task-05) ✅

**Schema:** unchanged (v14). Presentational CSS / colour constants only.

| What it delivered |
|-------------------|
| Test Plans reskin — plan list pane (white surface, accent-lt selected row), detail header/tabs, overview cards (Compass radii/display type), query-group builder cards/badges/chips/inputs, run history + resolved tables aligned to `.tbl` look, `RunResultBar` status tokens, coverage donut `notrunColor` → `var(--border2)` |

**Next:** task-06 (Admin + branch wrap-up).

---

## Completed work — `mvp-visual-overhaul` (task-02) ✅

**Schema:** unchanged (v14). Presentational CSS / className / donut colour constants only.

| Part | What it delivered |
|------|-------------------|
| Part A | Dashboard reskin — metric cards (Compass radii/type/accent stripes), donut status colours in `RunDonut`/`RunStatusInfographic`, active run card hover shadow, needs-attention stripes, coverage bar tokens; `DashboardScreen` Export → `.btn-neutral`, metric value colours → CSS vars |
| Part B | Defects/Audit/Settings/placeholder CSS polish; modal backdrop + dialog Compass shadow/radius; `.inp` form chrome; source banners → Compass warning/accent/gray tints; audit seal icon → gray |

**Next:** task-03 (Test Cases) — done; see task-03 section above.

---

## Completed work — `mvp-dashboard-metrics` (tasks 01–04, committed `5544fc0`) ✅

Rebuilt `DashboardScreen.tsx` to compute all dashboard widgets from `FreshProvider` state instead of static `seed.ts` mocks:

| Task | What it delivered |
|------|-------------------|
| task-01 | Real metric cards + active runs column; dropped stalled/due/environment mock fields; Critical filter = runs with failures |
| task-02 | Needs-attention panel from unlinked failures; empty state; capped list + footer |
| task-03 | Coverage-by-root-folder panel; unfiled cases row; overall % matches Run Coverage card |
| task-04 | Removed `projectHasDemoDashboard` gate; all projects get dashboard; zero-cases onboarding empty state |

Schema unchanged (v14). Removed `projectHasDemoDashboard()` from `demo-project-utils.ts`. QA evidence: `/tmp/relay-qa-mvp-dashboard-metrics/qa-report.md`.

**Follow-up (separate branch):** Verify Test Plans Overview tab metrics on `PlansScreen.tsx` reflect live data end-to-end — not part of this branch.

### Post-commit bug fix — task-05 ✅ (committed `323ce6f`)

Fixed dashboard run-card donuts to match RunsScreen/PlansScreen behavior:

1. **Skipped segment** — `runToCard()` passes `skipped` separately from `notrun`; expanded Overview progress bar/text row include `.pg-s` skipped segment when count > 0.
2. **Hover tooltips** — `RunStatusInfographic` in active run cards now passes `interactive` for wedge hover tooltips (`{count} ({pct}%) {label}`).

Schema unchanged (v14). QA evidence appended to `/tmp/relay-qa-mvp-dashboard-metrics/qa-report.md`.

---

## Previous active branch
`mvp-main` — clean baseline before dashboard metrics work.

---

## Schema version
**Current: v14**

| Version | What changed | Migration |
|---------|-------------|-----------|
| v14 | Local **Requirement** and **Defect** entities; `requirementsById`, `defectsById`, `Case.requirementIds`, `nextRequirementNumByProject`, `nextDefectNumByProject`; REQ/DEF keys; case requirements create/link; run defects create/link (Failed/Blocked); view-only cross-tabs | v13→v14 seeds empty collections + `requirementIds: []` on cases |
| v13 | Test Plans — `TestPlan`, `TestQuery`, `QueryCondition`, `plansById`, `nextPlanNumByProject`, `resolvePlanCases()`, seed plans | v12→v13 |
| v12 | User/role access MVP | v11→v12 via `migrateUserAccessV12` |

---

## Completed work (merged via PR #16, `mvp-test-plans` → `mvp-main`)

### Test Plans screen polish — task-03 implemented ✅

`docs/cursor-prompts/mvp-test-plans/task-03-plans-screen-polish.md` — 5 feedback items on `PlansScreen.tsx`, scoped to `PlansScreen.tsx`, `prototype-plans.css`, and `demo-model.ts`:

1. Unfiled cases in Folder Query — `resolvePlanCases()` handles `'__unfiled__'` sentinel; `FolderQueryBody` picker + chip label
2. Hover donut popup on run history `.pl-run-bar` (mirrors `RunsScreen.tsx` case-id tooltip pattern)
3. Test case coverage card replaced with `<RunDonut>` (pass = resolvedCases, notrun = uncovered)
4. Plan detail maximize/minimize (mirrors `CasesScreen.tsx`; reuses `.dp-max-btn` from `fresh.css`)
5. Collapsible plan list sidebar (32px collapsed width)

Schema unchanged (v14). QA evidence: `/tmp/relay-qa-mvp-test-plans/qa-report.md`.

### Test Plans screen follow-up — task-3b implemented ✅ (renamed from task-04)

`docs/cursor-prompts/mvp-test-plans/task-3b-plans-screen-followup.md` — 3 feedback items:

1. Coverage donut uncovered wedge uses `#555556` via new `notrunColor` prop on `RunDonut`
2. Plan list sidebar resizable (replaces task-03 collapse); wired `useResizablePanes` `'plan-list'` to `.pl-list-pane`
3. Run history hover popup uses `RunStatusInfographic` with delayed hide timer and `pointer-events: auto`

Schema unchanged (v14). QA evidence: `/tmp/relay-qa-mvp-test-plans/qa-report.md`.

### Run history hover tooltip fixes — task-3c implemented ✅

`docs/cursor-prompts/mvp-test-plans/task-3c-run-history-tooltip.md` — 2 feedback items, `PlansScreen.tsx` only:

1. Increased hover tooltip size 15% (`RunStatusInfographic` `size` 80 → 92) to fix status list bottom cropping
2. Repositioned tooltip to mouse cursor (`e.clientX/clientY + 6`) instead of cell bounding rect

Schema unchanged (v14). QA evidence: `/tmp/relay-qa-mvp-test-plans/qa-report.md`.

---

## Completed work (previous branch — mvp-requirements-defects-slice)

### Requirements & Defects frontend slice ✅ (uncommitted)

| Area | What it delivered |
|------|------------------|
| Data model | `Requirement`, `Defect` types; schema v14; migration; selectors |
| FreshProvider | `createRequirement`, `linkRequirementToCase`, `createDefectFromExecution`, `linkDefectToExecution` |
| Test Cases | Requirements tab: create/link/view; Defects tab: view-only from run links |
| Test Runs | Requirements tab: view-only from case; Defects tab: create/link when Failed/Blocked + unsealed |
| Defects module | Merges local `DEF-*` with static mock list |
| Docs | user-guide, feature-flow, AS_BUILT_SNAPSHOT, DOMAIN_MODEL, FRONTEND_CONTRACTS |

---

## Known limitations (this slice)

- No dedicated Requirements module screen
- No requirement coverage dashboards or traceability matrix
- No external Jira/integration sync
- Admin audit log does not record project-level requirement/defect activity (admin Settings/Data area only)
- Legacy seed `TI-*` strings on executions remain as display-only external refs
- Defects module: create button still disabled; no full CRUD

---

## Planned work — full backlog moved to `docs/claude/roadmap.md`

Shaun dictated a full roadmap this session (Next Steps / Improvements / Lesser Improvements). It now lives in `docs/claude/roadmap.md` with status tags per item — treat that as the source of truth for "what's next," not this file. A live Testiny instance was also browsed for reference (via Claude in Chrome); full findings are in `docs/claude/testiny-recon-notes.md`, including an "open verification items" list of things that need specific data/access to check.

Current state in brief:

- **`mvp-visual-overhaul`** `[~in progress]` — Phase 1 (tasks 01–06, pure re-skin) `[x]` complete, schema stays v14, QA at `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`, PR description drafted but superseded. Phase 2 (IA/layout overhaul, kept on this branch) started 2026-07-08 — see "2026-07-08 Phase 2" section above.
- **`mvp-custom-fields`** `[~in progress]` — three real task prompts drafted at `docs/cursor-prompts/mvp-custom-fields/` (task-01 field type parity, task-02 Owner mandatory field, task-03 per-field project assignment). Not yet run in Cursor. Would bump schema v14 → v15 (task-01) and possibly further (see each prompt).
- **`mvp-dashboard-metrics`** `[x]` — implemented (tasks 01–04); see "Completed work" above. Ready for commit/PR after QA review.
- **`mvp-requirements-defects`** `[~draft]` — provisional notes only, at `docs/cursor-prompts/mvp-requirements-defects/draft-notes.md`. Includes an open question from Shaun (case/run detachment behavior) he wants to verify further before it's acted on.
- Everything else (User Management, Role Management, Test Cases/Plans/Runs Extra items, live demo project, remaining Lesser Improvements) — light `[~draft]` provisional notes now exist per item under `docs/cursor-prompts/mvp-<area>/draft-notes.md` (see `roadmap.md` for the exact pointer per item), consolidating this session's findings without committing to full task prompts, per Shaun's own "batch at the end of MVP" plan for this tier.

This session's planning work (this file, `roadmap.md`, `testiny-recon-notes.md`, and the two branches' prompt/draft folders) was committed on a dedicated `mvp-further-planning` branch and has since been merged into `mvp-main`.

### Execution order and approach (decided, not yet started)

1. **`mvp-dashboard-metrics` first** — no schema risk (all 4 tasks say "no schema change expected"), single-file-cohesive scope (`DashboardScreen.tsx`), no dependency on Custom Fields. Good candidate to validate the batched-execution approach before trusting it with a schema-migration-heavy branch.
2. **`mvp-custom-fields` second** — once the batching approach is validated. Bumps schema twice across its 3 tasks; higher blast radius (7 files vs. effectively 1 for Dashboard Metrics).
3. **Keep them as two separate branches/PRs**, not one combined branch — each independently revertible.
4. **Hand Cursor one kickoff message per branch** referencing all of that branch's numbered task files in `docs/cursor-prompts/<branch>/` and instructing it to run continuously through them (each task's own Verification section still gets run, but no stopping to ask for confirmation between tasks unless there's a genuine blocker) — rather than pasting each task prompt one at a time. Cursor's own `.cursor/rules/*.mdc` already covers the frontend-only-phase/smoke-test conventions, so the kickoff message doesn't need to repeat them.
5. **For `mvp-custom-fields` specifically**, add one checkpoint: pause and report after task-01 (the first schema bump + rendering fixes) before continuing into task-02/03, given the two-migration risk. `mvp-dashboard-metrics` can run fully autonomous end-to-end.
6. Cursor's Plan Mode (evidence of prior use in this repo: `.cursor/plans/test_runs_audit_f7170fbe.plan.md`) is a more resumable alternative to one long chat message, if preferred — it tracks progress against a todo list in a file rather than only in the chat.

> **Sequencing note (2026-07-08):** `mvp-visual-overhaul` is a self-contained, schema-free visual branch. It can land independently of the above; if it runs alongside `mvp-custom-fields`, expect merge conflicts in `fresh.css`/`admin.css` (both touch styling) and in `AdminCustomFieldsPageContent.tsx` — sequence or rebase accordingly.

---

## QA evidence

See `/tmp/relay-qa-mvp-requirements-defects-slice/qa-report.md` after smoke test.
`mvp-visual-overhaul` QA lands at `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` (per task).

---

## Gotchas

- Workspace folder `Relay-shaun-local` is a zip wrapper; **git repo root** is `Relay/` subdirectory.
- Canonical localStorage key: `relay-demo-v2`
- Defect create/link gated on execution status **Failed** or **Blocked** only
