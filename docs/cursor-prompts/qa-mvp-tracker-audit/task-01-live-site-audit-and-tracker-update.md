# Task 01 — Audit Live Site Against MVP Tracker, Capture Evidence, Update Tracker

## Goal

Audit the **live deployed site** (`https://relay-qa.netlify.app`, currently on `main@0ec18db`) feature-by-feature against `docs/tracker/TI-TMT MVP Tracker 2.xlsx`, capture screenshot/recording evidence for every functional area, and update the tracker's Status column to reflect what is actually observable on the live site — not the local dev build, not the docs, the live site as a user would experience it.

This is an audit task, not a feature-implementation task. Do not fix bugs or build missing features in this task — just observe, record, and report accurately.

Frontend-only, no backend/API/schema changes. No Jira, no Excel outside the one tracker file named below, no commits to `main` or `mvp-main` directly.

---

## Branch setup

1. `git fetch origin` (or confirm local refs are current — this environment may not have live GitHub credentials; if fetch fails, proceed with the most recent local refs and note it in your report).
2. Create branch `qa/mvp-tracker-audit-2026-07-02` from latest `origin/mvp-main`.
3. Confirm the tracker file exists at `docs/tracker/TI-TMT MVP Tracker 2.xlsx` before starting (it was just added — read-only reference for you to update in place).

---

## Step 1 — Read the tracker structure before touching it

Open `docs/tracker/TI-TMT MVP Tracker 2.xlsx`. Facts about its structure, verified directly (do not re-derive, use these):

- Single sheet: `MVP Tracker`. 4 columns: **A** Functional Area, **B** Feature / Requirement, **C** Assignee, **D** Status. 94 rows (1 header + 93 data rows), 21 functional area groups.
- **Column A (Functional Area) is only populated on the first row of each group and blank for the rest of that group** — there are no merged cells, it just looks merged because of a shared dark-blue fill colour. When reading or writing, forward-fill: any feature row with a blank Functional Area belongs to the nearest non-blank Functional Area above it. Do not misattribute rows to the wrong area.
- Status column is colour-coded: red fill = "Not Started", gold fill = "In Progress", green fill = "Completed". These three are the only values currently in use.
- **New status value for this task: `?`** — meaning "checked, but we genuinely can't tell from the live site whether this is present/working." Use this instead of guessing. Give it its own distinct fill colour (grey, e.g. `FFB0B0B0`) so it's visually distinct from the other three. Do not use `?` as a substitute for not checking something — only use it after you've actually looked and still can't determine the answer.
- Column C (Assignee) is currently empty for every row — leave it empty, that's out of scope for this task.
- Add a new **column E, "Evidence"** — for each row, the filename (not full path) of the screenshot or recording that supports your status determination, e.g. `testcases-list.png` or `run-execution-flow.webm`. If one piece of evidence covers multiple rows (common — one screenshot of the Test Cases list screen might confirm several rows at once), reference the same filename across all those rows.

## Step 2 — Route mapping (starting hypothesis — verify, correct if wrong)

These are my best-guess mappings from tracker Functional Areas to live routes, based on the current `AS_BUILT_SNAPSHOT.md` and `feature-flow.md` — verify each against the actual live site rather than trusting this table blindly:

| Functional Area | Likely route(s) on relay-qa.netlify.app |
|---|---|
| Login & User Access | No real login exists (mock/demo actor switcher only) — check `/admin/users` for the actor switcher |
| Project Management | `/DP/dashboard`, project switcher in the shell, `/admin/projects` |
| Test Case Management, Test Case Organization | `/DP/testcases` |
| Test Planning | `/DP/plans` |
| Test Run Management, Test Execution | `/DP/testruns` |
| Re-Run Management | `/DP/testruns` (duplicate-run feature — verify whether this is a true "re-run" or just a duplicate) |
| Requirements Management | `/DP/testcases` (Requirements tab), `/DP/testruns` (Requirements tab) — **there is no dedicated Requirements module route**; check whether that changes this row's status vs. "Not Started" |
| Defect Management | `/DP/defects`, `/DP/testcases` (Defects tab, view-only), `/DP/testruns` (Defects tab, create/link on Failed/Blocked) |
| Reporting & Analytics | `/DP/dashboard`, `/DP/reports` if it exists — verify |
| Export & Reporting | Check for any export/download controls anywhere in the app — may genuinely be "Not Started" |
| User & Role Management | `/admin/users`, `/admin/roles` |
| Search, Filter & Query Management | Filter/search controls within `/DP/testcases`, `/DP/testruns`; dynamic queries in `/DP/plans` |
| Audit History / Versioning | `/admin/audit-log`, `/DP/audit` if it exists |

Core regression routes to hit regardless of tracker mapping: `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`, `/DP/defects`.

## Step 3 — For every one of the 93 feature rows

