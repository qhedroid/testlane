# Task 02 — App shell reskin (sidebar + top bar)

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-01

This is task 2 of 8. It reskins the persistent app shell — the dark sidebar and the top bar — to
match the mockup. The shell is on every screen, so getting it right sets the tone for the whole
app. **This is the checkpoint task: after this, build, screenshot the shell + Dashboard, and report
before continuing to task-03.**

Files touched:
- `apps/web/src/fresh/styles/fresh.css` (the `.sb*`, `.topbar`, `.proj-*`, `.module-*`,
  `.search-trigger`, sidebar-collapse rules)
- `apps/web/src/fresh/components/FreshShell.tsx` (sidebar markup — presentational only)
- `apps/web/src/fresh/components/FreshTopbar.tsx` (top bar markup — presentational only)
- `apps/web/src/fresh/components/ProjectSwitcher.tsx`, `ModuleSwitcher.tsx` (presentational only)

**Structure stays.** The shell is a flexbox (`#app` → `.sb` sidebar + `.main` → `.topbar` + view).
Keep that. Do not convert to grid, do not move the topbar over the sidebar, do not add/remove/
reorder nav items, do not add nav count pills or badges that don't already exist (that's data —
out of scope). Reskin only.

Reference: open `mockup/Relay Compass Reskin Mockup.html` — the shell is identical on every screen.

---

## Background

- **Sidebar** (`FreshShell.tsx` + `.sb*` in `fresh.css`, ~lines 15–40 and the collapse block
  ~lines 300–330): dark sidebar, logo cell at top, grouped nav (`.sb-lbl` section labels + `.sbi`
  items), a spacer, then a footer user card (`.sb-foot`). Collapses to an icon rail. After task-01
  the background is already TP dark blue `#003B71` (via `--sidebar-bg`). This task fixes the item
  states, type sizes, and the active treatment.
- **Top bar** (`FreshTopbar.tsx` + `.topbar`/`.bc`/`.proj-*`/`.module-*`/`.search-trigger`): after
  task-01 it's already 56px tall. This task restyles the project switcher, search trigger, module
  switcher, and action buttons to the mockup.

The signature visual change is the **active nav item**: today it's a translucent-blue fill with a
white left-border and white text; the mockup makes it a **solid white rounded chip with dark-blue
text**, sitting on the dark-blue sidebar.

---

## Part A — sidebar (`fresh.css`)

1. **Sidebar width** (`.sb`, ~line 15): `width:196px → 216px` (roomier, matches mockup). Keep the
   dark bg (from `--sidebar-bg`).
2. **Logo cell** (`.sb-logo`, `.sb-mark`, `.sb-name`, ~lines 16–20 and the override ~line 690):
   keep the mark + wordmark. Wordmark text white; if there's a subtitle (`.sb-name small`) style it
   as 9px uppercase letterspaced at ~55% white. The mark chip: keep it a rounded square; use a
   slightly lighter navy or the accent so the "R" reads on dark blue (the existing `#193c5f`
   override is fine — leave or nudge). Border-bottom of the logo cell: `1px solid rgba(255,255,255,.08)`.
3. **Section labels** (`.sb-lbl`, ~line 19): `font-size:10px`, `font-weight:700`,
   `letter-spacing:.12em`, `text-transform:uppercase`, `color:rgba(255,255,255,.45)`. Keep padding.
4. **Nav items** (`.sbi`, ~line 20): `font-size:12.5px → 14px`; `padding:8px 12px`; `gap:10px`;
   `border-radius:6px`; `margin:1px 8px` (so the active chip has breathing room and rounded corners);
   remove the `border-left` accent. Idle color `#A8C4E0`-ish (keep). Hover:
   `.sbi:hover{ background:rgba(255,255,255,.08); color:#fff; }`.
5. **Active item** (`.sbi.on` and the `a.sbi.on` override ~line 700): change to the white-chip
   treatment — `background:#fff; color:var(--navy); font-weight:600; border-left:0;`. Ensure the
   icon inside (`.sbi.on i`, `.sbi.on .ti`) also becomes `color:var(--navy)` (currently `opacity:1`
   white). Remove any `border-left-color` on the active state.
