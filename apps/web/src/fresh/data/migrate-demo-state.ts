import type { DemoState } from './demo-model'
import { normalizeAssigneeName } from './team-users'

function mapAuthor(name: string): string {
  return normalizeAssigneeName(name) ?? name
}

/** One-time remap of legacy placeholder assignees in persisted demo state. */
export function migrateDemoState(state: DemoState): DemoState {
  const cases = state.cases.map((c) => ({
    ...c,
    assignee: normalizeAssigneeName(c.assignee),
    steps: c.steps.map((s) => ({
      ...s,
      comments: s.comments.map((cm) => ({ ...cm, author: mapAuthor(cm.author) })),
    })),
    generalComments: c.generalComments.map((cm) => ({ ...cm, author: mapAuthor(cm.author) })),
  }))

  const runs = state.runs.map((r) => ({
    ...r,
    executions: Object.fromEntries(
      Object.entries(r.executions).map(([caseId, ex]) => [
        caseId,
        {
          ...ex,
          assignee: ex.assignee ? normalizeAssigneeName(ex.assignee) : ex.assignee,
        },
      ]),
    ),
  }))

  return { ...state, cases, runs }
}
