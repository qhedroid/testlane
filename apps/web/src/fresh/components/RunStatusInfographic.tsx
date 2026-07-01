import type { ExecStatus } from '../data/demo-model'
import { RunDonut } from './RunDonut'

type FilterTab = 'all' | ExecStatus

export function RunStatusInfographic({
  pass,
  fail,
  blocked,
  notrun,
  skipped = 0,
  size = 96,
  compact = false,
  showCompleteLabel = true,
  interactive = false,
  onStatusClick,
  activeStatus,
}: {
  pass: number
  fail: number
  blocked: number
  notrun: number
  skipped?: number
  size?: number
  compact?: boolean
  showCompleteLabel?: boolean
  interactive?: boolean
  onStatusClick?: (status: ExecStatus) => void
  activeStatus?: FilterTab
}) {
  const clickable = !!onStatusClick

  function statusLi(status: ExecStatus, count: number, color: string, label: string) {
    const active = activeStatus === status
    return (
      <li
        className={active ? 'rsi-active' : undefined}
        onClick={() => onStatusClick?.(status)}
        style={clickable ? { cursor: 'pointer' } : undefined}
      >
        <span className="rsi-n" style={{ color }}>{count}</span>
        <span className="rsi-lbl">{label}</span>
      </li>
    )
  }

  return (
    <div
      className={`run-status-info pie-block${compact ? ' compact' : ''}`}
      style={{ ['--pieSize' as string]: `${size}px` }}
    >
      <div className="run-status-chart">
        <RunDonut
          pass={pass}
          fail={fail}
          blocked={blocked}
          notrun={notrun}
          skipped={skipped}
          size={size}
          showCompleteLabel={showCompleteLabel}
          interactive={interactive}
        />
      </div>
      <div className="run-status-col">
        <ul className="run-status-list">
          {statusLi('Passed', pass, '#2E7D32', 'Passed')}
          {statusLi('Failed', fail, '#C62828', 'Failed')}
          {statusLi('Blocked', blocked, '#E65100', 'Blocked')}
          {skipped > 0 ? statusLi('Skipped', skipped, '#4527A0', 'Skipped') : null}
          {statusLi('Not run', notrun, 'var(--text3)', 'Not run')}
        </ul>
      </div>
    </div>
  )
}
