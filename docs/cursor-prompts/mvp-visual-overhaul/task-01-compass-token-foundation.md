# Task 01 — Compass token & primitive foundation

Branch: `mvp-visual-overhaul`
Schema: unchanged (v14). No data, no migration, no localStorage.

This is task 1 of 8. It establishes the Compass design substrate that every later task builds on.
It is almost entirely `apps/web/src/fresh/styles/fresh.css`, plus font loading. **Do not touch any
screen's TSX in this task** beyond what is listed. After this task the whole app will already look
substantially different (colours, type, radii) because nearly everything reads from these tokens —
that is expected and correct.

Files touched:
- `apps/web/src/fresh/styles/fresh.css` (the `:root` block + shared primitive classes)
- `apps/web/src/app/layout.tsx` (font loading — Open Sans + display face)
- `apps/web/public/fonts/**` (drop in the licensed display-font web files — see Part D)
- `docs/product/design-system.md` (replace the token table — see Documentation)

Do **not** touch `admin.css`, `prototype-runs.css`, `prototype-plans.css` here — those inherit the
same `:root` variables and get their structural polish in their own tasks. Do not touch any `.tsx`
screen. Do not change class *names*.

---

## Background

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

Because the whole app is token-driven, **retargeting these variables to Compass values is 70% of
the reskin.** The remaining 30% is structural polish on the shared classes (radii, heights, fonts)
in Part C and per-screen tasks.

Two latent bugs to fix while here: `.ctx-item`, `.row-ctx-btn`, `.ctx-item-danger` reference
`var(--hover)` and `var(--text1)` (see `fresh.css` ~line 168–176), which are **never defined**.
Add `--hover` and `--text1` in Part A so context menus stop falling back to `transparent`/inherit.

---

## Part A — rewrite the `:root` block

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
  (`#8C6A00`), and use `--block` only for **fills** (dots, bars, solid buttons). Part C handles the
  known spots; keep this in mind in later tasks.
- **Skipped stays the app's existing purple `#4527A0`** (on `--skip-bg #EDE7F6`) — do **not** change
  it to gray. This is an explicit exception to "match the mockup": the reference mockup has been
  updated to the same purple, so there is no divergence to reconcile.
- `--surface2` (used for table headers, subtle fills) becomes near-white `#FBFBFC`; the app canvas
  `--bg` becomes `#F6F7F9`.

## Part B — pin light mode (guard against OS dark mode)

The Compass tokens include a `[data-theme="dark"]` block in the design system, and the app must not
flip with the OS. At the very top of `fresh.css` (right after the `:root` block) add:

```css
:root{ color-scheme: light; }
```

If any `@media (prefers-color-scheme: dark)` rule exists anywhere in `fresh.css` / `globals.css`,
neutralise it (delete or scope it out). The app is light-only for this branch.

## Part C — polish the shared primitive classes

Retarget the shared classes so their **shape** matches Compass (the colours already follow from Part
A). Edit these rules in `fresh.css` (line numbers approximate). Keep selectors and class names
identical; change only the declarations noted.

1. **Body / type baseline** (`body`, ~line 12): keep `font-family:var(--sans)`; the family now
   resolves to Open Sans. Leave `font-size:13px` (the app's dense baseline) — do **not** bump to the
   mockup's 14px globally, it would reflow every dense table. Add `-webkit-font-smoothing:antialiased`.

2. **Topbar** (`.topbar`, ~line 43): height `38px → 56px`; `padding:0 12px → 0 16px`; keep it white
   with a 1px `--border` bottom. (The shell in task-02 fills it; here just fix the height so the grid
   is right.)

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
   ~line 83 and ~line 300 — reconcile both to `var(--accent-lt)`).

6. **Pills / badges** (`.pill` + `.p-*`, ~line 60–66): keep the class names. The mockup's status
   badges are pill-shaped (`border-radius:var(--r-pill)`) with a leading dot. Set
   `.pill{ border-radius:var(--r-pill); padding:2px 8px; font:600 10.5px/16px var(--sans); }`. Ensure
   the blocked pill uses `--block-bg` background with `--block-text` text (not `--block`, which is
   now amber and unreadable as text): `.p-block{ background:var(--block-bg); color:var(--block-text); }`.

7. **Priority tags** (`.pri` + `.pr-*`, ~line 68–70): keep as-is structurally; they already read the
   `--*-text` vars retargeted in Part A. Verify `.pr-med` reads `--accent-lt`/`--med-text`.

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
    fill with dark text on hover/active. (Fine-tune the Test Runs execution buttons in task-05; here
    just get them off hardcoded hex and onto tokens so they inherit the new palette.)

Do a repo-wide grep in `fresh.css` for the **old hardcoded status hex** and re-point any survivors to
tokens: `#2E7D32 #C62828 #E65100 #4527A0` (and their `-bg` companions `#E8F5E9 #FFEBEE #FFF3E0
#EDE7F6`). Leave sidebar-specific hex (`rgba(255,255,255,…)`, `#A8C4E0`, `#5BA3E0`, `#6AADE8`) alone —
task-02 handles the sidebar.

## Part D — fonts

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

---

## Verification

1. `pnpm build`
2. `pnpm dev` (reset dev server first per `.cursor/rules` if `.next` was rebuilt)
3. Load every core regression route and confirm they render with no console errors:
   `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`, `/DP/defects`, `/DP/settings`,
   `/DP/audit`, `/admin/users`, `/admin/roles`, `/admin/audit-log`.
4. Spot-check the new palette is live everywhere: canvas is light gray `#F6F7F9`; primary buttons and
   links are `#1976D2`; passed=green `#108718`, failed=red `#C50007`, blocked=amber `#E4AF03`,
   skipped=purple `#4527A0` (unchanged); panels have 10px radius; headings pick up the display face (or Open Sans fallback).
5. Confirm **nothing behavioural changed** — this task edits CSS + font loading only.
6. Confirm OS dark mode does **not** flip the app (toggle your OS/browser to dark; the app stays light).
7. Capture before/after screenshots of 2–3 representative routes for the checkpoint report.
8. Write QA notes to `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` (append per task). Explicitly
   note the approved semantic change **blocked → amber** (skipped is deliberately kept as the app's existing purple, not grayed); and whether the
   Gotham SSm files were embedded or left as the Open Sans fallback TODO.

## Documentation

- **`docs/product/design-system.md`** — replace the "Colour tokens", "Typography", and "Status
  colours" tables with the Compass set adopted here (dark-blue nav `#003B71`, blue interactive
  `#1976D2`, the gray ramp, Gotham SSm / Open Sans, status pass/fail/blocked/skip values). This is
  the canonical place the reskin is documented.
- **`docs/claude/handoff.md`** — start a "Completed work — `mvp-visual-overhaul`" section; note
  schema stays v14 and task-01 (token foundation) is done.

## Out of scope / do not touch

- Any `.tsx` screen file (later tasks).
- `admin.css`, `prototype-runs.css`, `prototype-plans.css` (they inherit `:root`; polished in their
  own tasks).
- Icon libraries (Tabler / Lucide stay).
- Sidebar/topbar-specific colours and structure (task-02).
- Data, schema, routes, behaviour.
