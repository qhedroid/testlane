# Task 01 — Test Plans: Data Model, FreshProvider, Screen Rebuild

## Goal

Introduce Test Plans as a first-class entity in `DemoState`. Replace the static `PlansScreen` (which read from a hardcoded `PLANS` seed constant) with a fully FreshProvider-backed screen that supports create, edit, duplicate, delete, URL routing, an Overview tab with coverage metrics, run history, and "Spawn run from plan."

Bump schema to **v12**.

---

## Context from previous tasks

- Branch: `mvp-test-plans`, forked from `mvp-test-runs`.
- Schema is currently **v11**. All migration steps live in `migrate-demo-state.ts`.
- `DemoRun` already has `planId?: string` and `planName?: string` — we will populate these when spawning a run from a plan.
- `formatRunKey` / `formatCaseKey` in `demo-model.ts` are the pattern for `formatPlanKey`.
- Route helpers live in `apps/web/src/fresh/lib/project-routes.ts`. Test runs use `/testruns/tr/[runKey]` — plans will use the same pattern: `/plans/tp/[planKey]`.
- `switchProjectPath` in `project-routes.ts` must be updated to strip plan selection on project switch.
- `listActiveProjectRuns` in `project-selectors.ts` is the pattern for `listActiveProjectPlans`.
- The existing `PlansScreen.tsx` must be **completely replaced** — do not try to extend it.
- CSS: create a new file `apps/web/src/fresh/styles/prototype-plans.css`. The plans page.tsx files import this CSS; `PlansScreen.tsx` does not.
- No backend, no API routes, no Tailwind.

---

## Files to change

### 1. `apps/web/src/fresh/data/demo-model.ts`

**Add** these types after the `Folder` interface:

```ts
export type QueryOperator = 'contains' | 'not_contains' | 'equals' | 'not_equals'
export type QueryField = 'title' | 'priority' | 'type' | 'assignee' | 'tags' | 'caseKey'

export interface QueryCondition {
  field: QueryField
  operator: QueryOperator
  value: string
}

export interface TestQuery {
  id: string
  /** Human-readable name for this query group, e.g. "High Priority Cases". */
  title: string
  /** 'condition' = field/operator/value filter; 'folder' = folder-based; 'static' = explicit case list. */
  type: 'condition' | 'folder' | 'static'
  /** For type='condition': all conditions must match (AND logic). */
  conditions?: QueryCondition[]
  /** For type='folder': folder IDs whose cases are included (descendants included). */
  folderIds?: string[]
  /** For type='static': explicit internal Case.id values selected by the user. */
  caseIds?: string[]
}

export interface TestPlan {
  id: string
  /** Project-scoped human-readable key, e.g. TP-00001. */
  planKey: string
  projectId: string
  title: string
  description?: string
  createdAt: string
  queries: TestQuery[]
}
```

**Add** these utility functions near `formatRunKey` / `formatCaseKey`:

```ts
/** Format a per-project plan counter as a 5-digit key, e.g. TP-00001. */
export function formatPlanKey(n: number): string {
  return `TP-${n.toString().padStart(5, '0')}`
}

/** Strip TP- prefix for use in URL slugs, e.g. TP-00001 → 00001. */
export function planKeyToSlug(planKey: string): string {
  return planKey.replace(/^TP-/i, '')
}

/** Restore TP- prefix from a URL slug, e.g. 00001 → TP-00001. */
export function slugToPlanKey(slug: string): string {
  return /^TP-/i.test(slug) ? slug : `TP-${slug}`
}
```

**Add** `resolvePlanCases` and its helper after the existing `casesInFolder` function:

