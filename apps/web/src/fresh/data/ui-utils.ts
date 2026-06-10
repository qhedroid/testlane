import type { ExecStatus } from './demo-model'
import type { Priority, ResultStatus } from './types'

export const EXEC_PILL_MAP: Record<ExecStatus, string> = {
  'Not run': 'p-notrun',
  Passed: 'p-pass',
  Failed: 'p-fail',
  Blocked: 'p-block',
  Skipped: 'p-skip',
}

export const EXEC_PILL_LABEL: Record<ExecStatus, string> = {
  'Not run': '○ Not run',
  Passed: '✓ Passed',
  Failed: '✗ Failed',
  Blocked: '⊘ Blocked',
  Skipped: '→ Skipped',
}

export const EXEC_DOT_MAP: Record<ExecStatus, string> = {
  'Not run': 'd-n',
  Passed: 'd-p',
  Failed: 'd-f',
  Blocked: 'd-b',
  Skipped: 'd-s',
}

export const PRI_MAP: Record<Priority, string> = {
  critical: 'pr-crit',
  high: 'pr-high',
  medium: 'pr-med',
  low: 'pr-low',
}

export const PILL_MAP: Record<string, string> = {
  pass: 'p-pass',
  fail: 'p-fail',
  blocked: 'p-block',
  not_run: 'p-notrun',
  skip: 'p-skip',
  active: 'p-act',
  act: 'p-act',
}

export const PILL_LABEL: Record<ResultStatus, string> = {
  pass: '✓ Pass',
  fail: '✗ Fail',
  blocked: '⊘ Blocked',
  not_run: '○ Not run',
  skip: '→ Skip',
}

export const DOT_MAP: Record<ResultStatus, string> = {
  pass: 'd-p',
  fail: 'd-f',
  blocked: 'd-b',
  not_run: 'd-n',
  skip: 'd-s',
}

export const GROUP_ORDER: ResultStatus[] = ['fail', 'blocked', 'not_run', 'pass', 'skip']
export const GROUP_LABEL: Record<ResultStatus, string> = {
  fail: 'Failing',
  blocked: 'Blocked',
  not_run: 'Not run',
  pass: 'Passed',
  skip: 'Skipped',
}

export function nextCaseId(num: number): string {
  return `TC-${1000 + num}`
}
