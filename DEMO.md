# Relay Demo — FRESH Mockup Parity

Demo-ready frontend rebuilt from **`mockup/Relay Mockup FRESH.html`** only. No MySQL/Docker required for the UI walkthrough.

## How to run locally

```bash
cd Relay
pnpm install
pnpm dev
```

Open **http://localhost:3000** — redirects to `/dashboard`.

### Reset demo data

In the browser console:

```javascript
localStorage.removeItem('relay-fresh-cases')
location.reload()
```

This clears user-created test cases added during the demo. Execution results and sealed runs reset on full page reload (in-memory store).

---

## Architecture

| Layer | Path | Notes |
|-------|------|-------|
| **Active UI** | `apps/web/src/fresh/**` | Mockup class names + `fresh.css` |
| **Quarantined** | `apps/web/src/legacy/**` | Prior implementation — not imported |
| **Source of truth** | `mockup/Relay Mockup FRESH.html` | CSS, layout, demo behaviors |

Global styles: only `fresh/styles/fresh.css` (+ empty `globals.css` reset).

---

## Click-through demo script (5–7 min)

1. **Dashboard** — `/dashboard`
   - Review metric cards and sprint subtitle.
   - Expand/collapse a run card; switch Overview / Assignees / Defects tabs.
   - Click a needs-attention item or **New Run** → Test Runs.

2. **Test Cases** — `/cases`
   - Expand **CTMS** suite → click **Import validation** (empty folder state).
   - Use empty-state **Quick create** or toolbar **Quick create** — paste titles, **Add**.
   - Select rows → bulk bar appears.
   - Open a case row → detail panel (Details / History / Activity).
   - **New case** modal → create a case (persisted in `localStorage`).

3. **Test Plans** — `/plans`
   - Select plans in the left list (Active / Draft).
   - Switch tabs: Overview / Included suites / Run history.
   - **Spawn new run from this plan** → `/runs`.

4. **Test Runs** — `/runs`
   - Open run picker → search and switch runs.
   - Filter tabs: All / Not run / Fail / Blocked.
   - Select a failing case → mark step results (P/F/B/S buttons).
   - Footer result buttons or keyboard `P` `F` `B` `S`.
   - `J` / `K` navigate cases; `D` links a defect; `?` opens shortcuts modal.
   - **Seal Run** → immutable banner + disabled controls.

5. **Audit History** — `/audit`
   - Filter chips (static; no backend filter).
   - Scroll audit log entries.

6. **Global**
   - Sidebar collapse toggle.
   - Module switcher in top bar.
   - `⌘K` global search from any screen with search trigger.

---

## Parity Notes

Unavoidable or intentional deviations from `Relay Mockup FRESH.html`:

| Item | Mockup | App | Why |
|------|--------|-----|-----|
| Execution case count | 132 cases on CTMS run | 10 demo execution cases in list | Seed matches mockup `EXEC_CASES` subset; run header totals use `RUN_CARDS` aggregate stats (102/132, etc.) |
| Run list pane (`.rl-pane`) | Visible in HTML | Hidden via CSS (mockup feedback layout) | Matches mockup CSS rule `.rl-pane{display:none}` |
| Audit filter chips | Toggle active chip | Toggle UI only | Mockup has no filter logic — static log |
| Plan list run counts | Some hardcoded labels (e.g. "5 runs") | Derived from `plan.runs.length` | Seed data has fewer runs than mockup labels |
| Import / Edit plan / Clone / Export | Buttons present | No-op / visual only | Mockup demonstrates layout, not full flows |
| Resizers | Drag panes | CSS variables updated on drag | Basic pointer-driven resize; no persistence |
| Sealed run persistence | In-memory in mockup | In-memory per session | Resets on reload unless re-sealed |
| API routes | N/A | `/api/runs/*` still exists | Not wired to fresh UI |

---

## Branding

All UI uses **Relay** branding (sidebar mark + “Relay — QA Workspace”). No BetterTestiny/BT references in the active `fresh/` layer.
