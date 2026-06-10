import type { Case, CaseExecution, CasePriority, CaseStep, DemoRun, DemoState, ExecStatus, Folder } from './demo-model'
import { LEGACY_TO_EXEC, LEGACY_TO_PRIORITY, newId } from './demo-model'
import { INITIAL_CASES, INITIAL_EXEC_CASES, RUN_CARDS, RUN_PICKER_LIST } from './seed'
import type { RunCard } from './types'
import type { DemoCase, ExecCase, ResultStatus } from './types'

export const SEED_FOLDERS: Folder[] = [
  { id: 'f-ctms', name: 'CTMS', parentId: null },
  { id: 'f-rec', name: 'Record management', parentId: 'f-ctms' },
  { id: 'f-role', name: 'Role & permissions', parentId: 'f-ctms' },
  { id: 'f-assign', name: 'User assignment', parentId: 'f-ctms' },
  { id: 'f-audit', name: 'Audit history', parentId: 'f-ctms' },
  { id: 'f-etmf', name: 'eTMF', parentId: null },
  { id: 'f-upload', name: 'Document upload', parentId: 'f-etmf' },
  { id: 'f-qc', name: 'Classification & QC', parentId: 'f-etmf' },
  { id: 'f-viewer', name: 'Viewer', parentId: null },
  { id: 'f-grid', name: 'Grid & filtering', parentId: 'f-viewer' },
  { id: 'f-import', name: 'Import validation', parentId: null },
]

const FOLDER_BY_SUITE: Record<string, string> = {
  CTMS: 'f-rec',
  eTMF: 'f-upload',
  Viewer: 'f-grid',
  Reporting: 'f-rec',
  GlobalLearn: 'f-rec',
  'SSO/IAM': 'f-role',
}

const NOW = '2026-06-01T10:00:00.000Z'

function legacyStepToCaseStep(
  action: string,
  expected: string,
  idx: number,
  seedComment?: { author: string; body: string },
): CaseStep {
  return {
    id: `step-${idx}`,
    action,
    expected,
    comments: seedComment
      ? [{ id: newId('cmt'), author: seedComment.author, createdAt: NOW, body: seedComment.body }]
      : [],
  }
}

function legacyCaseToCase(c: DemoCase, folderId?: string | null): Case {
  return {
    id: c.id,
    title: c.title,
    folderId: folderId ?? FOLDER_BY_SUITE[c.suite] ?? null,
    priority: LEGACY_TO_PRIORITY[c.pri],
    type: c.type,
    preconditions: c.precond,
    steps: c.stepList.map((s, i) => legacyStepToCaseStep(s.a, s.e, i)),
    generalComments: [],
    tags: c.tags ?? [c.suite.toLowerCase()],
    updatedAt: NOW,
    assignee: c.by,
  }
}

function execCaseToCase(c: ExecCase): Case {
  const steps: CaseStep[] = c.steps.map((s, i) => {
    const seedComment =
      c.sr[i] === 'fail' && i === 0 && c.id === 'TC-2041'
        ? {
            author: 'Nadim Sharif',
            body: 'Viewer permission is saved on submit but reverts to previous value after profile reload.',
          }
        : undefined
    return legacyStepToCaseStep(s.a, s.e, i, seedComment)
  })

  const generalComments =
    c.id === 'TC-2041'
      ? [
          {
            id: newId('gcmt'),
            author: 'Shaun Sevume',
            createdAt: '2026-06-09T13:58:00.000Z',
            body: 'Reproduced on both UAT and staging. Role sync delay suspected after the permission mapper update.',
          },
        ]
      : []

  return {
    id: c.id,
    title: c.title,
    folderId: 'f-role',
    priority: LEGACY_TO_PRIORITY[c.pri],
    type: 'Functional',
    preconditions: c.precond,
    steps,
    generalComments,
    tags: ['ctms', 'role-mapping'],
    updatedAt: NOW,
    assignee: c.by,
  }
}

function srToExecStatus(sr: ResultStatus | null): ExecStatus {
  if (!sr) return 'Not run'
  return LEGACY_TO_EXEC[sr]
}

function buildExecution(c: ExecCase): CaseExecution {
  const stepResults: Record<string, ExecStatus> = {}
  c.steps.forEach((_, i) => {
    stepResults[`step-${i}`] = srToExecStatus(c.sr[i])
  })
  return {
    status: LEGACY_TO_EXEC[c.status],
    assignee: c.by,
    stepResults,
    defects: [...c.defects],
  }
}

function distributeStatuses(
  n: number,
  pass: number,
  fail: number,
  blocked: number,
  notrun: number,
): ExecStatus[] {
  const total = pass + fail + blocked + notrun
  if (n <= 0) return []
  if (total <= 0) return Array(n).fill('Not run')
  const scale = n / total
  const counts = [
    Math.round(pass * scale),
    Math.round(fail * scale),
    Math.round(blocked * scale),
    Math.round(notrun * scale),
  ]
  let sum = counts.reduce((a, b) => a + b, 0)
  while (sum > n) {
    const i = counts.findIndex((c) => c > 0)
    if (i < 0) break
    counts[i] -= 1
    sum -= 1
  }
  while (sum < n) {
    counts[3] += 1
    sum += 1
  }
  const statuses: ExecStatus[] = [
    ...Array(counts[0]).fill('Passed' as ExecStatus),
    ...Array(counts[1]).fill('Failed' as ExecStatus),
    ...Array(counts[2]).fill('Blocked' as ExecStatus),
    ...Array(counts[3]).fill('Not run' as ExecStatus),
  ]
  return statuses.slice(0, n)
}

