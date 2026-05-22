export interface CaseCounts {
  total: number
  passed: number
  failed: number
  blocked: number
  skipped: number
  notRun: number
}

export interface RunListItem {
  id: string
  runRef: string
  title: string
  status: 'active' | 'stalled' | 'sealed' | 'archived'
  environment: string | null
  createdAt: string
  caseCounts: CaseCounts
}

export interface RunDetailCase {
  testRunCaseId: string
  originalTestCaseId: string
  caseRef: string
  title: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  type: string
  assignedTo: string | null
  status: 'not_run' | 'pass' | 'fail' | 'blocked' | 'skip'
  comment: string | null
  executedBy: string | null
  executedAt: string | null
  position: number
}

export interface RunDetail {
  id: string
  runRef: string
  title: string
  status: RunListItem['status']
  environment: string | null
  createdAt: string
  testPlanId: string | null
  projectId: string
  isStalled: boolean
  caseCounts: CaseCounts
  testRunCases: RunDetailCase[]
}

export type CaseResultStatusInput =
  | 'not_run'
  | 'pass'
  | 'fail'
  | 'blocked'
  | 'skipped'
  | 'skip'

export interface CreateRunResult {
  id: string
  runRef: string
  title: string
  status: 'active'
  caseCount: number
  stepCount: number
  environment: string | null
  createdAt: string
  testPlanId: string
  projectId: string
}
