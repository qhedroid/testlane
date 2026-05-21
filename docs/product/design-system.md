# Design system — Relay

## Brand

**Name:** Relay

**Rationale:** Implies the handoff cycle of test case → plan → run → result. Clean, professional, no startup connotations.

**Mark:** Two staggered chevrons (the passing and receiving team) with a filled dot (the baton — execution data being transferred).

## Colour tokens

| Token | Light mode | Dark mode | Use |
|---|---|---|---|
| Primary (Navy) | `#042C53` | `#042C53` | Mark, wordmark, nav background |
| Accent (Blue) | `#185FA5` | `#185FA5` | Baton dot, interactive elements, CTAs |
| Dark accent | — | `#6AADE8` | Mark stroke on dark backgrounds |
| Tint | `#E6F1FB` | — | Selected states, highlights |

## Typography

System sans-serif stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`

Monospace: `ui-monospace, 'Cascadia Code', 'SF Mono', monospace` — used for IDs, counts, timestamps

| Role | Size | Weight |
|---|---|---|
| Page title | 14px | 600 |
| Section label | 10px | 600, uppercase, 0.08em spacing |
| Body | 13px | 400 |
| Table row | 12.5px | 400 |
| Metadata | 10.5–11px | 400 |
| Monospace | 11px | 400 |

## Status colours

| Status | Text | Background | Use |
|---|---|---|---|
| Pass | `#2E7D32` | `#E8F5E9` | Passed results |
| Fail | `#C62828` | `#FFEBEE` | Failed results, critical severity |
| Blocked | `#E65100` | `#FFF3E0` | Blocked results, high severity |
| Skip | `#4527A0` | `#EDE7F6` | Skipped results |
| Not run | `#7A92AB` | `#F5F8FB` | Pending execution |
| Active | `#185FA5` | `#E6F1FB` | Active runs and plans |

## Layout principles

**Operational density.** This is an internal engineering tool, not a consumer product. Default to more information per screen, not less.

**Split-pane navigation.** Every major view uses a persistent left list and a right detail panel. Users never lose context navigating between items.

**Resizable panels.** The left panels in Test Cases and Test Runs are drag-resizable. QA engineers have different monitor setups and workflow needs.

**Keyboard-first execution.** The Test Runs view is keyboard-navigable throughout. P/F/B/S mark results, J/K navigate cases, D links defects.

## Component patterns

**Status pills:** `<span class="pill p-pass">✓ Pass</span>` — consistent across all views.

**Priority labels:** CRITICAL / HIGH / MEDIUM / LOW — toggleable via the Priorities button in the runs toolbar.

**Tab bars:** used in detail panels (Details / Steps / Activity / History / Comments / Defects) and in Test Plans (Overview / Test Cases / Runs / Metrics).

**Donut charts:** SVG stroke-dasharray technique, 68×68px viewBox. Shows pass/fail/blocked/not-run breakdown.

**Quick Create:** Inline row input in Test Cases — Enter to create, Esc to close. Creates a case locally in session.

**Keyboard shortcut bar:** persistent footer in Test Runs, showing all active shortcuts.
