import type { Case, DemoRun, DemoState, Folder, Project } from './demo-model'
import { CLONED_DEMO_KEY_PREFIX, newId } from './demo-model'
import { cloneDemoTemplateEntities, getImmutableDemoTemplate } from './demo-template'

export function projectHasDemoDashboard(project: Project | undefined): boolean {
  return project?.seedTemplate === 'demo'
}

/** Next available cloned demo key: DP1, DP2, … (never overwrites base `DP`). */
export function nextClonedDemoProjectKey(state: DemoState): string {
  const keys = new Set(Object.values(state.projectsById).map((p) => p.key))
  let n = 1
  while (keys.has(`${CLONED_DEMO_KEY_PREFIX}${n}`)) n += 1
  return `${CLONED_DEMO_KEY_PREFIX}${n}`
}

export function nextClonedDemoProjectName(state: DemoState): string {
  const key = nextClonedDemoProjectKey(state)
  const suffix = key.slice(CLONED_DEMO_KEY_PREFIX.length)
  return suffix ? `Demo Project ${suffix}` : 'Demo Project'
}

export interface ClonedDemoProject {
  projectId: string
  key: string
  name: string
}

export function buildClonedDemoProjectMeta(state: DemoState): ClonedDemoProject {
  const key = nextClonedDemoProjectKey(state)
  const suffix = key.slice(CLONED_DEMO_KEY_PREFIX.length)
  return {
    projectId: newId('proj'),
    key,
    name: suffix ? `Demo Project ${suffix}` : 'Demo Project',
  }
}

/** Apply immutable demo template entities into state as a new isolated project. */
export function appendClonedDemoProject(state: DemoState, meta: ClonedDemoProject): DemoState {
  const template = getImmutableDemoTemplate()
  const { folders, cases, runs, defaultRunId, nextCaseNum, nextRunNum } = cloneDemoTemplateEntities(template, meta.projectId)

  const project: Project = {
    id: meta.projectId,
    name: meta.name,
    key: meta.key,
    description: template.projectDescription,
    seedTemplate: 'demo',
    activeCustomFieldIds: [],
    createdAt: new Date().toISOString(),
  }

  return {
    ...state,
    projectsById: { ...state.projectsById, [project.id]: project },
    activeProjectId: project.id,
    folders: [...state.folders, ...folders],
    cases: [...state.cases, ...cases],
    runs: [...state.runs, ...runs],
    currentRunIdByProject: { ...state.currentRunIdByProject, [project.id]: defaultRunId },
    nextCaseNumByProject: { ...state.nextCaseNumByProject, [project.id]: nextCaseNum },
    nextRunNumByProject: { ...state.nextRunNumByProject, [project.id]: nextRunNum },
  }
}