6. **Icon size** (`.sbi i`, `.sbi .ti`): ~18px, full opacity. (Icons stay Tabler — do not swap.)
7. **Footer user card** (`.sb-foot`, `.sb-av`, `.sb-uname`, `.sb-urole`, ~lines 34–37): keep the
   avatar + name + role layout. Card sits on a subtle top divider `1px rgba(255,255,255,.08)`. Name
   white 12.5px/600; role `#A8C4E0` 10.5px. Avatar keeps `--accent` bg. (Its click = sign out already
   wired — don't touch behaviour.)
8. **Collapse rail** (the `.sb.collapsed …` block, ~lines 300–330): keep the collapse behaviour.
   Bump collapsed width `48px → 68px` for a comfier icon rail (matches mockup). Verify the active
   chip still reads when collapsed (white chip, centered icon in navy). Keep the collapse toggle
   (`.sb-toggle`) styling legible on dark blue.

## Part B — top bar (`fresh.css` + components)

1. **Project switcher** (`.proj-btn`, ~line 500): `height:26px → 36px`; `min-width:200px`
   (mockup ~280px — size to taste but ≥240px); `border-radius:var(--r-s)`; white bg, `1px --border`;
   font 600 13px; a leading folder icon in `--text3` and a right-aligned chevron. Hover:
   `border-color:var(--accent)`. The dropdown (`.proj-dd`) keeps its structure; bump its radius to
   `var(--r-m)` and shadow to the Compass popover shadow (`0 4px 15px rgba(0,0,0,.15)`). Active row
   `.proj-item.active{ background:var(--accent-lt); color:var(--accent); }`.
2. **Search trigger** (`.search-trigger` / `.search-box`, ~line 40 and ~line 300): make it the
   mockup's ⌘K field — `height:36px`; `width:~360px` (flex-grow acceptable); `border-radius:var(--r-s)`;
   `background:var(--surface2)`; `1px --border`; muted placeholder text; a leading search icon and a
   trailing `⌘K` `.kbd`. Hover `border-color:var(--accent); background:#fff`.
3. **Module switcher** (`.module-btn` / `.module-menu`, ~line 560): `height:36px`; `border-radius:var(--r-s)`;
   restyle to match the project switcher's chrome; menu radius `var(--r-m)`, Compass popover shadow;
   active item `.module-item.on{ background:var(--accent-lt); color:var(--accent); }`.
4. **Action buttons** (right cluster): these are `.btn` / `.btn-p` already retargeted in task-01.
   Where the mockup shows a **grey** secondary action ("New test case"), apply the `.btn-neutral`
   class added in task-01; keep the **primary** ("New test run") as `.btn-p`. Only change these
   `className`s if the current button is visually the wrong weight vs. the mockup — do not touch their
   onClick/handlers.
5. **Breadcrumb** (`.bc`, `.bc-link`, ~line 44): keep it; link color `--accent`, current-segment
   `--text` 500. It coexists with the switchers — don't remove it.

## Part C — component TSX (presentational only)

Touch these files **only** for presentational reasons:
- `FreshShell.tsx` — if the active item is computed via a conditional `className`, leave the logic;
  just make sure the active class is `on` (matching the CSS). If the wordmark/subtitle text needs a
  wrapping element to style, add it. Do **not** change nav items, order, hrefs, counts, or the
  collapse toggle logic.
- `FreshTopbar.tsx` / `ProjectSwitcher.tsx` / `ModuleSwitcher.tsx` — add/adjust wrapper elements or
  `className`s needed to hit the mockup (e.g. a `.kbd` span for `⌘K`, a leading icon). No behavioural
  edits (dropdown open/close, project selection, search invocation all stay).

If you find yourself editing anything that isn't className/markup/style, stop — it's out of scope.

---

## Verification

1. `pnpm build`; `pnpm dev`.
2. Sidebar: dark-blue `#003B71`; section labels legible; **active item is a white rounded chip with
   dark-blue text and icon**; hover states work; footer user card looks right; collapse rail (68px)
   works and the active chip still reads collapsed.
3. Top bar: 56px tall; project switcher, ⌘K search, module switcher, and action buttons match the
   mockup's chrome; dropdowns still open/close and select correctly.
4. **Behaviour unchanged:** navigate between every nav item, switch project, open the module
   switcher, open search (⌘K), collapse/expand the sidebar, click the user card (sign-out) — all
   behave exactly as before.
5. Core regression routes all still render (see task-01 list).
6. Capture before/after screenshots of the shell (expanded + collapsed) and the Dashboard for the
   **checkpoint report**. Append to `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`.
7. **Stop here and report** (per kickoff §4) before starting task-03.

## Documentation

- `docs/claude/handoff.md` — mark task-02 done under the `mvp-visual-overhaul` section.
- No other doc changes (shell is presentational; no route/behaviour change).

## Out of scope / do not touch

- Nav structure, items, order, hrefs, counts, badges (data/behaviour).
- AI Studio nav item / purple sparkle (mockup-only feature — not in the app; out of scope).
- Sign-out / project-switch / search / collapse **logic**.
- Any non-shell screen (later tasks), `admin.css` (task-07).
- Icon libraries, data, schema, routes.
