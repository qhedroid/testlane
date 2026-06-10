export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type ResultStatus = 'pass' | 'fail' | 'blocked' | 'skip' | 'not_run'
export type PlanStatus = 'active' | 'draft'
export type RunStatus = 'active' | 'sealed' | 'stalled' | 'completed'

export interface TestStep {
  action: string
  expected: string
}

export interface TestCase {
  id: string
  suite: string
  section: string
  title: string
  priority: Priority
  type: string
  lastResult: ResultStatus
  assignedTo: string
  steps: TestStep[]
  preconditions: string
  tags: string[]
  updatedAt: string
  archived?: boolean
}

export interface ExecCase {
  id: string
  title: string
  status: ResultStatus
  assignedTo: string
  priority: Priority
  preconditions: string
  steps: TestStep[]
  stepResults: (ResultStatus | null)[]
  defects: string[]
  comment?: string
  suite?: string
  type?: string
  tags?: string[]
}

export interface RunAssignee {
  name: string
  cases?: number
}

export interface TestRun {
  id: string
  name: string
  planId?: string
  planName: string
  status: RunStatus
  due: string
  environment: string
  pass: number
  fail: number
  blocked: number
  notrun: number
  skipped?: number
  stalled: boolean
  assignees: RunAssignee[]
  defects: string[]
  cases: ExecCase[]
}

export interface PlanModule {
  name: string
  count: number
  passRate: number | null
}

export interface SpawnedRunRef {
  id: string
  status: 'active' | 'sealed'
  name: string
  meta: string
}

export interface TestPlan {
  id: string
  title: string
  status: PlanStatus
  cases: number
  description: string
  environment: string
  owner: string
  createdBy: string
  createdAt: string
  suiteCount: string
  modules: PlanModule[]
  spawnedRuns: SpawnedRunRef[]
  runsSpawned: number
}

export interface AttentionItem {
  id: string
  title: string
  priority: Priority
  runName: string
  actor: string
  defectId?: string
}

export interface RunCard {
  id: string
  runId: string
  stalled: boolean
}

export interface DemoState {
  project: string
  cases: TestCase[]
  plans: TestPlan[]
  runs: TestRun[]
  attention: AttentionItem[]
  nextCaseNum: number
  nextPlanNum: number
  nextRunNum: number
}

export type DemoAction =
  | { type: 'SET_PROJECT'; project: string }
  | { type: 'ADD_CASE'; case: TestCase }
  | { type: 'UPDATE_CASE'; id: string; patch: Partial<TestCase> }
  | { type: 'ARCHIVE_CASES'; ids: string[] }
  | { type: 'ADD_PLAN'; plan: TestPlan }
  | { type: 'UPDATE_PLAN'; id: string; patch: Partial<TestPlan> }
  | { type: 'SPAWN_RUN'; planId: string; run: TestRun }
  | { type: 'UPDATE_RUN_CASE'; runId: string; caseId: string; patch: Partial<ExecCase> }
  | { type: 'SET_RUN_CASE_STATUS'; runId: string; caseId: string; status: ResultStatus }
  | { type: 'SET_STEP_RESULT'; runId: string; caseId: string; stepIndex: number; status: ResultStatus }
  | { type: 'LINK_DEFECT'; runId: string; caseId: string; defectId: string }
  | { type: 'SEAL_RUN'; runId: string }
  | { type: 'RESET' }
