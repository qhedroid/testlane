# Task 01 — Compass token foundation + app shell reskin

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · This is task 1 of 6.

> **Run Part A and Part B below back-to-back in this one session.** Do not stop and ask for
> confirmation between them — run each part's own Verification steps as you finish it, then continue
> straight into the next part. Only stop if you hit a genuine blocker (a build error you can't
> resolve, a missing asset, or a change that turns out not to be presentational).

This batch establishes the Compass design substrate (Part A) and reskins the persistent app shell —
sidebar + top bar — that sits on every screen (Part B). Everything downstream (Dashboard, Test
Cases, Test Runs, Test Plans, Admin, and the remaining screens — tasks 02–06) depends on both parts
being done first, which is why they're bundled into this first batch.

Do **not** touch any screen's TSX beyond what each part lists. If you find yourself editing
`demo-model.ts`, `migrate-demo-state.ts`, `FreshProvider.tsx`, selectors, reducers, routes, or any
data — stop, you are out of scope.

---

# Part A — Compass token & primitive foundation

It is almost entirely `apps/web/src/fresh/styles/fresh.css`, plus font loading. **Do not touch any
screen's TSX in Part A** beyond what is listed. After Part A the whole app will already look
substantially different (colours, type, radii) because nearly everything reads from these tokens —
that is expected and correct.

Files touched:
- `apps/web/src/fresh/styles/fresh.css` (the `:root` block + shared primitive classes)
- `apps/web/src/app/layout.tsx` (font loading — Open Sans + display face)
- `apps/web/public/fonts/**` (drop in the licensed display-font web files — see A.4)
- `docs/product/design-system.md` (replace the token table — see Documentation)

Do **not** touch `admin.css`, `prototype-runs.css`, `prototype-plans.css` here — those inherit the
same `:root` variables and get their structural polish in their own batches (tasks 04–06). Do not
touch any other `.tsx` screen. Do not change class *names*.

## A.0 — Background

`fresh.css` is the master stylesheet. Its `:root` (lines ~2–11) defines ~15 variables that every
screen, and the other three stylesheets, consume:

```css
:root{
  --navy:#042C53;--sidebar-bg:#1f6aac;--accent:#185FA5;--accent-lt:#E6F1FB;--accent-hover:#134F8A;
  --bg:#F0F4F9;--surface:#FFFFFF;--surface2:#F5F8FB;
  --border:#D3DCE8;--border2:#B8C9DA;
  --text:#0F1C2E;--text2:#4A6080;--text3:#7A92AB;
  --pass:#2E7D32;--pass-bg:#E8F5E9;--fail:#C62828;--fail-bg:#FFEBEE;
  --block:#E65100;--block-bg:#FFF3E0;--skip:#4527A0;--skip-bg:#EDE7F6;
  --crit-text:#B71C1C;--high-text:#BF360C;--med-text:#0D47A1;
  --mono:ui-monospace,'Cascadia Code','SF Mono',monospace;
  --sans:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
}
```

Because the whole app is token-driven, **retargeting these variables is 70% of the reskin.** The
remaining 30% is structural polish on the shared classes (radii, heights, fonts) in A.3 and the
per-screen tasks (02–06).

Two latent bugs to fix while here: `.ctx-item`, `.row-ctx-btn`, `.ctx-item-danger` reference
`var(--hover)` and `var(--text1)` (see `fresh.css` ~line 168–176), which are **never defined**.
Add `--hover` and `--text1` in A.1 so context menus stop falling back to `transparent`/inherit.

## A.1 — rewrite the `:root` block

Replace the `:root` block (lines ~2–11) with the following. Keep the **same variable names** (so
every existing `var(--x)` keeps working) — only the values change, plus a few additions at the end.
Values are the exact Compass hex from the design system, using the *pinned light-mode* semantic
values the approved mockup renders.

```css
:root{
  /* Nav / brand (TransPerfect Dark Blue) */
  --navy:#003B71;--navy-hover:#002B53;--sidebar-bg:#003B71;
  /* Interactive (GlobalLink Blue) */
  --accent:#1976D2;--accent-hover:#004FAA;--accent-lt:#ECF5FF;
  /* Surfaces (gl gray ramp) */
  --bg:#F6F7F9;--surface:#FFFFFF;--surface2:#FBFBFC;
  --border:#DBE1E5;--border2:#BAC5CD;
  /* Text */
  --text:#0B1821;--text1:#0B1821;--text2:#324553;--text3:#5C707E;
  --hover:#F6F7F9;
  /* Status — passed / failed / blocked(amber) / skipped(purple, kept from the app) */
  --pass:#108718;--pass-bg:#ECFBEE;--fail:#C50007;--fail-bg:#FFE4E4;
  --block:#E4AF03;--block-bg:#FFF5D4;--block-text:#8C6A00;
  --skip:#4527A0;--skip-bg:#EDE7F6;
  /* Priority text (aligned to status hues) */
  --crit-text:#C50007;--high-text:#8C6A00;--med-text:#004FAA;
  /* Type */
  --mono:ui-monospace,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace;
  --sans:"Open Sans",-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  --display:"Gotham SSm","Open Sans",-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  /* Radii (Compass) */
  --r-s:6px;--r-m:8px;--r-l:10px;--r-pill:100px;
}
```

