/** Project-key-prefixed route helpers for the FRESH prototype */

import { planKeyToSlug, slugToPlanKey } from '../data/demo-model'

// Real backend default (mvp-backend "wire everything" session — real project
// picker replaced the old client-only 'DP' demo project). Matches the CTMS
// project slug from packages/db/src/seed/ids.ts (same project
// apps/web/src/lib/relay/config.ts's RELAY_PROJECT_ID already points at for
// /runs/api). Only used as an ultimate fallback before/if the real project
// list hasn't loaded yet — see ProjectRouteSync.tsx and FreshProvider.tsx's
// REGISTER_REAL_PROJECTS mount effect.
export const DEFAULT_PROJECT_KEY = 'CTMS'

export const MODULE_SLUGS = {
  dashboard: 'dashboard',
  mywork: 'mywork',
  cases: 'testcases',
  testruns: 'testruns',
  plans: 'plans',
  milestones: 'milestones',
  requirements: 'requirements',
  audit: 'audit',
  defects: 'defects',
  settings: 'settings',
  reports: 'reports',
  integrations: 'integrations',
  aistudio: 'aistudio',
} as const

export type ModuleSlug = keyof typeof MODULE_SLUGS

const SLUG_TO_MODULE: Record<string, ModuleSlug> = Object.fromEntries(
  Object.entries(MODULE_SLUGS).map(([module, slug]) => [slug, module as ModuleSlug]),
) as Record<string, ModuleSlug>

/** Legacy unprefixed paths → module slug */
export const LEGACY_PATH_TO_MODULE: Record<string, ModuleSlug> = {
  '/dashboard': 'dashboard',
  '/my-work': 'mywork',
  '/mywork': 'mywork',
  '/cases': 'cases',
  '/test-cases': 'cases',
  '/runs': 'testruns',
  '/plans': 'plans',
  '/test-plans': 'plans',
  '/milestones': 'milestones',
  '/requirements': 'requirements',
  '/audit': 'audit',
  '/defects': 'defects',
  '/settings': 'settings',
  '/reports': 'reports',
  '/integrations': 'integrations',
  '/aistudio': 'aistudio',
  '/ai-studio': 'aistudio',
  '/testcases': 'cases',
}

export function projectPath(projectKey: string, module: ModuleSlug = 'dashboard'): string {
  return `/${projectKey}/${MODULE_SLUGS[module]}`
}

/** Canonical test run path — with or without selected run key. */
export function testRunPath(projectKey: string, runKey?: string): string {
  const base = projectPath(projectKey, 'testruns')
  return runKey ? `${base}/tr/${runKey}` : base
}

/** Extract runKey from /:projectKey/testruns/tr/:runKey paths. */
export function parseTestRunKey(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  // /projectKey/testruns/tr/runKey  OR  /projectKey/testruns/tr/runKey/tc/caseKey
  if ((parts.length === 4 || parts.length === 6) && parts[1] === MODULE_SLUGS.testruns && parts[2] === 'tr') {
    return parts[3]
  }
  return null
}

/** Canonical path for a specific test case inside a test run. */
export function testRunCasePath(projectKey: string, runKey: string, caseKey: string): string {
  return `${testRunPath(projectKey, runKey)}/tc/${caseKeyToSlug(caseKey)}`
}

/** Extract caseKey from /:projectKey/testruns/tr/:runKey/tc/:caseKey paths. */
export function parseTestRunCaseKey(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  // parts: [projectKey, 'testruns', 'tr', runKey, 'tc', caseKey]
  if (parts.length === 6 && parts[1] === MODULE_SLUGS.testruns && parts[2] === 'tr' && parts[4] === 'tc') {
    return parts[5]
  }
  return null
}

/** Strip TC- prefix from a caseKey to produce a clean URL slug. */
export function caseKeyToSlug(caseKey: string): string {
  return caseKey.replace(/^TC-/i, '')
}

/** Restore TC- prefix from a URL slug back to a caseKey. */
export function slugToCaseKey(slug: string): string {
  return /^TC-/i.test(slug) ? slug : `TC-${slug}`
}

/** Canonical test case path — with or without selected case key. */
export function testCasePath(projectKey: string, caseKey?: string): string {
  const base = projectPath(projectKey, 'cases')
  return caseKey ? `${base}/tc/${caseKeyToSlug(caseKey)}` : base
}

/** Extract caseKey from /:projectKey/cases/tc/:caseKey paths. */
export function parseTestCaseKey(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 4 && parts[1] === MODULE_SLUGS.cases && parts[2] === 'tc') {
    return slugToCaseKey(parts[3])
  }
  return null
}

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

export function parseProjectPath(pathname: string): { projectKey: string; module: ModuleSlug } | null {
  if (pathname.startsWith('/runs/api')) return null
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length < 2) return null
  const [rawKey, slug] = parts
  const module = SLUG_TO_MODULE[slug]
  if (!module) return null
  return { projectKey: rawKey.toUpperCase(), module }
}

export function getModuleFromPathname(pathname: string): ModuleSlug | null {
  const parsed = parseProjectPath(pathname)
  if (parsed) return parsed.module
  return LEGACY_PATH_TO_MODULE[pathname] ?? null
}

/** Keep current module when switching project keys. Strips test run selection (per-project namespace). */
export function switchProjectPath(pathname: string, newProjectKey: string): string {
  if (parseTestCaseKey(pathname)) return projectPath(newProjectKey, 'cases')
  if (parseTestRunKey(pathname)) return projectPath(newProjectKey, 'testruns')
  if (parsePlanKey(pathname)) return projectPath(newProjectKey, 'plans')
  const parsed = parseProjectPath(pathname)
  if (parsed) return projectPath(newProjectKey, parsed.module)
  const legacy = LEGACY_PATH_TO_MODULE[pathname]
  if (legacy) return projectPath(newProjectKey, legacy)
  return projectPath(newProjectKey, 'dashboard')
}
