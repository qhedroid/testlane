# Task 01 — Apply the Compass (TransPerfect) design system across the FRESH UI

**Branch:** `design-system-compass` (cut from `mvp-final-close-out` — do NOT mix this restyle into that branch; its functional review by Noel/Shaun must stay untangled from visual changes).

**Why:** the MVP close-out was built against the greyscale wireframes' structure only; the intended visual direction — TransPerfect's **Compass** design system — never reached that brief. The authoritative design assets now live in this repo:

- `docs/design-system/compass/colors_and_type.css` — token source of truth (`--tp-*` brand colours, `--gl-gray-*` scale, `--tp-font-*` stacks)
- `docs/design-system/compass/styles.css`, `README.md`, `_ds_manifest.json` — system docs/rules
- `docs/design-system/compass/fonts/` — Gotham SSm (woff/woff2), Poppins, Montserrat (ttf)
- `docs/design-system/Relay Wireframes - Compass.dc.html` — the Compass-styled wireframe render; **this is the visual target**

## Scope — restyle only, zero behaviour change

1. **Fonts.** Copy needed font files to `apps/web/public/fonts/` and add `@font-face` rules (or use `next/font/local`) in the app layout. Per Compass: **Poppins** for UI body/display (Montserrat fallback), keep a monospace stack for keys/ids. Gotham SSm is the master-brand font and is **commercially licensed** — confirm with Noel before shipping it to a public deploy; Poppins/Montserrat (OFL) are safe defaults for product UI.
2. **Token bridge in `fresh.css`.** The whole app hangs off `:root` variables (`--accent`, `--bg`, `--surface`, `--surface2`, `--border`, `--text`, `--text2`, `--text3`, `--pass`, `--fail`, `--block`, `--skip`, `--accent-lt`, `--mono`, status `*-bg` variants). Import/define the Compass palette and **remap the existing variables** to it rather than renaming variables app-wide, e.g. `--accent: var(--tp-light-blue-100)`, dark headings/nav `--tp-dark-blue-100`, greys from `--gl-gray-*` (bg 100, borders 250, text 700/500/400). Keep semantic status colours accessible (pass/fail/block may stay near current hues unless the Compass render shows otherwise — match the render).
3. **Sweep the per-module stylesheets** (`fresh.css`, `prototype-runs.css`, `prototype-plans.css`, `prototype-reports.css`, `admin.css`) for hardcoded hex values that bypass the variables (`#2E7D32`, `#C62828`, `#E65100`, `#1565C0`, chart palettes in `ReportsScreen.tsx`/`RunDonut.tsx`, etc.) and route them through tokens.
4. **Typography pass** per `colors_and_type.css`: font sizes/weights/letter-spacing for headings, section labels, table headers — compare each core screen against `Relay Wireframes - Compass.dc.html` side by side.
5. **Do not** change layout, spacing structure, component markup semantics, routes, state, or behaviour. RunsScreen execution UX and `/runs/api` untouched (colour/type inherit via tokens only).

## Acceptance

- Every core route (`/DP/dashboard`, `/DP/testcases`, `/DP/testruns/tr/00001`, `/DP/plans`, `/DP/reports`, `/DP/mywork`, `/DP/settings`, `/admin/users`) visually reads as Compass: Poppins type, TP blue accent, gl-gray neutrals — matching the Compass wireframe render's feel.
- No functional diffs: `pnpm build` clean; no TSX logic changes beyond colour constants; localStorage schema untouched (v22).
- Standard smoke test per `CLAUDE.md` (build, dev, browser pass, QA report under `/tmp/relay-qa-design-system-compass/`), docs update (`design-system.md` in docs/product should point at Compass as the source), commit-per-logical-step, **no push without Noel's approval**.

## Notes

- Adherence lint config exists at `docs/design-system/compass/_adherence.oxlintrc.json` — optional, don't add it to CI in this task.
- The audit screenshots that accompanied the design review were deliberately not committed (size); the Compass render is the reference.
