# Design system — Testlane (portfolio reskin)

Testlane uses Noel Quadri’s portfolio palette (graphite / teal / paper). Tokens live in `apps/web/src/fresh/styles/fresh.css` (`:root`). The app is **light-mode only** (`color-scheme: light`).

## Brand

**Name:** Testlane

**Mark:** Two staggered chevrons with a filled baton dot (execution handoff). Sidebar wordmark sits on graphite; the baton uses `--nq-teal-on-dark`.

**Functional accent:** Teal (`--nq-teal` / `--nq-teal-on-dark`) for primary buttons, links, focus rings, and selected states.

**Personal identity (off-limits in interactive UI):** Amber (`--nq-amber` / `--nq-amber-bright`) is Noel’s personal colour — do not use on buttons, links, or active states inside the app.

## Colour tokens

| Token | Value | Use |
|---|---|---|
| `--nq-graphite` / `--navy` | `#24272B` | Brand / nav text on light; alias for shell |
| `--nq-deep` / `--navy-hover` | `#1A1D20` | Darkest surface / mark tile |
| `--sidebar-bg` | `#24272B` | Sidebar background |
| `--nq-teal` / `--accent` | `#0F6E56` | Primary accent — links, CTAs, interactive |
| `--nq-teal-hover` / `--accent-hover` | `#0A5542` | Primary button hover |
| `--nq-teal-lt` / `--accent-lt` | `#E6F5F0` | Selected rows, active highlights |
| `--nq-teal-on-dark` / `--accent-on-dark` | `#4FB89F` | Accent on dark surfaces (sidebar wordmark) |
| `--nq-paper` / `--bg` | `#FAFAF7` | App canvas |
| `--surface` | `#FFFFFF` | Cards, panels, top bar |
| `--nq-card` / `--surface2` | `#F3F3F0` | Table headers, subtle fills |
| `--nq-hairline` / `--border` | `#E0E0DA` | Default borders |
| `--nq-hairline-strong` / `--border2` | `#D0D0CA` | Stronger borders |
| `--text` / `--text1` | `#24272B` | Primary text |
| `--text2` | `#3D4045` | Secondary text |
| `--nq-steel` / `--text3` | `#8A8F98` | Muted / metadata |
| `--hover` | `#F3F3F0` | Row / menu hover |

Semantic status colours (`--pass`, `--fail`, `--block`, `--skip`) are unchanged and must not be replaced by brand teal/amber.

## Typography

| Role | Family | Notes |
|---|---|---|
| Body | **Inter** (`--sans`) | Loaded via `next/font/google` (`--font-inter`) |
| Display | **Space Grotesk** (`--display`) | Headings; `next/font/google` (`--font-space-grotesk`, 500/700) |
| Monospace | **JetBrains Mono** (`--mono`) | IDs, counts, timestamps; `next/font/google` (`--font-jetbrains-mono`) |

| Role | Size | Weight |
|---|---|---|
| Page title | 14px | 600–700 (display) |
| Section label (sidebar) | 10px | 700, uppercase, 0.12em spacing |
| Body | 13px | 400 |
| Nav item | 14px | 500 (600 when active) |
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

Unchanged from the prior Compass-era semantic set — green pass, red fail, amber blocked (result semantics only), purple skipped. Do not remap these to brand teal.
