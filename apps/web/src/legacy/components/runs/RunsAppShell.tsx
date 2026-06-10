import type { ReactNode } from 'react'
import { RelayMark } from './RelayMark'

interface RunsAppShellProps {
  children: ReactNode
  topbarActions?: ReactNode
}

const NAV_ITEMS = [
  { label: 'Dashboard', disabled: true },
  { label: 'Test Cases', disabled: true },
  { label: 'Test Plans', disabled: true },
  { label: 'Test Runs', active: true },
  { label: 'Reports', disabled: true, soon: true },
] as const

export function RunsAppShell({ children, topbarActions }: RunsAppShellProps) {
  return (
    <div className="relay-app">
      <nav className="relay-sb" aria-label="Main navigation">
        <div className="relay-sb-logo">
          <div className="relay-sb-mark">
            <RelayMark />
          </div>
          <div className="relay-sb-name">
            relay
            <small>QA Workspace</small>
          </div>
        </div>

        <div className="relay-sb-sec">
          <div className="relay-sb-lbl">Workspace</div>
          <div className="relay-sbi relay-sbi-disabled">Dashboard</div>
        </div>

        <div className="relay-sb-sec">
          <div className="relay-sb-lbl">TI Platform</div>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className={[
                'relay-sbi',
                'active' in item && item.active ? 'relay-sbi-on' : '',
                'disabled' in item && item.disabled ? 'relay-sbi-disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {item.label}
              {'soon' in item && item.soon ? (
                <span className="relay-sbi-soon">Planned</span>
              ) : null}
            </div>
          ))}
        </div>

        <div className="relay-sb-sec">
          <div className="relay-sb-lbl">Pinned Modules</div>
          <div className="relay-sb-sub relay-sb-sub-on">
            <span className="relay-sb-dot" />
            CTMS
          </div>
          <div className="relay-sb-sub">
            <span className="relay-sb-dot" />
            eTMF
          </div>
        </div>

        <div className="relay-sb-spacer" />

        <div className="relay-sb-foot">
          <div className="relay-sb-av">PN</div>
          <div>
            <div className="relay-sb-uname">Monica Dayalani</div>
            <div className="relay-sb-urole">Contributor · dev</div>
          </div>
        </div>
      </nav>

      <div className="relay-main">
        <header className="relay-topbar">
          <div className="relay-proj">
            <span className="relay-proj-icon" aria-hidden>
              ◫
            </span>
            <span className="relay-proj-name">CTMS</span>
            <span className="relay-proj-tag">Module</span>
          </div>
          <div className="relay-bc">
            <span className="relay-bc-muted">TI Platform</span>
            <span className="relay-bc-sep">/</span>
            <span className="relay-bc-cur">Test runs</span>
          </div>
          <div className="relay-topbar-actions">{topbarActions}</div>
        </header>
        {children}
      </div>
    </div>
  )
}