1. Navigate to the mapped route(s) on the **live** site (not `localhost`).
2. Attempt to actually exercise the feature where it's a discrete action (e.g. for "Duplicate/delete test cases," actually duplicate and delete a test case; for "Run status tracking," actually open a run and observe status). For features that are structural/passive (e.g. "Dashboard reporting"), a clear screenshot is enough.
3. Take a full-page screenshot for every distinct screen/state you visit, saved under the evidence folder (naming convention below). Where a feature involves a multi-step flow (creating something, executing something, linking something), record a short screen recording (WebM) of that flow instead of just a static shot.
4. Determine status:
   - **Completed** — feature works as described, end to end, on the live site.
   - **In Progress** — feature partially exists (e.g. UI present but action disabled, or works for some but not all cases).
   - **Not Started** — no trace of the feature anywhere reachable.
   - **`?`** — you looked, and you genuinely cannot tell (e.g. ambiguous UI, feature might be gated behind a role/state you can't reach as the demo actor).
5. Update the tracker row's Status cell and Evidence cell accordingly. **Do not change status text/colour for rows you did not actually check.**
6. Where your finding contradicts the tracker's current value, or contradicts `docs/_authoritative/AS_BUILT_SNAPSHOT.md` / `docs/product/feature-flow.md`, note it explicitly in your final report (don't silently overwrite without flagging — a few rows, e.g. the Requirements Management section, are already known to be stale in the tracker, so contradictions are expected and useful, not a sign you did something wrong).

## Step 4 — Evidence folder

Create `/tmp/relay-qa-mvp-tracker-audit-2026-07-02/` with:

```
/tmp/relay-qa-mvp-tracker-audit-2026-07-02/
  screenshots/
    <route-or-feature-name>.png   (one per distinct screen/state)
  recordings/
    <flow-name>.webm               (one per multi-step flow, where recording is supported)
  qa-report.md
```

`qa-report.md` should contain, per the existing project convention: a pass/fail-style summary per functional area (not pass/fail exactly here, since this is an audit — use Completed/In Progress/Not Started/? counts), a list of every tracker row you changed and its old → new status, every contradiction found against existing docs, and any row you could not reach/test and why.

If recording isn't supported for a given flow in this environment, screenshots of each step in sequence are an acceptable fallback — say so in the report rather than skipping the row.

## Files that will change

- `docs/tracker/TI-TMT MVP Tracker 2.xlsx` (Status + new Evidence column only — do not alter Functional Area or Feature/Requirement text, do not reorder rows)
- New: everything under `/tmp/relay-qa-mvp-tracker-audit-2026-07-02/`

## Files that will NOT change

- Any app source under `apps/**`, `packages/**`
- `docs/_authoritative/**` (read-only reference for cross-checking, flag contradictions, don't edit)
- Any other tracker/Excel file

---

## Acceptance criteria

1. All 93 feature rows have a status reflecting an actual, live-site check (not carried over unchanged unless genuinely re-confirmed) and an Evidence filename.
2. Every distinct route/screen visited has at least one screenshot; every multi-step flow you actually exercised has a recording or a clearly-labelled screenshot sequence.
3. `qa-report.md` lists every status change and every contradiction against existing docs, with confirmed facts kept separate from anything uncertain (mark uncertain findings `?` in the tracker and say so explicitly in the report, per the project's usual standard of not guessing).
4. No app source, schema, or `docs/_authoritative/**` files touched.
5. Tracker's existing structure (columns A–D, colour convention, row order) preserved; only Status/Evidence values and the new Evidence column header change.

## Documentation

No living-docs updates required for this task (it produces evidence, not a feature) — but if you find a functional area where the live site clearly contradicts `docs/product/feature-flow.md`, list the specific line(s) in your report so Noel can decide whether to correct the doc separately.

## Git commits (Noel / qhedroid)

When Noel approves a commit, **author and committer must be Noel's GitHub account** — not the Cursor sandbox default (`CrimsonDelta`).

**Identity (verify with `gh api user` if unsure):**

| Field | Value |
|---|---|
| Name | `Noel Quadri` |
| Email | `56097048+qhedroid@users.noreply.github.com` |
| GitHub login | `qhedroid` |

**Per commit** — set both author and committer for that invocation only (do **not** run `git config` to persist identity):

```bash
export GIT_AUTHOR_NAME='Noel Quadri'
export GIT_AUTHOR_EMAIL='56097048+qhedroid@users.noreply.github.com'
export GIT_COMMITTER_NAME='Noel Quadri'
export GIT_COMMITTER_EMAIL='56097048+qhedroid@users.noreply.github.com'
git commit ...
```

Or inline:

```bash
GIT_AUTHOR_NAME='Noel Quadri' GIT_AUTHOR_EMAIL='56097048+qhedroid@users.noreply.github.com' \
GIT_COMMITTER_NAME='Noel Quadri' GIT_COMMITTER_EMAIL='56097048+qhedroid@users.noreply.github.com' \
git commit -m "$(cat <<'EOF'
...
EOF
)"
```

**After committing**, confirm alignment:

```bash
git log -1 --format='author=%an <%ae>%ncommitter=%cn <%ce>'
```

If a commit was created with the wrong identity and has **not** been pushed, amend with `--author` and matching `GIT_COMMITTER_*` env vars.

## Final output — report back with

1. Branch name and confirmation it was cut from latest `origin/mvp-main`.
2. Summary table: functional area → old status counts vs. new status counts.
3. Full list of contradictions found (tracker/docs said X, live site shows Y).
4. Any rows marked `?` and why.
5. Path to `/tmp/relay-qa-mvp-tracker-audit-2026-07-02/qa-report.md` and a count of screenshots/recordings captured.
6. Confirmation of what was NOT touched (app source, `_authoritative` docs, other files).
7. Proposed commit message (subject `Docs: audit live site against MVP tracker`, body grouped by file) — do not commit or push until Noel approves.
