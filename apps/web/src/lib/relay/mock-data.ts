/**
 * Centralised mock data for frontend-only prototype screens.
 * Shapes are kept close to likely backend contracts — see prototype-contracts.ts
 * and docs/implementation/frontend-contracts.md.
 */

export type {
  AttentionItem,
  AuditEvent,
  DemoCase,
  DemoPlan,
  RunCard,
  SuiteNode,
} from '@/fresh/data/types'

export {
  ATTENTION_ITEMS,
  AUDIT_EVENTS,
  COVERAGE_ITEMS,
  DEFECT_NAMES,
  INITIAL_CASES,
  MODULES,
  PLANS,
  RUN_CARDS,
  SUITE_TREE,
} from '@/fresh/data/seed'

export type DefectSeverity = 'critical' | 'high' | 'medium' | 'low'
export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface MockDefect {
  id: string
  title: string
  severity: DefectSeverity
  status: DefectStatus
  module: string
  linkedCaseRef?: string
  linkedRunName?: string
  owner: string
  createdAt: string
  updatedAt: string
}

export const MOCK_DEFECTS: MockDefect[] = [
  {
    id: 'TI-4419',
    title: 'Viewer permission not persisted after role mapping',
    severity: 'critical',
    status: 'open',
    module: 'CTMS',
    linkedCaseRef: 'TC-1004',
    linkedRunName: 'CTMS Regression — Sprint 44',
    owner: 'Aisha Rahman',
    createdAt: '2d ago',
    updatedAt: '1h ago',
  },
  {
    id: 'TI-4421',
    title: 'Run summary export omits skipped execution rows',
    severity: 'high',
    status: 'in_progress',
    module: 'Reporting',
    linkedCaseRef: 'TC-1008',
    linkedRunName: 'Reporting Module — Integration Suite',
    owner: 'James O\'Sullivan',
    createdAt: '4d ago',
    updatedAt: '3h ago',
  },
  {
    id: 'TI-4422',
    title: 'Reporting export blocked while run data is syncing',
    severity: 'high',
    status: 'open',
    module: 'Reporting',
    linkedRunName: 'CTMS Regression — Sprint 44',
    owner: 'Marcus Webb',
    createdAt: '3d ago',
    updatedAt: '6h ago',
  },
  {
    id: 'TI-4398',
    title: 'Reader role accessing executor-only endpoint',
    severity: 'medium',
    status: 'resolved',
    module: 'SSO/IAM',
    linkedCaseRef: 'TC-1012',
    linkedRunName: 'SSO/IAM Role Matrix — Permission Validation',
    owner: 'Fatima Al-Amin',
    createdAt: '1w ago',
    updatedAt: '2d ago',
  },
  {
    id: 'TI-4402',
    title: 'Bulk API import drops request header metadata',
    severity: 'medium',
    status: 'open',
    module: 'API Gateway',
    owner: 'Marcus Webb',
    createdAt: '5d ago',
    updatedAt: '8h ago',
  },
]

export interface MockWorkspaceUser {
  name: string
  initials: string
  email: string
  role: string
  modules: string[]
}

export const MOCK_WORKSPACE_USERS: MockWorkspaceUser[] = [
  { name: 'Noel Quadri', initials: 'NQ', email: 'noel@relay-dev.local', role: 'Super Admin', modules: ['All'] },
  { name: 'Shaun Sevume', initials: 'SS', email: 'shaun@relay-dev.local', role: 'Admin', modules: ['CTMS', 'eTMF'] },
  { name: 'Priya Nair', initials: 'PN', email: 'priya@relay-dev.local', role: 'Contributor', modules: ['CTMS', 'Viewer'] },
  { name: 'Alex Viewer', initials: 'AV', email: 'alex@relay-dev.local', role: 'Viewer', modules: ['CTMS'] },
]

export const MOCK_WORKSPACE_MODULES = [
  { id: 'ctms', name: 'CTMS', cases: 87, active: true },
  { id: 'etmf', name: 'eTMF', cases: 64, active: true },
  { id: 'viewer', name: 'Viewer', cases: 29, active: true },
  { id: 'sso', name: 'SSO/IAM', cases: 52, active: true },
  { id: 'reporting', name: 'Reporting', cases: 18, active: false },
  { id: 'api-gateway', name: 'API Gateway', cases: 12, active: false },
] as const