```ts
function evaluateCondition(c: Case, cond: QueryCondition): boolean {
  const v = cond.value.toLowerCase()
  let fv = ''
  if (cond.field === 'title') fv = c.title
  else if (cond.field === 'priority') fv = c.priority
  else if (cond.field === 'type') fv = c.type
  else if (cond.field === 'assignee') fv = c.assignee ?? ''
  else if (cond.field === 'tags') fv = (c.tags ?? []).join(',')
  else if (cond.field === 'caseKey') fv = c.caseKey ?? c.id
  fv = fv.toLowerCase()
  if (cond.operator === 'equals') return fv === v
  if (cond.operator === 'not_equals') return fv !== v
  if (cond.operator === 'contains') return fv.includes(v)
  if (cond.operator === 'not_contains') return !fv.includes(v)
  return false
}

/**
 * Resolve all case IDs referenced by a plan's query groups.
 * Returns cases in their original order, deduplicated.
 */
export function resolvePlanCases(plan: TestPlan, cases: Case[], folders: Folder[]): Case[] {
  const seen = new Set<string>()
  const result: Case[] = []
  for (const query of plan.queries) {
    let matched: Case[] = []
    if (query.type === 'static') {
      const ids = new Set(query.caseIds ?? [])
      matched = cases.filter((c) => ids.has(c.id))
    } else if (query.type === 'folder') {
      const allowed = new Set<string | null>()
      for (const fid of (query.folderIds ?? [])) {
        folderDescendantIds(folders, fid).forEach((id) => allowed.add(id))
      }
      matched = cases.filter((c) => allowed.has(c.folderId ?? null))
    } else if (query.type === 'condition') {
      const conditions = query.conditions ?? []
      if (conditions.length > 0) {
        matched = cases.filter((c) => conditions.every((cond) => evaluateCondition(c, cond)))
      }
    }
    for (const c of matched) {
      if (!seen.has(c.id)) {
        seen.add(c.id)
        result.push(c)
      }
    }
  }
  return result
}
```

**Add** `plansById` and `nextPlanNumByProject` to the `DemoState` interface:

```ts
export interface DemoState {
  schemaVersion: number
  projectsById: Record<string, Project>
  activeProjectId: string
  folders: Folder[]
  cases: Case[]
  runs: DemoRun[]
  currentRunIdByProject: Record<string, string>
  nextCaseNumByProject: Record<string, number>
  nextRunNumByProject: Record<string, number>
  adminSettings: AdminSettings
  plansById: Record<string, TestPlan>
  nextPlanNumByProject: Record<string, number>
}
```

**Bump** `DEMO_SCHEMA_VERSION` from `11` to `12`.

---

### 2. `apps/web/src/fresh/data/demo-seed.ts`

**Add** the import for the new types at the top (alongside existing imports from `demo-model`):

```ts
import type { TestPlan } from './demo-model'
import { DEFAULT_SEED_PROJECT_ID, formatPlanKey } from './demo-model'
```