Notes / deliberate changes to call out in the QA report:
- **Blocked** moves from orange `#E65100` to Compass amber/warning `#E4AF03`. Because amber is light,
  wherever blocked is used as **text/foreground** on a light background you must use `--block-text`
  (`#8C6A00`), and use `--block` only for **fills** (dots, bars, solid buttons). A.3 handles the
  known spots; keep this in mind in later tasks.
- **Skipped stays the app's existing purple `#4527A0`** (on `--skip-bg #EDE7F6`) — do **not** change
  it to gray. This is an explicit exception to "match the mockup": the reference mockup has been
  updated to the same purple, so there is no divergence to reconcile.
- `--surface2` (used for table headers, subtle fills) becomes near-white `#FBFBFC`; the app canvas
  `--bg` becomes `#F6F7F9`.

## A.2 — pin light mode (guard against OS dark mode)

The Compass tokens include a `[data-theme="dark"]` block in the design system, and the app must not
flip with the OS. At the very top of `fresh.css` (right after the `:root` block) add:

```css
:root{ color-scheme: light; }
```

If any `@media (prefers-color-scheme: dark)` rule exists anywhere in `fresh.css` / `globals.css`,
neutralise it (delete or scope it out). The app is light-only for this branch.

## A.3 — polish the shared primitive classes

Retarget the shared classes so their **shape** matches Compass (the colours already follow from
A.1). Edit these rules in `fresh.css` (line numbers approximate). Keep selectors and class names
identical; change only the declarations noted.

1. **Body / type baseline** (`body`, ~line 12): keep `font-family:var(--sans)`; the family now
   resolves to Open Sans. Leave `font-size:13px` (the app's dense baseline) — do **not** bump to the
   mockup's 14px globally, it would reflow every dense table. Add `-webkit-font-smoothing:antialiased`.

2. **Topbar** (`.topbar`, ~line 43): height `38px → 56px`; `padding:0 12px → 0 16px`; keep it white
   with a 1px `--border` bottom. (Part B fills it; here just fix the height so the grid is right.)

3. **Buttons** (`.btn` / `.btn-p`, ~line 49–52): the Compass button is taller and pill-less-but-
   rounded. Set `.btn{ height:32px; padding:0 12px; border-radius:var(--r-s); font:600 12.5px/1 var(--sans); gap:6px; }`
   `.btn:hover{ background:var(--surface2); }` `.btn-p{ background:var(--accent); color:#fff; border-color:var(--accent); }`
   `.btn-p:hover{ background:var(--accent-hover); border-color:var(--accent-hover); }`. Add a neutral
   variant used by the mockup: `.btn-neutral{ background:var(--surface2); border-color:var(--border); color:var(--text2); }`
   (only add the rule; don't go re-classing buttons — later tasks opt in where the mockup shows a
   grey button).

4. **Panels / cards** (`.panel`, ~line 71): `border-radius:5px → var(--r-l)` (10px). Leave border
   `1px var(--border)`, no shadow at rest (Compass cards are flat until hover).

5. **Tables** (`.tbl thead th`, `.tbl tbody tr`, ~line 78–83): header `background:var(--surface2)`,
   keep uppercase 10.5px but set `color:var(--text2)`; row hover `background:var(--surface2)`;
   selected row `.sel{ background:var(--accent-lt); }` (there are two competing `tr.sel` rules at
   ~line 75 and ~line 271 — reconcile both to `var(--accent-lt)`).

6. **Pills / badges** (`.pill` + `.p-*`, ~line 60–66): keep the class names. The mockup's status
   badges are pill-shaped (`border-radius:var(--r-pill)`) with a leading dot. Set
   `.pill{ border-radius:var(--r-pill); padding:2px 8px; font:600 10.5px/16px var(--sans); }`. Ensure
   the blocked pill uses `--block-bg` background with `--block-text` text (not `--block`, which is
   now amber and unreadable as text): `.p-block{ background:var(--block-bg); color:var(--block-text); }`.

7. **Priority tags** (`.pri` + `.pr-*`, ~line 68–70): keep as-is structurally; they already read the
   `--*-text` vars retargeted in A.1. Verify `.pr-med` reads `--accent-lt`/`--med-text`.

8. **Progress bars** (`.prog` + `.pg-*`, ~line 72–75): the `.pg-*` fills are **hardcoded hex**
   (`.pg-p{background:#2E7D32}` …). Re-point them to the tokens: `.pg-p{background:var(--pass)}`
   `.pg-f{background:var(--fail)}` `.pg-b{background:var(--block)}` `.pg-s{background:var(--skip)}`.
   Set the track `.prog{ background:var(--surface2); border:0; height:6px; border-radius:var(--r-pill); }`
   and give it a light gray track (`--border`/gray-200) so segments read.

9. **Chips** (`.chip`, ~line 85): `border-radius:var(--r-pill); padding:4px 10px; font:500 11.5px…`;
   active chip `.chip.on{ background:var(--accent-lt); border-color:var(--accent); color:var(--accent); }`.

10. **Status dots used app-wide** (`.d-p/.d-f/.d-b/.d-n/.d-s`, ~line 138; and `.rst-*`): these are
    hardcoded hex too. Re-point to the tokens (`--pass/--fail/--block/--skip`, not-run `--border2`).

11. **Result buttons** (`.srb-*`, `.rmb-*`, ~line 150–175): re-point their hardcoded backgrounds/
    borders to `--pass/--fail/--block/--skip` and the `-bg` variants. Blocked button uses `--block`
    fill with dark text on hover/active. (Fine-tune the Test Runs execution buttons in task-04; here
    just get them off hardcoded hex and onto tokens so they inherit the new palette.)

Do a repo-wide grep in `fresh.css` for the **old hardcoded status hex** and re-point any survivors to
tokens: `#2E7D32 #C62828 #E65100 #4527A0` (and their `-bg` companions `#E8F5E9 #FFEBEE #FFF3E0
#EDE7F6`). This also catches spots the numbered list above doesn't call out by name (e.g.
`.mt-up`/`.mt-dn`, `.autosave`/`.as-dot`, `.audit-ic.seal`) — re-point every survivor, not just the
listed ones. Leave sidebar-specific hex (`rgba(255,255,255,…)`, `#A8C4E0`, `#5BA3E0`, `#6AADE8`)
alone — Part B handles the sidebar.

