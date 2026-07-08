# Task 07 — Admin / Project Settings reskin

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-01, task-02

Reskin the global `/admin/*` area (the mockup presents this as "Project Settings" with a left
sub-nav and all its sub-pages). **Keep `/admin/*` a separate, global area** — do not merge it into
the project sidebar; just make it visually consistent with the reskinned shell. Presentational only.

Reference: `mockup/Relay Compass Reskin Mockup.html` → Project Settings (sub-sidebar: My profile,
My account, Organization, Projects, User management, Role management, Audit log, API keys,
Integrations, Custom fields, Automation).

Files touched:
- `apps/web/src/fresh/styles/admin.css` (225 lines — the `.admin-*` classes)
- `apps/web/src/fresh/components/admin/**` (AdminSidebar, AdminTopBar/shell, `pages/*` — presentational
  className/markup only; these use **Lucide** icons — keep them)

## Changes
1. **Admin sidebar** (`.admin-sb`, `.admin-sbi`, `.admin-sbi.on`, `.admin-sb.collapsed`, ~lines 9–20):
   apply the same treatment as the main sidebar from task-02 — dark blue `--sidebar-bg`; **active
   item = white rounded chip with dark-blue text/icon** (`.admin-sbi.on{ background:#fff;
   color:var(--navy); border-left:0; border-radius:6px; margin:1px 8px; }`); hover
   `rgba(255,255,255,.08)`; item text ~13.5–14px. Keep Lucide icons (recolour to inherit).
2. **Admin topbar** (`.admin-topbar`, `.admin-back`, `.admin-org`, ~lines 3–7): white, `1px --border`
   bottom; back link `--accent`; org name display/600. Keep the back-to-app behaviour.
3. **Page frame** (`.admin-page`, `.admin-page-title`, `.admin-muted`): title uses `--display`
   ~22px; muted text `--text3`.
4. **Sections** (`.admin-section*`): section title 14px 600; section icon `--accent`; divider
   `--border`.
5. **Form rows** (`.admin-form-row`, `.admin-field-lbl`, `.admin-field-desc`, `.admin-inp`, selects,
   textareas, ~lines 30–45): label uppercase 10–11px `--text3`; description `--text2`; inputs to
   Compass form chrome — `height:34px`, radius `var(--r-s)`, `1px --border`, focus `--accent` +
   focus ring; read-only inputs `--surface2`.
6. **Toggles / switches, cards, tables** in admin pages (`admin-ui.tsx` and `pages/*`): re-point any
   hardcoded status/greys to tokens; toggles use `--pass`/gray; the users/roles/audit tables adopt
   the shared table look; "check/cross" cells use `--pass`/`--text3`; integration logos/cards to
   Compass card chrome. Keep all CRUD/RBAC behaviour.
7. **Buttons** across admin: primary → `.btn-p`/`--accent`; secondary → `.btn-neutral`; danger →
   `--danger`. Class swaps only, no handler changes.

## Verification
- `/admin/profile`, `/admin/account`, `/admin/organization`, `/admin/projects`, `/admin/users`,
  `/admin/roles`, `/admin/audit-log`, `/admin/api-keys`, `/admin/integrations`,
  `/admin/custom-fields`, `/admin/automation` — each renders, matches the mockup's palette/type, and
  keeps its separate-global-area feel.
- Behaviour unchanged: sub-nav navigation, back-to-app, user/role/field CRUD, toggles, actor
  switcher — all as before.
- Screenshots to QA report.

## Out of scope
- Merging admin into the project shell; admin data/RBAC/CRUD logic; per-project `SettingsScreen.tsx`
  (task-08); icon swap (Lucide stays).
