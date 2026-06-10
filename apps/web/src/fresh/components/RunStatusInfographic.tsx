import { RunDonut } from './RunDonut'

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
}) {
  return (
    <div
      className={`run-status-info${compact ? ' compact' : ''}`}
      style={{ ['--donut-size' as string]: `${size}px` }}
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
      <ul className="run-status-list">
        <li><span className="rsi-n" style={{ color: '#2E7D32' }}>{pass}</span><span className="rsi-lbl">Passed</span></li>
        <li><span className="rsi-n" style={{ color: '#C62828' }}>{fail}</span><span className="rsi-lbl">Failed</span></li>
        <li><span className="rsi-n" style={{ color: '#E65100' }}>{blocked}</span><span className="rsi-lbl">Blocked</span></li>
        {skipped > 0 ? (
          <li><span className="rsi-n" style={{ color: '#4527A0' }}>{skipped}</span><span className="rsi-lbl">Skipped</span></li>
        ) : null}
        <li><span className="rsi-n" style={{ color: 'var(--text3)' }}>{notrun}</span><span className="rsi-lbl">Not run</span></li>
      </ul>
    </div>
  )
}