## A.4 — fonts

The mockup uses **Gotham SSm** (display, ≥20px headings/numbers) and **Open Sans** (body). Wire both
so `--display` and `--sans` resolve.

1. **Open Sans (body):** load weights 400/500/600/700. Preferred: `next/font/google` in
   `apps/web/src/app/layout.tsx` (`import { Open_Sans } from 'next/font/google'`), or a Google Fonts
   `<link>` in the same file's `<head>`. Ensure it applies globally (the `--sans` stack already lists
   it first).
2. **Gotham SSm (display):** this is a licensed face; the team has the web files (they ship in the
   Compass design-system repo under `fonts/`). Copy the `.woff2`/`.woff` files into
   `apps/web/public/fonts/gotham-ssm/` and declare `@font-face` (weights 400/500/700) at the top of
   `fresh.css`, e.g.:
   ```css
   @font-face{ font-family:"Gotham SSm"; font-weight:700; font-style:normal; font-display:swap;
     src:url("/fonts/gotham-ssm/GothamSSm-Bold.woff2") format("woff2"); }
   /* …400, 500 similarly… */
   ```
   **If you cannot obtain the Gotham SSm files in this session, do not block:** `--display` already
   falls back to Open Sans, which is an acceptable documented substitute. Add a `TODO(display-font)`
   comment next to the `--display` token and note it in the QA report so the team can drop the files
   in. Do **not** substitute a random Google display font.
3. Do not remove or change the Tabler Icons (`ti`) stylesheet or the Lucide imports — icons stay
   (see kickoff §2 rule 6).

## Verification (Part A)

1. `pnpm build`
2. `pnpm dev` (reset dev server first per `.cursor/rules` if `.next` was rebuilt)
3. Load every core regression route and confirm they render with no console errors:
   `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`, `/DP/defects`, `/DP/settings`,
   `/DP/audit`, `/admin/users`, `/admin/roles`, `/admin/audit-log`.
4. Spot-check the new palette is live everywhere: canvas is light gray `#F6F7F9`; primary buttons and
   links are `#1976D2`; passed=green `#108718`, failed=red `#C50007`, blocked=amber `#E4AF03`,
   skipped=purple `#4527A0` (unchanged); panels have 10px radius; headings pick up the display face
   (or Open Sans fallback).