(`DEFAULT_SEED_PROJECT_ID` and `formatPlanKey` may already be imported — only add what's missing.)

**Add** seed plan constant after `SEED_PROJECT` (or after any existing seed constants — before `buildInitialDemoState`):

```ts
const NOW_PLANS = '2026-06-19T09:00:00.000Z'

export const SEED_PLANS: TestPlan[] = [
  {
    id: 'plan-smoke',
    planKey: formatPlanKey(1),
    projectId: DEFAULT_SEED_PROJECT_ID,
    title: 'Smoketest',
    description: 'Critical and high priority cases covering core workflows.',
    createdAt: NOW_PLANS,
    queries: [
      {
        id: 'tq-smoke-critical',
        title: 'Critical priority cases',
        type: 'condition',
        conditions: [{ field: 'priority', operator: 'equals', value: 'Critical' }],
      },
    ],
  },
  {
    id: 'plan-regression',
    planKey: formatPlanKey(2),
    projectId: DEFAULT_SEED_PROJECT_ID,
    title: 'Full Regression',
    description: 'Complete coverage of all CTMS, eTMF, and Viewer test cases.',
    createdAt: NOW_PLANS,
    queries: [
      {
        id: 'tq-regression-ctms',
        title: 'CTMS cases',
        type: 'folder',
        folderIds: ['f-ctms'],
      },
      {
        id: 'tq-regression-etmf',
        title: 'eTMF cases',
        type: 'folder',
        folderIds: ['f-etmf'],
      },
    ],
  },
]
```

**In `buildInitialDemoState()`**, add `plansById` and `nextPlanNumByProject` to the returned object:

```ts
plansById: Object.fromEntries(SEED_PLANS.map((p) => [p.id, p])),
nextPlanNumByProject: { [DEFAULT_SEED_PROJECT_ID]: SEED_PLANS.length + 1 },
```

Read the file first to find the exact location in the returned object — add these alongside the existing fields (`folders`, `cases`, `runs`, etc.).

---

### 3. `apps/web/src/fresh/data/migrate-demo-state.ts`

**Add** the import for new types (alongside existing imports from `demo-model`):

```ts
import type { TestPlan } from './demo-model'
import { SEED_PLANS } from './demo-seed'
```

**Add** the v11→v12 migration block after the v10→v11 block:

```ts
// v11 → v12: introduce plansById and nextPlanNumByProject; backfill seed plans for DP project
if (state.schemaVersion < 12) {
  const existingPlans = (state as unknown as { plansById?: Record<string, TestPlan> }).plansById ?? {}
  const existingCounters = (state as unknown as { nextPlanNumByProject?: Record<string, number> }).nextPlanNumByProject ?? {}

  // For each project that is missing plans, seed the demo plans if it's the DP project
  const plansById: Record<string, TestPlan> = { ...existingPlans }
  const nextPlanNumByProject: Record<string, number> = { ...existingCounters }

  for (const [projectId, project] of Object.entries(state.projectsById)) {
    // Only seed plans for demo projects that don't yet have any plans
    const hasPlans = Object.values(plansById).some((p) => p.projectId === projectId)
    if (!hasPlans && project.seedTemplate === 'demo') {
      for (const plan of SEED_PLANS) {
        const seededPlan = { ...plan, projectId }
        plansById[seededPlan.id + '-' + projectId] = seededPlan
      }
      nextPlanNumByProject[projectId] = SEED_PLANS.length + 1
    } else if (!nextPlanNumByProject[projectId]) {
      nextPlanNumByProject[projectId] = 1
    }
  }

  state = { ...state, plansById, nextPlanNumByProject, schemaVersion: 12 }
}
```

> **Note:** The above migration seeds the two plans for all existing demo projects. Non-demo projects get an empty plan list. The plan ids are namespaced by projectId to avoid key collisions when multiple demo projects exist.

---

### 4. `apps/web/src/fresh/data/project-selectors.ts`

**Add** `listActiveProjectPlans` alongside the existing `listActiveProject*` functions. Import `TestPlan` from `demo-model`:

```ts
export function listActiveProjectPlans(state: DemoState): TestPlan[] {
  return Object.values(state.plansById).filter(
    (p) => p.projectId === state.activeProjectId,
  ).sort((a, b) => a.planKey.localeCompare(b.planKey))
}
```

---

### 5. `apps/web/src/fresh/lib/project-routes.ts`

**Add** imports of the new helpers (they live in `demo-model` — import alongside the existing usage or add to the top):

```ts
import { planKeyToSlug, slugToPlanKey } from '../data/demo-model'
```

**Add** plan route helpers after the test case helpers:

```ts
/** Canonical plan path — with or without selected plan key. */
export function planPath(projectKey: string, planKey?: string): string {
  const base = projectPath(projectKey, 'plans')
  return planKey ? `${base}/tp/${planKeyToSlug(planKey)}` : base
}

/** Extract planKey from /:projectKey/plans/tp/:planKey paths. */
export function parsePlanKey(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 4 && parts[1] === MODULE_SLUGS.plans && parts[2] === 'tp') {
    return slugToPlanKey(parts[3])
  }
  return null
}
```

**Update `switchProjectPath`** — add a guard for plan detail URLs (before the generic `parseProjectPath` fallback):

```ts
if (parsePlanKey(pathname)) return projectPath(newProjectKey, 'plans')
```

---

### 6. `apps/web/src/fresh/data/FreshProvider.tsx`

Read the file before touching it. Follow existing patterns exactly for action types, reducer cases, callbacks, `FreshContextValue`, `value` object, and `useMemo` deps.

**Add** imports for new types and helpers:

```ts
import type { TestPlan, TestQuery } from './demo-model'
import {
  formatPlanKey,
  listActiveProjectPlans, // already imported from project-selectors
  resolvePlanCases,
} from './demo-model'
```

(Some of these may already be partially imported — only add what's missing.)

**Add** to `FreshAction` union:

```ts
| { type: 'ADD_PLAN'; plan: TestPlan }
| { type: 'UPDATE_PLAN'; planId: string; patch: Partial<Pick<TestPlan, 'title' | 'description'>> }
| { type: 'DELETE_PLAN'; planId: string }
| { type: 'DUPLICATE_PLAN'; newPlan: TestPlan }
```

**Add** reducer cases (in the switch statement):

```ts
case 'ADD_PLAN': {
  next = {
    ...state,
    plansById: { ...state.plansById, [action.plan.id]: action.plan },
    nextPlanNumByProject: {
      ...state.nextPlanNumByProject,
      [action.plan.projectId]: (state.nextPlanNumByProject[action.plan.projectId] ?? 1) + 1,
    },
  }
  break
}
case 'UPDATE_PLAN': {
  const existing = state.plansById[action.planId]
  if (!existing) return state
  next = {
    ...state,
    plansById: {
      ...state.plansById,
      [action.planId]: { ...existing, ...action.patch },
    },
  }
  break
}
case 'DELETE_PLAN': {
  const { [action.planId]: _removed, ...rest } = state.plansById
  next = { ...state, plansById: rest }
  break
}
case 'DUPLICATE_PLAN': {
  next = {
    ...state,
    plansById: { ...state.plansById, [action.newPlan.id]: action.newPlan },
    nextPlanNumByProject: {
      ...state.nextPlanNumByProject,
      [action.newPlan.projectId]: (state.nextPlanNumByProject[action.newPlan.projectId] ?? 1) + 1,
    },
  }
  break
}
```

**Add** callbacks and expose on context:

```ts
const addPlan = useCallback(
  (title: string, description?: string) => {
    const projectId = state.activeProjectId
    const num = state.nextPlanNumByProject[projectId] ?? 1
    const planKey = formatPlanKey(num)
    const plan: TestPlan = {
      id: newId('plan'),
      planKey,
      projectId,
      title,
      description,
      createdAt: new Date().toISOString(),
      queries: [],
    }
    dispatch({ type: 'ADD_PLAN', plan })
    return { planKey, planId: plan.id }
  },
  [state],
)

const updatePlan = useCallback(
  (planId: string, patch: Partial<Pick<TestPlan, 'title' | 'description'>>) => {
    dispatch({ type: 'UPDATE_PLAN', planId, patch })
  },
  [],
)

const deletePlan = useCallback(
  (planId: string) => {
    dispatch({ type: 'DELETE_PLAN', planId })
  },
  [],
)

const duplicatePlan = useCallback(
  (planId: string) => {
    const original = state.plansById[planId]
    if (!original) return null
    const projectId = state.activeProjectId
    const num = state.nextPlanNumByProject[projectId] ?? 1
    const planKey = formatPlanKey(num)
    const newPlan: TestPlan = {
      ...original,
      id: newId('plan'),
      planKey,
      title: `Copy of ${original.title}`,
      createdAt: new Date().toISOString(),
      queries: original.queries.map((q) => ({ ...q, id: newId('tq') })),
    }
    dispatch({ type: 'DUPLICATE_PLAN', newPlan })
    return { planKey, planId: newPlan.id }
  },
  [state],
)

const spawnRunFromPlan = useCallback(
  (planId: string, name: string, description?: string) => {
    const plan = state.plansById[planId]
    if (!plan) return null
    const projectCases = listActiveProjectTestCases(state)
    const projectFolders = listActiveProjectFolders(state)
    const caseIds = resolvePlanCases(plan, projectCases, projectFolders).map((c) => c.id)
    const projectId = state.activeProjectId
    const num = state.nextRunNumByProject[projectId] ?? 1
    const runKey = formatRunKey(num)
    dispatch({
      type: 'CREATE_RUN',
      name,
      description,
      caseIds,
      planId,
      planName: plan.title,
    })
    return { runKey }
  },
  [state],
)
```

**Extend `CREATE_RUN` action** to accept optional `planId` and `planName` (the action type already exists — just add the optional fields):

```ts
| { type: 'CREATE_RUN'; name: string; description?: string; caseIds?: string[]; planId?: string; planName?: string }
```

In the `CREATE_RUN` reducer case, stamp `planId` and `planName` on the created run if provided:

```ts
const run: DemoRun = {
  // ... existing fields ...
  planId: action.planId,
  planName: action.planName,
}
```

**Add** `activePlans` derived value alongside `activeCases` / `activeFolders`:

```ts
const activePlans = useMemo(
  () => listActiveProjectPlans(state),
  [state],
)
```

**Add** to `FreshContextValue`, `value` object, and `useMemo` deps:
- `activePlans: TestPlan[]`
- `addPlan`
- `updatePlan`
- `deletePlan`
- `duplicatePlan`
- `spawnRunFromPlan`

---

### 7. New route file: `apps/web/src/app/(app)/[projectKey]/plans/tp/[planKey]/page.tsx`

```tsx
import '@/fresh/styles/prototype-plans.css'
import { PlansScreen } from '@/fresh/screens/PlansScreen'

export default function ProjectPlanDetailPage() {
  return <PlansScreen />
}
```

### Update existing: `apps/web/src/app/(app)/[projectKey]/plans/page.tsx`

```tsx
import '@/fresh/styles/prototype-plans.css'
import { PlansScreen } from '@/fresh/screens/PlansScreen'

export default function ProjectPlansPage() {
  return <PlansScreen />
}
```

---

### 8. New file: `apps/web/src/fresh/styles/prototype-plans.css`

Create with the following CSS. Follow the same CSS variable conventions used in `fresh.css` and `prototype-runs.css`:

```css
/* ─── Plans screen layout ─────────────────────────────────────────────── */

.pl-lay {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ─── Left pane: plan list ─────────────────────────────────────────────── */

.pl-list-pane {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  overflow: hidden;
}

.pl-list-hd {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.pl-list-hd .st-ttl {
  font-size: 12px;
  font-weight: 600;
  color: var(--text1);
  flex: 1;
}

.pl-list-search {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.pl-list-search input {
  width: 100%;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text1);
  box-sizing: border-box;
}

.pl-list-body {
  flex: 1;
  overflow-y: auto;
}

.pl-list-item {
  position: relative;
  padding: 8px 10px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
}

.pl-list-item:hover {
  background: var(--hover);
}

.pl-list-item.on {
  background: var(--accent-subtle, color-mix(in srgb, var(--accent) 10%, transparent));
  border-left: 2px solid var(--accent);
}

.pl-item-key {
  font-size: 10px;
  font-family: var(--mono);
  color: var(--text3);
  margin-bottom: 2px;
}

.pl-item-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pl-item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 10.5px;
  color: var(--text3);
}

.pl-item-actions {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: none;
}

.pl-list-item:hover .pl-item-actions {
  display: flex;
  align-items: center;
}

.pl-empty-list {
  padding: 24px 16px;
  text-align: center;
  color: var(--text3);
  font-size: 12px;
}

/* ─── Right pane: plan detail ──────────────────────────────────────────── */

.pl-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pl-no-selection {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text3);
  font-size: 13px;
}

.pl-detail-hd {
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.pl-detail-title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}

.pl-detail-title-row .dp-id {
  font-size: 11px;
  font-family: var(--mono);
  color: var(--accent);
  font-weight: 500;
}

.pl-detail-title-row h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text1);
  margin: 0;
}

.pl-detail-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 11.5px;
  color: var(--text2);
}

.pl-detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.pl-detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
}

/* ─── Overview tab ─────────────────────────────────────────────────────── */

.pl-overview-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.pl-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 14px 16px;
}

.pl-card-hd {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text2);
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pl-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text1);
  padding: 3px 0;
}

.pl-card-row label {
  color: var(--text2);
}

.pl-coverage-donut {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.pl-donut-pct {
  font-size: 28px;
  font-weight: 700;
  color: var(--text1);
  line-height: 1;
}

.pl-donut-label {
  font-size: 11px;
  color: var(--text3);
  text-align: center;
}

.pl-open-run {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 80px;
}

.pl-open-run-key {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  font-family: var(--mono);
  text-decoration: none;
}

.pl-open-run-key:hover {
  text-decoration: underline;
}

/* ─── Run history table ────────────────────────────────────────────────── */

.pl-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

.pl-panel-hd {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  font-weight: 600;
  color: var(--text1);
}

.pl-run-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.pl-run-table th {
  text-align: left;
  padding: 6px 12px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
}

.pl-run-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text1);
  vertical-align: middle;
}

.pl-run-table tr:last-child td {
  border-bottom: none;
}

.pl-run-table tr:hover td {
  background: var(--hover);
}

.pl-run-key {
  font-family: var(--mono);
  color: var(--accent);
  font-size: 11px;
  text-decoration: none;
}

.pl-run-key:hover {
  text-decoration: underline;
}

.pl-run-bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: var(--border);
  width: 120px;
}

.pl-run-bar-seg {
  height: 100%;
}

/* ─── Test cases tab placeholder ───────────────────────────────────────── */

.pl-tc-placeholder {
  padding: 40px 20px;
  text-align: center;
  color: var(--text3);
  font-size: 13px;
  border: 1px dashed var(--border);
  border-radius: 8px;
}
```

---

### 9. `apps/web/src/fresh/screens/PlansScreen.tsx`

**Completely replace** the existing file. The new screen is a FreshProvider-backed, URL-routing plan manager following the same patterns as `RunsScreen.tsx`. Read `RunsScreen.tsx` to calibrate component structure, effect patterns, and CSS conventions — but do not copy execution-specific code.

#### Key imports

```tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FreshTopbar } from '../components/FreshTopbar'
import { PrototypeBanner } from '../components/PrototypeBanner'
import { useProjectHref } from '../hooks/useProjectHref'
import { useFresh } from '../data/FreshProvider'
import { formatRelativeTime, resolvePlanCases, runSummary } from '../data/demo-model'
import { planPath, parsePlanKey, testRunPath } from '../lib/project-routes'
```

#### State

```ts
const [tab, setTab] = useState<'overview' | 'testcases'>('overview')
const [listSearch, setListSearch] = useState('')
const [createPlanOpen, setCreatePlanOpen] = useState(false)
const [createPlanTitle, setCreatePlanTitle] = useState('')
const [createPlanDesc, setCreatePlanDesc] = useState('')
const [editPlanOpen, setEditPlanOpen] = useState(false)
const [editTitle, setEditTitle] = useState('')
const [editDesc, setEditDesc] = useState('')
const [spawnRunOpen, setSpawnRunOpen] = useState(false)
const [spawnRunName, setSpawnRunName] = useState('')
const [spawnRunDesc, setSpawnRunDesc] = useState('')
const [moreMenuOpen, setMoreMenuOpen] = useState(false)
const [rowMenuOpen, setRowMenuOpen] = useState<string | null>(null) // planId
const moreMenuRef = useRef<HTMLDivElement>(null)
const rowMenuRef = useRef<HTMLDivElement>(null)
```

#### URL sync

```ts
const pathname = usePathname()
const router = useRouter()
const planKeyFromUrl = parsePlanKey(pathname)

// Derive selectedPlanId from URL
const selectedPlan = useMemo(
  () => activePlans.find((p) => p.planKey === planKeyFromUrl) ?? null,
  [activePlans, planKeyFromUrl],
)
```

When a plan is clicked in the list: `router.push(planPath(activeProject.key, plan.planKey))`.

When switching to a different plan tab, keep the URL stable (tabs are local state).

#### `projectMismatch` guard

Derive `projectMismatch` from the URL the same way RunsScreen does — if the URL's project key doesn't match `activeProject.key`, bail out of navigation effects. Read RunsScreen for the exact implementation.

#### Left pane — plan list

- Filter `activePlans` by `listSearch` (case-insensitive match on `plan.title` or `plan.planKey`).
- Each row is a `.pl-list-item` div. Add `.on` when `selectedPlan?.id === plan.id`.
- Row content:
  - `.pl-item-key`: `plan.planKey` (monospace, muted)
  - `.pl-item-title`: `plan.title`
  - `.pl-item-meta`:
    - Open run count: count of `activeRuns` where `run.planId === plan.id && !run.sealed && !run.archivedAt`
    - Last run: find the most recent `activeRuns` entry by `createdAt` where `run.planId === plan.id`; show `formatRelativeTime(run.createdAt)` or `—`
  - `.pl-item-actions` (hidden, revealed on hover): "..." button opens `rowMenuOpen` context menu for this plan

Row "..." context menu (same fixed-position pattern as CasesScreen):
- **Edit** — opens edit modal pre-filled with plan title + description
- **Duplicate** — calls `duplicatePlan(plan.id)`, navigates to new plan
- **Delete** — `window.confirm("Delete plan "${plan.title}"? This cannot be undone.")` → `deletePlan(plan.id)` → if deleted plan was selected, navigate to `/plans`

At the top of `.pl-list-pane`:
- `.pl-list-hd`: clipboard icon, "Plans" label, count pill, `+ New plan` button (btn-p)

#### Right pane — plan detail

**No selection state:** a `.pl-no-selection` centered message: `Select a plan to view details`.

**Plan selected — header (`.pl-detail-hd`):**
- `.pl-detail-title-row`:
  - `<span className="dp-id">{selectedPlan.planKey}</span>`
  - `<h2>{selectedPlan.title}</h2>`
- `.pl-detail-meta`:
  - `Created by: Shaun Sevume` (hardcoded for prototype — same as Testiny demo data)
  - `Created: {formatRelativeTime(selectedPlan.createdAt)}`
- `.pl-detail-actions`:
  - **"Create test run"** button (btn-p) — opens `spawnRunOpen` modal
  - **"Edit"** button — opens `editPlanOpen` panel
  - **"More..."** button with dropdown (ref=`moreMenuRef`):
    - **Duplicate** → `duplicatePlan(selectedPlan.id)` → navigate to new plan
    - **Delete** → confirm → `deletePlan(selectedPlan.id)` → navigate to `/plans`

**Tab bar:**
```tsx
<div className="nav-tab-bar">
  {(['overview', 'testcases'] as const).map((t) => (
    <div key={t} className={`nav-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
      {t === 'overview' ? 'Overview' : 'Test cases'}
    </div>
  ))}
