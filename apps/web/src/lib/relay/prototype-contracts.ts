/**
 * Route-level prototype contract metadata for agents and UI labelling.
 * Authoritative detail: docs/implementation/frontend-contracts.md
 */

export type RouteDataState = 'api' | 'mock' | 'placeholder'

export interface RouteContract {
  route: string
  label: string
  dataState: RouteDataState
  futureApis?: string[]
  notes?: string
}

export const ROUTE_CONTRACTS: RouteContract[] = [
  {
    route: '/dashboard',
    label: 'Dashboard',
    dataState: 'mock',
    futureApis: ['GET /api/dashboard/summary', 'GET /api/runs?status=active'],
    notes: 'Metrics and needs-attention items are static seed data.',
  },
  {
    route: '/cases',
    label: 'Test Cases',
    dataState: 'mock',
    futureApis: [
      'GET /api/test-cases',
      'POST /api/test-cases',
      'GET /api/test-cases/:caseId',
      'PATCH /api/test-cases/:caseId',
    ],
    notes: 'User-created cases persist in localStorage only.',
  },
  {
    route: '/plans',
    label: 'Test Plans',
    dataState: 'mock',
    futureApis: ['GET /api/test-plans', 'GET /api/test-plans/:planId'],
    notes: 'Spawn run navigates to /runs; does not call POST /api/runs.',
  },
  {
    route: '/runs',
    label: 'Test Runs',
    dataState: 'api',
    futureApis: [
      'GET /api/runs',
      'POST /api/runs',
      'GET /api/runs/:runId',
      'POST /api/runs/:runId/cases/:runCaseId/result',
    ],
    notes: 'Execution workspace — MySQL-backed via existing API routes.',
  },
  {
    route: '/audit',
    label: 'Audit History',
    dataState: 'mock',
    futureApis: ['GET /api/audit-events'],
    notes: 'Static timeline; audit_log table exists but has no read API yet.',
  },
  {
    route: '/defects',
    label: 'Defects',
    dataState: 'mock',
    futureApis: ['GET /api/defects', 'POST /api/defects', 'PATCH /api/defects/:defectId'],
    notes: 'Defect linking in /runs is not wired to this screen.',
  },
  {
    route: '/settings',
    label: 'Settings',
    dataState: 'mock',
    futureApis: ['GET /api/workspace', 'GET /api/users'],
    notes: 'Workspace and role preview only; no auth or settings API.',
  },
  {
    route: '/reports',
    label: 'Reports',
    dataState: 'placeholder',
    futureApis: ['GET /api/reports'],
  },
  {
    route: '/integrations',
    label: 'Integrations',
    dataState: 'placeholder',
    futureApis: ['GET /api/integrations'],
  },
]

export function contractForRoute(pathname: string): RouteContract | undefined {
  const normalised = pathname.split('?')[0]
  return ROUTE_CONTRACTS.find(
    (c) => normalised === c.route || normalised.startsWith(`${c.route}/`),
  )
}