function buildExecutionFromStatus(c: ExecCase, status: ExecStatus): CaseExecution {
  const base = buildExecution(c)
  const stepResults: Record<string, ExecStatus> = {}
  c.steps.forEach((_, i) => {
    stepResults[`step-${i}`] = status === 'Not run' ? 'Not run' : status
  })
  return { ...base, status, stepResults }
}

function buildRunFromCard(card: RunCard, sealed = false): DemoRun {
  const caseOrder = INITIAL_EXEC_CASES.map((c) => c.id)
  const statuses = distributeStatuses(caseOrder.length, card.pass, card.fail, card.blocked, card.notrun)
  const executions: Record<string, CaseExecution> = {}
  INITIAL_EXEC_CASES.forEach((c, i) => {
    executions[c.id] = buildExecutionFromStatus(c, statuses[i] ?? 'Not run')
  })
  return {
    id: card.id,
    name: card.name,
    planId: `plan-${card.id.toLowerCase()}`,
    planName: card.plan,
    due: card.due,
    createdAt: '2026-05-28T09:00:00.000Z',
    sealed,
    caseOrder,
    executions,
  }
}

function buildDefaultRun(): DemoRun {
  const card = RUN_CARDS[0]
  const caseOrder = INITIAL_EXEC_CASES.map((c) => c.id)
  const executions: Record<string, CaseExecution> = {}
  for (const c of INITIAL_EXEC_CASES) {
    executions[c.id] = buildExecution(c)
  }
  return {
    id: card.id,
    name: card.name,
    planId: 'plan-ctms',
    planName: card.plan,
    due: card.due,
    createdAt: '2026-05-28T09:00:00.000Z',
    sealed: false,
    caseOrder,
    executions,
  }
}

function buildAllRuns(): DemoRun[] {
  return RUN_PICKER_LIST.map((picker) => {
    const card = RUN_CARDS.find((r) => r.id === picker.id)
    if (card) {
      if (card.id === 'R1') return buildDefaultRun()
      return buildRunFromCard(card, false)
    }
    if (picker.id === 'R6') {
      const sealedCard: RunCard = {
        id: 'R6',
        name: picker.name,
        plan: 'Sprint 43 Regression',
        status: 'sealed',
        due: '28 Apr',
        total: picker.cases,
        pass: picker.cases,
        fail: 0,
        blocked: 0,
        notrun: 0,
        stalled: false,
        assignees: [{ n: 'Noel Quadri' }],
        env: 'UAT',
        defects: [],
      }
      return buildRunFromCard(sealedCard, true)
    }
    return buildDefaultRun()
  })
}

export function mergeSeedRuns(state: DemoState): DemoState {
  const seedRuns = buildAllRuns()
  const byId = new Map(state.runs.map((r) => [r.id, r]))
  for (const run of seedRuns) {
    if (!byId.has(run.id)) byId.set(run.id, run)
  }
  const currentRunId = byId.has(state.currentRunId) ? state.currentRunId : seedRuns[0]?.id ?? state.currentRunId
  return { ...state, runs: Array.from(byId.values()), currentRunId }
}

export function buildInitialDemoState(): DemoState {
  const libraryCases = INITIAL_CASES.map((c) => legacyCaseToCase(c))
  const runCases = INITIAL_EXEC_CASES.map((c) => execCaseToCase(c))

  const caseMap = new Map<string, Case>()
  for (const c of libraryCases) caseMap.set(c.id, c)
  for (const c of runCases) caseMap.set(c.id, c)

  const unfiledCases: Case[] = [
    {
      id: 'TC-UF-01',
      title: 'Ad-hoc smoke check for release candidate build',
      folderId: null,
      priority: 'Medium',
      type: 'Smoke',
      preconditions: 'RC build deployed to UAT.',
      steps: [
        { id: 'step-0', action: 'Open dashboard and verify build label', expected: 'Build label matches RC tag', comments: [] },
      ],
      generalComments: [],
      tags: ['smoke'],
      updatedAt: NOW,
      assignee: 'Shaun Sevume',
    },
    {
      id: 'TC-UF-02',
      title: 'Verify notification banner after maintenance window',
      folderId: null,
      priority: 'Low',
      type: 'Functional',
      preconditions: 'Maintenance window completed within last 24h.',
      steps: [
        { id: 'step-0', action: 'Log in after maintenance', expected: 'Maintenance banner is visible once', comments: [] },
        { id: 'step-1', action: 'Dismiss banner and reload', expected: 'Banner does not reappear', comments: [] },
      ],
      generalComments: [],
      tags: ['ops'],
      updatedAt: NOW,
      assignee: 'Nasir Dipto',
    },
  ]

  for (const c of unfiledCases) caseMap.set(c.id, c)

  const defaultRun = buildDefaultRun()

  return {
    module: 'TI-Core Platform',
    folders: SEED_FOLDERS,
    cases: Array.from(caseMap.values()),
    runs: buildAllRuns(),
    currentRunId: defaultRun.id,
    nextCaseNum: 13,
  }
}

export function getCaseById(state: DemoState, caseId: string): Case | undefined {
  return state.cases.find((c) => c.id === caseId)
}

export function getCurrentRun(state: DemoState): DemoRun {
  return state.runs.find((r) => r.id === state.currentRunId) ?? state.runs[0]
}
