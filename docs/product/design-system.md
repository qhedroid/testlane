# Design system — Relay (Compass reskin)

Relay uses the **Compass (TransPerfect)** visual system. Tokens live in `apps/web/src/fresh/styles/fresh.css` (`:root`). The app is **light-mode only** (`color-scheme: light`).

## Brand

**Name:** Relay (unchanged — product name is not rebranded)

**Mark:** Two staggered chevrons with a filled dot (execution handoff). Sidebar wordmark sits on TransPerfect Dark Blue.

## Colour tokens

| Token | Value | Use |
|---|---|---|
| `--navy` | `#003B71` | Brand / nav text on light surfaces |
| `--navy-hover` | `#002B53` | Nav hover (reserved) |
| `--sidebar-bg` | `#003B71` | Sidebar background |
| `--accent` | `#1976D2` | GlobalLink Blue — links, CTAs, interactive |
| `--accent-hover` | `#004FAA` | Primary button hover |
| `--accent-lt` | `#ECF5FF` | Selected rows, active highlights |
| `--bg` | `#F6F7F9` | App canvas |
| `--surface` | `#FFFFFF` | Cards, panels, top bar |
| `--surface2` | `#FBFBFC` | Table headers, subtle fills, search field |
| `--border` | `#DBE1E5` | Default borders |
| `--border2` | `#BAC5CD` | Stronger borders, kbd |
| `--text` / `--text1` | `#0B1821` | Primary text |
| `--text2` | `#324553` | Secondary text |
| `--text3` | `#5C707E` | Muted / metadata |
| `--hover` | `#F6F7F9` | Row / menu hover |

## Typography

| Role | Family | Notes |
|---|---|---|
| Body | **Open Sans** (`--sans`) | Loaded via `next/font/google` in root layout |
| Display | **Gotham SSm** (`--display`) | Headings ≥20px, metric values; falls back to Open Sans until web files are in `public/fonts/gotham-ssm/` |
| Monospace | `--mono` | IDs, counts, timestamps |

| Role | Size | Weight |
|---|---|---|
| Page title | 14px | 600 |
| Section label (sidebar) | 10px | 700, uppercase, 0.12em spacing |
| Body | 13px | 400 |
| Nav item | 14px | 400 (600 when active) |
| Table row | 12.5px | 400 |
| Table header | 10.5px | 600, uppercase |
| Button | 12.5px | 600 |
| Metadata | 10.5–11px | 400 |
| Monospace | 11px | 400 |

## Radii

| Token | Value | Use |
|---|---|---|
| `--r-s` | 6px | Buttons, inputs, search |
| `--r-m` | 8px | Dropdowns, popovers |
| `--r-l` | 10px | Panels / cards |
| `--r-pill` | 100px | Pills, chips, progress tracks |

## Status colours

| Status | Text / fill | Background | Notes |
|---|---|---|---|
| Pass | `#108718` (`--pass`) | `#ECFBEE` (`--pass-bg`) | Passed results |
| Fail | `#C50007` (`--fail`) | `#FFE4E4` (`--fail-bg`) | Failed results, critical |
| Blocked | `#E4AF03` (`--block`) fill only | `#FFF5D4` (`--block-bg`) | Use `--block-text` (`#8C6A00`) for readable text on light bg |
| Skip | `#4527A0` (`--skip`) | `#EDE7F6` (`--skip-bg`) | Skipped — deliberately kept purple (not Compass gray) |
| Not run | `--text3` | `--surface2` | Pending execution |
| Active | `--accent` | `--accent-lt` | Active runs, plans, chips |

## Priority text

| Level | Token | Value |
|---|---|---|
| Critical | `--crit-text` | `#C50007` |
| High | `--high-text` | `#8C6A00` |
| Medium | `--med-text` | `#004FAA` |

## Layout principles

**Operational density.** Internal engineering tool — 13px body baseline retained (not mockup 14px globally).

**Split-pane navigation.** Persistent left list + right detail on major views.

**Resizable panels.** Suite tree, plan list, case detail — drag-resizable.

**Keyboard-first execution.** Test Runs: P/F/B/S, J/K, D — unchanged by reskin.

## Component patterns

**Status pills:** `.pill.p-pass` etc. — pill radius, leading dot.

**Buttons:** `.btn` (neutral), `.btn-neutral` (grey secondary), `.btn-p` (primary blue).

**Sidebar active nav:** white rounded chip on dark blue (`#003B71`), navy text/icon.

**Top bar:** 56px — project switcher, ⌘K search, module switcher, actions.

**Tables:** `.tbl` — sticky uppercase headers on `--surface2`, selected row `--accent-lt`.

**Chips:** `.chip.on` — accent tint + border.

**Donut charts:** SVG stroke-dasharray; colours read status tokens.
