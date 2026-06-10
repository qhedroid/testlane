import { RunDonut } from './RunDonut'

export function RunStatusInfographic({
  pass,
  fail,
  blocked,
  notrun,
  size = 96,
  compact = false,
}: {
  pass: number
  fail: number
  blocked: number
  notrun: number
  size?: number
  compact?: boolean
}) {
  return (
    <div className={`run-status-info${compact ? ' compact' : ''}`}>
      <RunDonut pass={pass} fail={fail} blocked={blocked} notrun={notrun} size={size} />
      <ul className="run-status-list">
        <li><span className="rsi-n" style={{ color: '#2E7D32' }}>{pass}</span><span className="rsi-lbl">Passed</span></li>
        <li><span className="rsi-n" style={{ color: '#C62828' }}>{fail}</span><span className="rsi-lbl">Failed</span></li>
        <li><span className="rsi-n" style={{ color: '#E65100' }}>{blocked}</span><span className="rsi-lbl">Blocked</span></li>
        <li><span className="rsi-n" style={{ color: 'var(--text3)' }}>{notrun}</span><span className="rsi-lbl">Not run</span></li>
      </ul>
    </div>
  )
}
