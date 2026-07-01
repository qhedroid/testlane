'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { RelayMark } from '@/components/runs/RelayMark'

const PLATFORM_NAV = [
  { href: '/cases', label: 'Test Cases', icon: 'ti-file-description' },
  { href: '/plans', label: 'Test Plans', icon: 'ti-clipboard-list' },
  { href: '/runs', label: 'Test Runs', icon: 'ti-player-play' },
] as const

interface RelayAppShellProps {
  children: ReactNode
}

export function RelayAppShell({ children }: RelayAppShellProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="relay-app">
      <nav
        className={`relay-sb${collapsed ? ' relay-sb-collapsed' : ''}`}
        aria-label="Main navigation"
      >
        <div className="relay-sb-logo">
          <div className="relay-sb-mark">
            <RelayMark />
          </div>
          <div className="relay-sb-name">
            relay
            <small>QA Workspace</small>
          </div>
          <button
            type="button"
            className="relay-sb-toggle"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((v) => !v)}
          >
            <i className={`ti ${collapsed ? 'ti-layout-sidebar-left-expand' : 'ti-layout-sidebar-left-collapse'}`} />
          </button>
        </div>

        <div className="relay-sb-sec">
          <div className="relay-sb-lbl">Workspace</div>
          <Link
            href="/dashboard"
            className={`relay-sbi relay-sbi-link${pathname === '/dashboard' ? ' relay-sbi-on' : ''}`}
            title="Dashboard"
          >
            <i className="ti ti-layout-dashboard" />
            <span className="relay-sbi-text">Dashboard</span>
          </Link>
        </div>

        <div className="relay-sb-sec">
          <div className="relay-sb-lbl">TI-Core Platform</div>
          {PLATFORM_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relay-sbi relay-sbi-link${pathname.startsWith(item.href) ? ' relay-sbi-on' : ''}`}
              title={item.label}
            >
              <i className={`ti ${item.icon}`} />
              <span className="relay-sbi-text">{item.label}</span>
            </Link>
          ))}
          <div className="relay-sbi relay-sbi-disabled" title="Reports">
            <i className="ti ti-chart-bar" />
            <span className="relay-sbi-text">Reports</span>
            <span className="relay-sbi-soon">Planned</span>
          </div>
        </div>

        <div className="relay-sb-sec">
          <div className="relay-sb-lbl">Pinned Modules</div>
          <div className="relay-sb-sub" title="eTMF Module">
            <span className="relay-sb-dot" />
            <span className="relay-sbi-text">eTMF Module</span>
          </div>
          <div className="relay-sb-sub" title="API Gateway">
            <span className="relay-sb-dot" />
            <span className="relay-sbi-text">API Gateway</span>
          </div>
          <div className="relay-sb-sub relay-sb-sub-muted" title="Add shortcut">
            <i className="ti ti-plus" />
            <span className="relay-sbi-text">Add shortcut</span>
          </div>
        </div>

        <div className="relay-sb-spacer" />
        <div className="relay-sb-div" />

        <div className="relay-sb-sec relay-sb-sec-foot">
          <Link
            href="/audit"
            className={`relay-sbi relay-sbi-link${pathname === '/audit' ? ' relay-sbi-on' : ''}`}
            title="Audit History"
          >
            <i className="ti ti-history" />
            <span className="relay-sbi-text">Audit History</span>
          </Link>
          <div className="relay-sbi relay-sbi-muted" title="Defects">
            <i className="ti ti-bug" />
            <span className="relay-sbi-text">Defects</span>
          </div>
          <div className="relay-sbi relay-sbi-disabled" title="Integrations">
            <i className="ti ti-plug" />
            <span className="relay-sbi-text">Integrations</span>
            <span className="relay-sbi-soon">Planned</span>
          </div>
          <div className="relay-sbi relay-sbi-muted" title="Settings">
            <i className="ti ti-settings" />
            <span className="relay-sbi-text">Settings</span>
          </div>
        </div>

        <div className="relay-sb-foot">
          <div className="relay-sb-av">NQ</div>
          <div className="relay-sb-user">
            <div className="relay-sb-uname">Noel Quadri</div>
            <div className="relay-sb-urole">Super Admin</div>
          </div>
        </div>
      </nav>

      <div className="relay-main">{children}</div>
    </div>
  )
}
