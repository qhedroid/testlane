export type ResultStatus = 'pass' | 'fail' | 'blocked' | 'not_run' | 'skip'
export type Priority = 'critical' | 'high' | 'medium' | 'low'

export interface CaseStep {
  a: string
  e: string
}

export interface DemoCase {
  id: string
  suite: string
  title: string
  pri: Priority
  type: string
  last: ResultStatus
  by: string
  steps: number
  upd: string
  precond: string
  stepList: CaseStep[]
  tags?: string[]
}

export interface ExecCase {
  id: string
  title: string
  status: ResultStatus
  by: string
  pri: Priority
  precond: string
  steps: CaseStep[]
  sr: (ResultStatus | null)[]
  defects: string[]
}

export interface PlanModule {
  name: string
  ct: number
  pass: number | null
}

export interface PlanRun {
  status: 'act' | 'pass'
  name: string
  meta: string
}

export interface DemoPlan {
  title: string
  status: 'active' | 'draft'
  cases: number
  desc: string
  env: string
  owner: string
  suiteCt: string
  modules: PlanModule[]
  runs: PlanRun[]
}

export interface RunCard {
  id: string
  name: string
  plan: string
  status: string
  due: string
  total: number
  pass: number
  fail: number
  blocked: number
  notrun: number
  stalled: boolean
  assignees: { n: string }[]
  env: string
  defects: string[]
}

export interface SuiteSection {
  name: string
  count: number
  empty?: boolean
}

export interface SuiteNode {
  id: string
  name: string
  count: number
  sections: SuiteSection[]
}

export interface AttentionItem {
  stripe: 'crit' | 'high' | 'med'
  title: string
  pri: Priority
  run: string
  actor: string
  defectId?: string
}

export interface AuditEvent {
  icon: string
  iconClass: string
  html: string
  ctx: string
  time: string
}

export interface FreshState {
  module: string
  cases: DemoCase[]
  execCases: ExecCase[]
  sealedRunIds: string[]
  currentRunId: string
  currentRunName: string
  nextCaseNum: number
}

export type FreshAction =
  | { type: 'SET_MODULE'; module: string }
  | { type: 'ADD_CASE'; case: DemoCase }
  | { type: 'SET_EXEC_CASES'; cases: ExecCase[] }
  | { type: 'UPDATE_EXEC_CASE'; index: number; patch: Partial<ExecCase> }
  | { type: 'SEAL_RUN'; runId: string }
  | { type: 'SET_CURRENT_RUN'; runId: string; name: string }