5. Confirm **nothing behavioural changed** — Part A edits CSS + font loading only.
6. Confirm OS dark mode does **not** flip the app (toggle your OS/browser to dark; the app stays light).
7. Capture before/after screenshots of 2–3 representative routes.
8. Start `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` and note the approved semantic change
   **blocked → amber** (skipped is deliberately kept as the app's existing purple, not grayed); and
   whether the Gotham SSm files were embedded or left as the Open Sans fallback TODO.

Then continue straight into Part B — do not stop here.

---

# Part B — App shell reskin (sidebar + top bar)

Depends on: Part A (this file). Reskins the persistent app shell — the dark sidebar and the top bar —
to match the mockup. The shell is on every screen, so getting it right sets the tone for the whole
app.

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

## B.0 — Background

- **Sidebar** (`FreshShell.tsx` + `.sb*` in `fresh.css`, ~lines 15–40 and the collapse block
  ~lines 300–330): dark sidebar, logo cell at top, grouped nav (`.sb-lbl` section labels + `.sbi`
  items), a spacer, then a footer user card (`.sb-foot`). Collapses to an icon rail. After Part A
  the background is already TP dark blue `#003B71` (via `--sidebar-bg`). This part fixes the item
  states, type sizes, and the active treatment.
- **Top bar** (`FreshTopbar.tsx` + `.topbar`/`.bc`/`.proj-*`/`.module-*`/`.search-trigger`): after
  Part A it's already 56px tall. This part restyles the project switcher, search trigger, module
  switcher, and action buttons to the mockup.

The signature visual change is the **active nav item**: today it's a translucent-blue fill with a
white left-border and white text; the mockup makes it a **solid white rounded chip with dark-blue
text**, sitting on the dark-blue sidebar.

## B.1 — sidebar (`fresh.css`)

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

## B.2 — top bar (`fresh.css` + components)

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
4. **Action buttons** (right cluster): these are `.btn` / `.btn-p` already retargeted in Part A.
   Where the mockup shows a **grey** secondary action ("New test case"), apply the `.btn-neutral`
   class added in Part A; keep the **primary** ("New test run") as `.btn-p`. Only change these
   `className`s if the current button is visually the wrong weight vs. the mockup — do not touch their
   onClick/handlers.
5. **Breadcrumb** (`.bc`, `.bc-link`, ~line 44): keep it; link color `--accent`, current-segment
   `--text` 500. It coexists with the switchers — don't remove it.

## B.3 — component TSX (presentational only)

Touch these files **only** for presentational reasons:
- `FreshShell.tsx` — if the active item is computed via a conditional `className`, leave the logic;
  just make sure the active class is `on` (matching the CSS). If the wordmark/subtitle text needs a
  wrapping element to style, add it. Do **not** change nav items, order, hrefs, counts, or the
  collapse toggle logic.
- `FreshTopbar.tsx` / `ProjectSwitcher.tsx` / `ModuleSwitcher.tsx` — add/adjust wrapper elements or
  `className`s needed to hit the mockup (e.g. a `.kbd` span for `⌘K`, a leading icon). No behavioural
  edits (dropdown open/close, project selection, search invocation all stay).

If you find yourself editing anything that isn't className/markup/style, stop — it's out of scope.

## Verification (Part B)

1. `pnpm build`; `pnpm dev`.
2. Sidebar: dark-blue `#003B71`; section labels legible; **active item is a white rounded chip with
   dark-blue text and icon**; hover states work; footer user card looks right; collapse rail (68px)
   works and the active chip still reads collapsed.
3. Top bar: 56px tall; project switcher, ⌘K search, module switcher, and action buttons match the
   mockup's chrome; dropdowns still open/close and select correctly.
4. **Behaviour unchanged:** navigate between every nav item, switch project, open the module
   switcher, open search (⌘K), collapse/expand the sidebar, click the user card (sign-out) — all
   behave exactly as before.
5. Core regression routes all still render (see Part A's list).
6. Capture before/after screenshots of the shell (expanded + collapsed) and the Dashboard. Append to
   `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`.
7. Continue straight into task-02 (Dashboard + Remaining screens) — no need to stop and report.

---

## Documentation (covers both parts)

- **`docs/product/design-system.md`** — replace the "Colour tokens", "Typography", and "Status
  colours" tables with the Compass set adopted in Part A (dark-blue nav `#003B71`, blue interactive
  `#1976D2`, the gray ramp, Gotham SSm / Open Sans, status pass/fail/blocked/skip values). This is
  the canonical place the reskin is documented.
- **`docs/claude/handoff.md`** — start a "Completed work — `mvp-visual-overhaul`" section; note
  schema stays v14 and task-01 (foundation + shell) is done.

## Out of scope / do not touch (both parts)

- Any other `.tsx` screen file (tasks 02–06).
- `admin.css`, `prototype-runs.css`, `prototype-plans.css` (they inherit `:root`; polished in their
  own tasks).
- Icon libraries (Tabler / Lucide stay).
- Nav structure, items, order, hrefs, counts, badges (data/behaviour).
- AI Studio nav item / purple sparkle (mockup-only feature — not in the app; out of scope).
- Sign-out / project-switch / search / collapse **logic**.
- Data, schema, routes, behaviour.
