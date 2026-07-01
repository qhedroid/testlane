import type { Case, CaseExecution, DemoRun, ExecStatus, Folder } from './demo-model'
import { newId } from './demo-model'
import { buildDemoProjectEntities } from './demo-seed'

const TEMPLATE_PROJECT_ID = '__demo-template__'

export interface ImmutableDemoTemplate {
  projectDescription: string
  folders: Folder[]
  cases: Case[]
  runs: DemoRun[]
  defaultRunId: string
  nextCaseNum: number
  nextRunNum: number
}

let cachedTemplate: ImmutableDemoTemplate | null = null

/** Pristine demo workspace snapshot — never read from live store. */
export function getImmutableDemoTemplate(): ImmutableDemoTemplate {
  if (!cachedTemplate) {
    const built = buildDemoProjectEntities(TEMPLATE_PROJECT_ID)
    cachedTemplate = {
      projectDescription: 'Default demo workspace with seed cases, folders, and runs.',
      folders: structuredClone(built.folders),
      cases: structuredClone(built.cases),
      runs: structuredClone(built.runs),
      defaultRunId: built.defaultRunId,
      nextCaseNum: built.nextCaseNum,
      nextRunNum: built.nextRunNum,
    }
  }
  return cachedTemplate
}

export function cloneDemoTemplateEntities(
  template: ImmutableDemoTemplate,
  projectId: string,
): {
  folders: Folder[]
  cases: Case[]
  runs: DemoRun[]
  defaultRunId: string
  nextCaseNum: number
  nextRunNum: number
} {
  const folderIdMap = new Map<string, string>()
  const folders: Folder[] = template.folders.map((f) => {
    const id = newId('folder')
    folderIdMap.set(f.id, id)
    return { id, projectId, name: f.name, parentId: f.parentId }
  })
  for (const f of folders) {
    if (f.parentId) f.parentId = folderIdMap.get(f.parentId) ?? null
  }

  const caseIdMap = new Map<string, string>()
  const stepIdMaps = new Map<string, Map<string, string>>()

  const cases: Case[] = template.cases.map((c) => {
    const newCaseId = newId('case')
    caseIdMap.set(c.id, newCaseId)
    const stepMap = new Map<string, string>()
    const steps = c.steps.map((s) => {
      const stepId = newId('step')
      stepMap.set(s.id, stepId)
      return {
        ...s,
        id: stepId,
        comments: s.comments.map((cm) => ({ ...cm, id: newId('cmt') })),
      }
    })
    stepIdMaps.set(c.id, stepMap)
    return {
      ...c,
      id: newCaseId,
      projectId,
      folderId: c.folderId ? folderIdMap.get(c.folderId) ?? null : null,
      steps,
      generalComments: c.generalComments.map((cm) => ({ ...cm, id: newId('gcmt') })),
      updatedAt: c.updatedAt,
    }
  })

  const runIdMap = new Map<string, string>()
  const runs: DemoRun[] = template.runs.map((r) => {
    const id = newId('run')
    runIdMap.set(r.id, id)
    return { ...r, id, projectId }
  })

  runs.forEach((run) => {
    const src = template.runs.find((r) => runIdMap.get(r.id) === run.id)!
    run.caseOrder = src.caseOrder.map((cid) => caseIdMap.get(cid) ?? cid)
    const executions: Record<string, CaseExecution> = {}
    for (const [oldCaseId, ex] of Object.entries(src.executions)) {
      const newCaseId = caseIdMap.get(oldCaseId)
      if (!newCaseId) continue
      const stepMap = stepIdMaps.get(oldCaseId) ?? new Map<string, string>()
      const stepResults: Record<string, ExecStatus> = {}
      for (const [oldStepId, status] of Object.entries(ex.stepResults)) {
        stepResults[stepMap.get(oldStepId) ?? newId('step')] = status
      }
      executions[newCaseId] = {
        ...ex,
        stepResults,
        defects: ex.defects ? [...ex.defects] : undefined,
      }
    }
    run.executions = executions
  })

  const defaultRunId = runIdMap.get(template.defaultRunId) ?? runs[0]?.id ?? ''

  return {
    folders,
    cases,
    runs,
    defaultRunId,
    nextCaseNum: template.nextCaseNum,
    nextRunNum: template.nextRunNum,
  }
}
