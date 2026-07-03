'use client'

import type { RequirementCoverage, RequirementCoverageStatus } from '../data/report-utils'

const BADGE_STYLE: Record<RequirementCoverageStatus, { bg: string; color: string }> = {
  Uncovered: { bg: 'var(--surface2)', color: 'var(--text3)' },
  'Covered — not run': { bg: 'var(--accent-lt, #E8F1FB)', color: 'var(--accent)' },
  'Covered — passing': { bg: 'var(--pass-bg, #E3F2E4)', color: 'var(--pass)' },
  'Covered — has failures': { bg: 'var(--fail-bg, #FDEAEA)', color: 'var(--fail)' },
}

/** Small requirement-coverage badge (Area H) — derived data only. */
export function RequirementCoverageBadge({ coverage }: { coverage: RequirementCoverage | undefined }) {
  if (!coverage) return null
  const style = BADGE_STYLE[coverage.status]
  const detail =
    coverage.linkedCaseCount === 0
      ? 'No test cases linked'
      : `${coverage.linkedCaseCount} linked case${coverage.linkedCaseCount === 1 ? '' : 's'} — ${coverage.passed} passed · ${coverage.failed} failed · ${coverage.blocked} blocked · ${coverage.notRun} not run (latest results)`
  return (
    <span
      className="pill"
      title={detail}
      style={{ fontSize: 9, padding: '1px 6px', background: style.bg, color: style.color, border: '1px solid var(--border)' }}
    >
      {coverage.status}
      {coverage.linkedCaseCount > 0 ? ` · ${coverage.linkedCaseCount}` : ''}
    </span>
  )
}