</div>
```

**Overview tab:**

Three `.pl-card` panels in `.pl-overview-cards`:

1. **Test plan details card**:
   - Rows: Created by, Created at (formatted), Case count (resolvedCases.length, computed via `resolvePlanCases`)

2. **Open test run card**:
   - Find the most recent non-sealed, non-archived run in `activeRuns` where `run.planId === selectedPlan.id`.
   - If found: show the run key as a large `<Link>` (`.pl-open-run-key`) pointing to `testRunPath(activeProject.key, run.runKey)`. Label: "Open test run"
   - If not found: show `+ Create test run` button (btn-p) that opens the spawn modal.

3. **Test case coverage card**:
   - `resolvedCases = resolvePlanCases(selectedPlan, activeCases, activeFolders)`
   - `pct = activeCases.length > 0 ? Math.round(resolvedCases.length / activeCases.length * 100) : 0`
   - Show `.pl-donut-pct`: `{pct}%`
   - Show `.pl-donut-label`: `{resolvedCases.length} of {activeCases.length} test cases in this project`

**Run history panel** (`.pl-panel`) below the cards:

Filter `activeRuns` to those where `run.planId === selectedPlan.id`, sort descending by `createdAt`.

Table columns: **ID** | **Title** | **Results** | **Created** | **Closed**

- ID: `<Link className="pl-run-key" href={testRunPath(activeProject.key, run.runKey)}>TR-{run.runKey}</Link>`
- Title: run name
- Results: a `.pl-run-bar` with segments computed from `runSummary(run)` — green for passed, red for failed, orange/yellow for blocked, grey for not run. Total width 120px; each segment proportional.
- Created: `formatRelativeTime(run.createdAt)`
- Closed: `run.sealed ? formatRelativeTime(run.createdAt)` (use `run.archivedAt` if available, else show "—" for open runs)

Empty state: `No test runs created from this plan yet.`

**Test cases tab:**

```tsx
<div className="pl-tc-placeholder">
  <i className="ti ti-checklist" style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
  Test case selection will be available in the next update.
