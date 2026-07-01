import type { CaseCounts } from '@/lib/relay/types'

export function CompactCountCards({ counts }: { counts: CaseCounts }) {
  const cards = [
    { key: 'total', label: 'Total', value: counts.total, cls: '' },
    { key: 'pass', label: 'Pass', value: counts.passed, cls: 'mc-pass' },
    { key: 'fail', label: 'Fail', value: counts.failed, cls: 'mc-fail' },
    { key: 'blocked', label: 'Blocked', value: counts.blocked, cls: 'mc-blocked' },
    { key: 'skip', label: 'Skip', value: counts.skipped, cls: 'mc-skip' },
    { key: 'notRun', label: 'Not run', value: counts.notRun, cls: 'mc-notrun' },
  ] as const

  return (
    <div className="met-row met-row-compact">
      {cards.map((c) => (
        <div key={c.key} className={`mc ${c.cls}`}>
          <div className="mv">{c.value}</div>
          <div className="ml">{c.label}</div>
        </div>
      ))}
    </div>
  )
}
