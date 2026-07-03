# Design system — Relay

Relay's product UI follows the **Compass** design system (TransPerfect TechOps / GlobalLink). Authoritative tokens and assets live in the repo under `docs/design-system/compass/`.

## Source of truth

| Asset | Path |
|---|---|
| Colour & type tokens | `docs/design-system/compass/colors_and_type.css` |
| System README | `docs/design-system/compass/README.md` |
| Fonts (OFL) | `docs/design-system/compass/fonts/` — Poppins, Montserrat |
| Visual target | `docs/design-system/Relay Wireframes - Compass.dc.html` |

**Shipped in the app:** Poppins + Montserrat via `apps/web/public/fonts/` and `apps/web/src/fresh/styles/compass-base.css`. Gotham SSm is **not** bundled in the web app (commercial licence — confirm with Noel before any public deploy).

## Implementation bridge

The FRESH UI does not rename its legacy CSS variables app-wide. Instead, `apps/web/src/fresh/styles/fresh.css` remaps them onto Compass tokens:

| Relay variable | Compass source | Use |
|---|---|---|
| `--accent` | `--gl-blue-500` (`#1976D2`) | Buttons, links, CTAs, focus |
| `--accent-lt` | `--gl-blue-100` | Selected states, highlights |
| `--navy`, `--sidebar-bg` | `--tp-dark-blue-100` (`#003B71`) | Sidebar, mark chrome |
| `--bg` | `--gl-gray-100` | Workspace background |
| `--surface` | `--gl-white` | Cards, panels |
| `--border` | `--gl-gray-250` | Dividers, inputs |
| `--text` / `--text2` / `--text3` | `--gl-gray-700` / `500` / `400` | Primary / secondary / muted text |
| `--pass` / `--fail` / `--block` / `--skip` | `--gl-success-500` / `--gl-danger-500` / `--gl-orange-500` / `--gl-purple-500` | Execution status |
| `--sans` | Poppins → Montserrat stack | Body UI |
| `--display` | Poppins → Montserrat stack | Headings, metric values |
| `--mono` | System monospace stack | IDs, counts, timestamps |

SVG/chart code paths that cannot use CSS variables import hex mirrors from `apps/web/src/fresh/styles/theme-colors.ts`.

## Brand

**Name:** Relay

**Mark:** Two staggered chevrons with a filled dot (execution data handoff).

## Typography (Compass-aligned)

| Role | Size | Weight | Face |
|---|---|---|---|
| Page title | 14–22px | 600–700 | Poppins (`--display`) |
| Section label | 10–11px | 600–700, uppercase, 0.06–0.08em spacing | Poppins |
| Body | 14px | 400 | Poppins (`--sans`) |
| Table row | 12–12.5px | 400 | Poppins |
| Metadata | 10–11px | 400 | Poppins |
| Monospace | 10–11px | 400–600 | `--mono` |

## Status colours (Compass ramps)

| Status | Text token | Background token |
|---|---|---|
| Pass | `--pass` (`#108718`) | `--pass-bg` |
| Fail | `--fail` (`#C50007`) | `--fail-bg` |
| Blocked | `--block` (`#E8861C`) | `--block-bg` |
| Skip | `--skip` (`#6840CE`) | `--skip-bg` |
| Not run | `--text3` | `--surface2` |
| Active | `--accent` | `--accent-lt` |

## Layout principles

**Operational density.** Internal engineering tool — favour information density.

**Split-pane navigation.** Persistent left list + right detail on major views.

**Resizable panels.** Suite tree and run list panes are drag-resizable.

**Keyboard-first execution.** Test Runs view: P/F/B/S, J/K, D shortcuts (unchanged by restyle).

## Component patterns

**Status pills:** `<span class="pill p-pass">✓ Pass</span>`

**Donut charts:** SVG `stroke-dasharray`, Compass status colours via tokens / `theme-colors.ts`

**Quick Create:** Inline row input in Test Cases (Enter create, Esc close)
