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

/** Keep current module when switching project keys */
export function switchProjectPath(pathname: string, newProjectKey: string): string {
  const parsed = parseProjectPath(pathname)
  if (parsed) return projectPath(newProjectKey, parsed.module)
  const legacy = LEGACY_PATH_TO_MODULE[pathname]
  if (legacy) return projectPath(newProjectKey, legacy)
  return projectPath(newProjectKey, 'dashboard')
}
