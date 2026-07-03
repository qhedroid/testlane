import type { Case, Defect, DemoRun, DemoState, ExportArtifact, Folder, Project, Requirement, SavedFilter, SavedFilterSurface, SavedReport, ScheduledRun, TestPlan } from './demo-model'

export function listProjects(state: DemoState): Project[] {
  return Object.values(state.projectsById).sort((a, b) => a.name.localeCompare(b.name))
}

export function getActiveProject(state: DemoState): Project | undefined {
  return state.projectsById[state.activeProjectId]
}

export function getProjectByKey(state: DemoState, key: string): Project | undefined {
  const normalized = key.toUpperCase()
  return Object.values(state.projectsById).find((p) => p.key === normalized)
}

export function isProjectKeyUnique(state: DemoState, key: string, excludeProjectId?: string): boolean {
  const normalized = key.toUpperCase()
  return !Object.values(state.projectsById).some(
    (p) => p.key === normalized && p.id !== excludeProjectId,
  )
}

export function listActiveProjectFolders(state: DemoState): Folder[] {
  return state.folders.filter((f) => f.projectId === state.activeProjectId)
}

export function listActiveProjectTestCases(state: DemoState): Case[] {
  return state.cases.filter((c) => c.projectId === state.activeProjectId)
}

export function listActiveProjectRuns(state: DemoState): DemoRun[] {
  return state.runs.filter(
    (r) => r.projectId === state.activeProjectId && !r.archivedAt,
  )
}

export function listActiveProjectPlans(state: DemoState): TestPlan[] {
  return Object.values(state.plansById).filter(
    (p) => p.projectId === state.activeProjectId,
  ).sort((a, b) => a.planKey.localeCompare(b.planKey))
}

export function getActiveProjectNextRunNum(state: DemoState): number {
  return state.nextRunNumByProject[state.activeProjectId] ?? 1
}

export function listProjectFolders(state: DemoState, projectId: string): Folder[] {
  return state.folders.filter((f) => f.projectId === projectId)
}

export function listProjectTestCases(state: DemoState, projectId: string): Case[] {
  return state.cases.filter((c) => c.projectId === projectId)
}

export function listProjectRuns(state: DemoState, projectId: string): DemoRun[] {
  return state.runs.filter((r) => r.projectId === projectId)
}

export function getActiveProjectCurrentRunId(state: DemoState): string {
  return state.currentRunIdByProject[state.activeProjectId] ?? ''
}

export function getActiveProjectNextCaseNum(state: DemoState): number {
  return state.nextCaseNumByProject[state.activeProjectId] ?? 1
}

export function listActiveProjectRequirements(state: DemoState): Requirement[] {
  return Object.values(state.requirementsById ?? {})
    .filter((r) => r.projectId === state.activeProjectId)
    .sort((a, b) => a.requirementKey.localeCompare(b.requirementKey))
}

export function listActiveProjectDefects(state: DemoState): Defect[] {
  return Object.values(state.defectsById ?? {})
    .filter((d) => d.projectId === state.activeProjectId)
    .sort((a, b) => a.defectKey.localeCompare(b.defectKey))
}

export function listActiveProjectSavedReports(state: DemoState): SavedReport[] {
  return Object.values(state.savedReportsById ?? {})
    .filter((r) => r.projectId === state.activeProjectId)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function listActiveProjectExports(state: DemoState): ExportArtifact[] {
  return Object.values(state.exportsById ?? {})
    .filter((e) => e.projectId === state.activeProjectId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function listActiveProjectScheduledRuns(state: DemoState): ScheduledRun[] {
  return Object.values(state.scheduledRunsById ?? {})
    .filter((s) => s.projectId === state.activeProjectId)
    .sort((a, b) => a.nextRunAt.localeCompare(b.nextRunAt))
}

export function listActiveProjectSavedFilters(state: DemoState, surface: SavedFilterSurface): SavedFilter[] {
  return Object.values(state.savedFiltersById ?? {})
    .filter((f) => f.projectId === state.activeProjectId && f.surface === surface)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getActiveProjectNextRequirementNum(state: DemoState): number {
  return state.nextRequirementNumByProject?.[state.activeProjectId] ?? 1
}

export function getActiveProjectNextDefectNum(state: DemoState): number {
  return state.nextDefectNumByProject?.[state.activeProjectId] ?? 1
}