</div>
```

#### Modals

All modals use the same backdrop + dialog pattern as `CasesScreen`/`RunsScreen`. Follow those patterns exactly.

**Create Plan modal** (`createPlanOpen`):
- Title: "New test plan"
- Fields: Title (required, autoFocus), Description (optional textarea)
- On Create: `const { planKey } = addPlan(createPlanTitle.trim(), createPlanDesc.trim() || undefined)` → reset fields → close → `router.push(planPath(activeProject.key, planKey))`
- Enter key submits; Escape closes

**Edit Plan modal** (`editPlanOpen`):
- Opens pre-filled with `selectedPlan.title` and `selectedPlan.description ?? ''`
- Fields: Title (required), Description (optional textarea)
- On Save: `updatePlan(selectedPlan.id, { title: editTitle.trim(), description: editDesc.trim() || undefined })` → close
- Opens in a slide-in panel styled like the existing `EditRunModal` — or as a centered modal; follow the most natural existing pattern

**Spawn Run modal** (`spawnRunOpen`):
- Opens with `spawnRunName` pre-filled as `"${selectedPlan.title} ${new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}"` 
- Fields: Title (required), Description (optional textarea)
- Scope info line (non-editable): `"The test run will contain {resolvedCases.length} test cases."`
- On Create: `const result = spawnRunFromPlan(selectedPlan.id, spawnRunName.trim(), spawnRunDesc.trim() || undefined)` → if result, navigate to `testRunPath(activeProject.key, result.runKey)`

---

## Files that will NOT change

- `RunsScreen.tsx`, `CasesScreen.tsx`, `prototype-runs.css`, `fresh.css`
- `admin-initial-settings.ts`, `demo-template.ts`
- Any API routes, backend, Docker config
- `apps/web/src/legacy/**`

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/data/demo-model.ts
Read apps/web/src/fresh/data/migrate-demo-state.ts
Read apps/web/src/fresh/data/demo-seed.ts
Read apps/web/src/fresh/lib/project-routes.ts
Read apps/web/src/fresh/data/project-selectors.ts
Read apps/web/src/fresh/data/FreshProvider.tsx
Read apps/web/src/fresh/screens/RunsScreen.tsx
Read apps/web/src/fresh/screens/PlansScreen.tsx
```

---

## Step 2 — Make changes

Apply in order:
1. `demo-model.ts` — types, helpers, bump schema
2. `demo-seed.ts` — seed plans constant, update `buildInitialDemoState`
3. `migrate-demo-state.ts` — v11→v12 migration
4. `project-selectors.ts` — `listActiveProjectPlans`
5. `project-routes.ts` — `planPath`, `parsePlanKey`, `switchProjectPath` update
6. `FreshProvider.tsx` — actions, reducers, callbacks, context
7. New route `plans/tp/[planKey]/page.tsx`
8. Update existing `plans/page.tsx`
9. New `prototype-plans.css`
10. Replace `PlansScreen.tsx`

---

## Step 3 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required.

---

## Step 4 — Manual checks

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. Clear localStorage (`relay-demo-v2`) to force the v12 migration. Confirm `schemaVersion === 12` in DevTools.
3. Navigate to `/DP/plans`. Confirm two seed plans appear in the left pane (Smoketest, Full Regression).
4. Click "Smoketest" — confirm URL changes to `/DP/plans/tp/00001`, the detail pane appears with Overview tab.
5. **Coverage donut**: Smoketest uses a `priority = Critical` condition — confirm % reflects actual Critical-priority cases in the seed.
6. **Full Regression coverage**: should show a high % (CTMS + eTMF folders cover most seed cases).
7. **Run history**: no runs yet — confirm empty state message.
8. **Create plan**: click "+ New plan", enter a title, confirm it appears in the list with next TP-key (TP-00003).
9. **Edit plan**: edit the title of Smoketest, confirm it updates in both the list and the detail header.
10. **Duplicate**: duplicate Smoketest — confirm "Copy of Smoketest" appears with TP-00004 (or next key), navigates to new plan.
11. **Delete**: delete a plan — confirm it's removed, detail pane shows no-selection state.
12. **Spawn run**: click "Create test run" on Full Regression — enter a name, confirm it creates a run, navigates to `/DP/testruns/tr/[runKey]`. Return to Plans and confirm the open run card shows the TR key.
13. **Project switch**: switch to a different project — confirm plan list empties (no DP plans shown) and URL strips to `/[key]/plans`.

---

## Step 5 — Commit

Run `git diff HEAD` and cross-check actual changes against the message below. Adjust to match reality, then commit.

```
Test plans: data model, FreshProvider, PlansScreen v2 (schema v12)

`demo-model.ts`
* Added `QueryCondition`, `QueryField`, `QueryOperator`, `TestQuery`, `TestPlan` interfaces
* Added `formatPlanKey()`, `planKeyToSlug()`, `slugToPlanKey()` utilities
* Added `resolvePlanCases()` and `evaluateCondition()` helpers
* Extended `DemoState` with `plansById` and `nextPlanNumByProject`
* Bumped `DEMO_SCHEMA_VERSION` from 11 to 12

`demo-seed.ts`
* Added `SEED_PLANS` constant with two seed plans: Smoketest (condition query) and Full Regression (folder queries)
* Added `plansById` and `nextPlanNumByProject` to `buildInitialDemoState()`

`migrate-demo-state.ts`
* Added v11→v12 migration: introduces `plansById` and `nextPlanNumByProject`; seeds demo plans for existing demo projects that have none

`project-selectors.ts`
* Added `listActiveProjectPlans()` — filters and sorts plans by projectId and planKey

`project-routes.ts`
* Added `planPath()` and `parsePlanKey()` helpers
* Imported `planKeyToSlug` and `slugToPlanKey` from `demo-model`
* Updated `switchProjectPath()` to strip plan selection on project switch

`FreshProvider.tsx`
* Added `ADD_PLAN`, `UPDATE_PLAN`, `DELETE_PLAN`, `DUPLICATE_PLAN` actions and reducer cases
* Extended `CREATE_RUN` action to accept optional `planId` and `planName`; stamps them on the created run
* Added `addPlan`, `updatePlan`, `deletePlan`, `duplicatePlan`, `spawnRunFromPlan` callbacks; exposed on context
* Added `activePlans` derived value via `listActiveProjectPlans`

`apps/web/src/app/(app)/[projectKey]/plans/page.tsx`
* Added `prototype-plans.css` import

`apps/web/src/app/(app)/[projectKey]/plans/tp/[planKey]/page.tsx`
* New route page — renders `PlansScreen`, imports `prototype-plans.css`

`prototype-plans.css`
* New stylesheet for PlansScreen layout, plan list, plan detail, cards, run history table

`PlansScreen.tsx`
* Complete rewrite — FreshProvider-backed, URL-routing plan manager
* Left pane: filterable plan list with TP-key, title, open run count, last run date; row "..." menu (Edit, Duplicate, Delete)
* Right pane: plan detail with Overview and Test cases tabs
* Overview tab: three cards (details, open run, coverage %), run history table with result bars
* Create, Edit, Duplicate, Delete plan modals
* Spawn run from plan modal — pre-fills title, shows case count scope, creates run and navigates to /testruns
* Project-switch guard (projectMismatch) on URL sync effects
```

---

## Step 6 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
