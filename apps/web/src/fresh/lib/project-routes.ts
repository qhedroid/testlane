/** Project-key-prefixed route helpers for the FRESH prototype */

export const DEFAULT_PROJECT_KEY = 'DP'

export const MODULE_SLUGS = {
  dashboard: 'dashboard',
  cases: 'cases',
  testruns: 'testruns',
  plans: 'plans',
  audit: 'audit',
  defects: 'defects',
  settings: 'settings',
  reports: 'reports',
  integrations: 'integrations',
} as const

export type ModuleSlug = keyof typeof MODULE_SLUGS

const SLUG_TO_MODULE: Record<string, ModuleSlug> = Object.fromEntries(
  Object.entries(MODULE_SLUGS).map(([module, slug]) => [slug, module as ModuleSlug]),
) as Record<string, ModuleSlug>

/** Legacy unprefixed paths → module slug */
export const LEGACY_PATH_TO_MODULE: Record<string, ModuleSlug> = {
  '/dashboard': 'dashboard',
  '/cases': 'cases',
  '/test-cases': 'cases',
  '/runs': 'testruns',
  '/plans': 'plans',
  '/test-plans': 'plans',
  '/audit': 'audit',
  '/defects': 'defects',
  '/settings': 'settings',
  '/reports': 'reports',
  '/integrations': 'integrations',
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
  if (parts.length === 4 && parts[1] === MODULE_SLUGS.testruns && parts[2] === 'tr') {
    return parts[3]
  }
  return null
}

/** Canonical test case path — with or without selected case key. */
export function testCasePath(projectKey: string, caseKey?: string): string {
  const base = projectPath(projectKey, 'cases')
  return caseKey ? `${base}/tc/${caseKey}` : base
}

/** Extract caseKey from /:projectKey/cases/tc/:caseKey paths. */
export function parseTestCaseKey(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 4 && parts[1] === MODULE_SLUGS.cases && parts[2] === 'tc') {
    return parts[3]
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
  const parsed = parseProjectPath(pathname)
  if (parsed) return projectPath(newProjectKey, parsed.module)
  const legacy = LEGACY_PATH_TO_MODULE[pathname]
  if (legacy) return projectPath(newProjectKey, legacy)
  return projectPath(newProjectKey, 'dashboard')
}
