import type { DemoAction, DemoState, ExecCase, ResultStatus, TestRun } from './types'
import { createInitialState } from './seed'

const STORAGE_KEY = 'relay-demo-v1'

function recountRun(run: TestRun): TestRun {
  const counts = run.cases.reduce(
    (acc, c) => {
      if (c.status === 'pass') acc.pass++
      else if (c.status === 'fail') acc.fail++
      else if (c.status === 'blocked') acc.blocked++
      else if (c.status === 'skip') acc.skipped++
      else acc.notrun++
      return acc
    },
    { pass: 0, fail: 0, blocked: 0, skipped: 0, notrun: 0 },
  )
  return { ...run, ...counts }
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'SET_PROJECT':
      return { ...state, project: action.project }

    case 'ADD_CASE':
      return { ...state, cases: [...state.cases, action.case] }

    case 'UPDATE_CASE':
      return {
        ...state,
        cases: state.cases.map((c) =>
          c.id === action.id ? { ...c, ...action.patch } : c,
        ),
      }

    case 'ARCHIVE_CASES':
      return {
        ...state,
        cases: state.cases.map((c) =>
          action.ids.includes(c.id) ? { ...c, archived: true } : c,
        ),
      }

    case 'ADD_PLAN':
      return { ...state, plans: [...state.plans, action.plan] }

    case 'UPDATE_PLAN':
      return {
        ...state,
        plans: state.plans.map((p) =>
          p.id === action.id ? { ...p, ...action.patch } : p,
        ),
      }

    case 'SPAWN_RUN': {
      const plan = state.plans.find((p) => p.id === action.planId)
      if (!plan) return state
      const spawned = {
        id: action.run.id,
        status: 'active' as const,
        name: action.run.name,
        meta: 'Started just now · Shaun Sevume',
      }
      return {
        ...state,
        runs: [...state.runs, action.run],
        plans: state.plans.map((p) =>
          p.id === action.planId
            ? {
                ...p,
                runsSpawned: p.runsSpawned + 1,
                spawnedRuns: [spawned, ...p.spawnedRuns],
              }
            : p,
        ),
      }
    }

    case 'UPDATE_RUN_CASE': {
      return {
        ...state,
        runs: state.runs.map((run) => {
          if (run.id !== action.runId) return run
          const cases = run.cases.map((c) =>
            c.id === action.caseId ? { ...c, ...action.patch } : c,
          )
          return recountRun({ ...run, cases })
        }),
      }
    }

    case 'SET_RUN_CASE_STATUS':
      return demoReducer(state, {
        type: 'UPDATE_RUN_CASE',
        runId: action.runId,
        caseId: action.caseId,
        patch: { status: action.status },
      })

    case 'SET_STEP_RESULT': {
      return {
        ...state,
        runs: state.runs.map((run) => {
          if (run.id !== action.runId) return run
          const cases = run.cases.map((c) => {
            if (c.id !== action.caseId) return c
            const stepResults = [...c.stepResults]
            while (stepResults.length < c.steps.length) stepResults.push(null)
            stepResults[action.stepIndex] = action.status
            return { ...c, stepResults }
          })
          return { ...run, cases }
        }),
      }
    }

    case 'SEAL_RUN':
      return {
        ...state,
        runs: state.runs.map((run) =>
          run.id === action.runId ? { ...run, status: 'sealed' as const } : run,
        ),
      }

    case 'LINK_DEFECT': {
      return {
        ...state,
        runs: state.runs.map((run) => {
          if (run.id !== action.runId) return run
          const cases = run.cases.map((c) => {
            if (c.id !== action.caseId) return c
            if (c.defects.includes(action.defectId)) return c
            return { ...c, defects: [...c.defects, action.defectId] }
          })
          const defects = run.defects.includes(action.defectId)
            ? run.defects
            : [...run.defects, action.defectId]
          return { ...run, cases, defects }
        }),
      }
    }

    case 'RESET':
      return createInitialState()

    default:
      return state
  }
}

export function loadPersistedState(): DemoState {
  if (typeof window === 'undefined') return createInitialState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()
    const parsed = JSON.parse(raw) as DemoState
    return { ...createInitialState(), ...parsed }
  } catch {
    return createInitialState()
  }
}

export function persistState(state: DemoState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore quota errors in demo
  }
}

export function runTotal(run: TestRun): number {
  return run.pass + run.fail + run.blocked + run.notrun + (run.skipped ?? 0)
}

export function runProgress(run: TestRun): number {
  const total = runTotal(run)
  if (total === 0) return 0
  return Math.round(((run.pass + run.fail + run.blocked + (run.skipped ?? 0)) / total) * 100)
}

export function statusPillClass(status: ResultStatus | 'active' | 'sealed' | 'draft' | 'stalled'): string {
  const map: Record<string, string> = {
    pass: 'pill p-pass',
    fail: 'pill p-fail',
    blocked: 'pill p-blocked',
    skip: 'pill p-skip',
    not_run: 'pill p-not_run',
    active: 'pill p-active',
    sealed: 'pill p-pass',
    draft: 'pill p-draft',
    stalled: 'pill p-blocked',
  }
  return map[status] ?? 'pill p-not_run'
}

export function priorityClass(priority: string): string {
  const map: Record<string, string> = {
    critical: 'pri pr-crit',
    high: 'pri pr-high',
    medium: 'pri pr-med',
    low: 'pri pr-low',
  }
  return map[priority] ?? 'pri pr-med'
}

export function dotClass(status: ResultStatus): string {
  const map: Record<ResultStatus, string> = {
    pass: 'ec-dot d-p',
    fail: 'ec-dot d-f',
    blocked: 'ec-dot d-b',
    skip: 'ec-dot d-s',
    not_run: 'ec-dot d-n',
  }
  return map[status]
}

export function nextId(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(4, '0')}`
}

export function makeSpawnedRun(planId: string, state: DemoState, name?: string): TestRun {
  const plan = state.plans.find((p) => p.id === planId)
  const id = nextId('R', state.nextRunNum)
  const cases: ExecCase[] = state.cases
    .filter((c) => !c.archived)
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      title: c.title,
      status: 'not_run' as const,
      assignedTo: c.assignedTo,
      priority: c.priority,
      preconditions: c.preconditions,
      steps: c.steps,
      stepResults: c.steps.map(() => null),
      defects: [],
      suite: c.suite,
      type: c.type,
      tags: c.tags,
    }))

  return {
    id,
    name: name ?? `${plan?.title.split('—')[0].trim()} — Sprint 45`,
    planId,
    planName: plan?.title ?? 'Test plan',
    status: 'active',
    due: '19 May',
    environment: plan?.environment ?? 'UAT',
    pass: 0,
    fail: 0,
    blocked: 0,
    notrun: cases.length,
    stalled: false,
    assignees: [{ name: 'Shaun Sevume', cases: cases.length }],
    defects: [],
    cases,
  }
}
