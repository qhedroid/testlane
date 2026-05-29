import type {
  CaseResultStatusInput,
  RunDetailCase,
} from '@/lib/relay/types'

export type CaseStatusFilter =
  | 'all'
  | 'not_run'
  | 'pass'
  | 'fail'
  | 'blocked'
  | 'skip'

export const CASE_STATUS_FILTERS: {
  value: CaseStatusFilter
  label: string
}[] = [
  { value: 'all', label: 'All' },
  { value: 'not_run', label: 'Not run' },
  { value: 'pass', label: 'Passed' },
  { value: 'fail', label: 'Failed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'skip', label: 'Skipped' },
]

export function statusDotClass(status: RunDetailCase['status']): string {
  const map = {
    pass: 'd-p',
    fail: 'd-f',
    blocked: 'd-b',
    not_run: 'd-n',
    skip: 'd-s',
  } as const
  return map[status] ?? 'd-n'
}

export function statusPillClass(status: RunDetailCase['status']): string {
  if (status === 'skip') return 'pill p-skip'
  return `pill p-${status}`
}

export function statusLabel(status: RunDetailCase['status']): string {
  if (status === 'skip') return 'Skipped'
  if (status === 'not_run') return 'Not run'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function priorityClass(
  priority: RunDetailCase['priority'],
): string {
  const map = {
    critical: 'pri pr-crit',
    high: 'pri pr-high',
    medium: 'pri pr-med',
    low: 'pri pr-low',
  } as const
  return map[priority] ?? 'pri pr-low'
}

export function caseToApiStatus(
  status: RunDetailCase['status'],
): CaseResultStatusInput {
  if (status === 'skip') return 'skip'
  return status
}

export function isActiveStatus(
  current: RunDetailCase['status'],
  target: CaseResultStatusInput,
): boolean {
  if (target === 'skipped' || target === 'skip') return current === 'skip'
  return current === target
}

export function filterCases(
  cases: RunDetailCase[],
  statusFilter: CaseStatusFilter,
  searchQuery: string,
): RunDetailCase[] {
  const q = searchQuery.trim().toLowerCase()
  return cases.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (!q) return true
    const assignee = c.assignedToName?.toLowerCase() ?? ''
    const moduleName = c.module?.toLowerCase() ?? ''
    return (
      c.caseRef.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      assignee.includes(q) ||
      moduleName.includes(q)
    )
  })
}
