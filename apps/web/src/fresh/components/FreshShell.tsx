'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { RelayMark } from '../assets/RelayMark'
import { useResizablePanes } from '../hooks/useResizablePanes'

const NAV = [
  { href: '/dashboard', id: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard', section: 'workspace' },
  { href: '/cases', id: 'cases', label: 'Test Cases', icon: 'ti-file-description', section: 'platform' },
  { href: '/plans', id: 'plans', label: 'Test Plans', icon: 'ti-clipboard-list', section: 'platform' },
  { href: '/runs', id: 'runs', label: 'Test Runs', icon: 'ti-player-play', section: 'platform' },
  { href: '/audit', id: 'audit', label: 'Audit History', icon: 'ti-history', section: 'footer' },
] as const

export function FreshShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  useResizablePanes()

  function isOn(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div id="app">
      <nav className={`sb${collapsed ? ' collapsed' : ''}`}>
        <div className="sb-logo">
          <div className="sb-mark">
            <RelayMark />
          </div>
          <div className="sb-name">
            Relay
            <small>QA Workspace</small>
          </div>
          <button
            type="button"
            className="sb-toggle"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((v) => !v)}
          >
            <i className={`ti ${collapsed ? 'ti-layout-sidebar-right-collapse' : 'ti-layout-sidebar-left-collapse'}`} />
          </button>
        </div>

        <div className="sb-sec">
          <div className="sb-lbl">Workspace</div>
          <Link href="/dashboard" className={`sbi${isOn('/dashboard') ? ' on' : ''}`} title="Dashboard">
            <i className="ti ti-layout-dashboard" />
            <span className="sbi-text"> Dashboard</span>
          </Link>
        </div>

        <div className="sb-sec">
          <div className="sb-lbl">TI-Core Platform</div>
          {NAV.filter((n) => n.section === 'platform').map((item) => (
            <Link key={item.href} href={item.href} className={`sbi${isOn(item.href) ? ' on' : ''}`} title={item.label}>
              <i className={`ti ${item.icon}`} />
              <span className="sbi-text"> {item.label}</span>
            </Link>
          ))}
          <div className="sbi disabled" title="Reports">
            <i className="ti ti-chart-bar" />
            <span className="sbi-text"> Reports</span>
            <span className="soon">Planned</span>
          </div>
        </div>

        <div className="sb-sec">
          <div className="sb-lbl">Pinned Modules</div>
          <div className="sb-sub" title="eTMF Module">
            <span className="sb-dot" />
            <span className="sbi-text">eTMF Module</span>
          </div>
          <div className="sb-sub" title="API Gateway">
            <span className="sb-dot" />
            <span className="sbi-text">API Gateway</span>
          </div>
          <div className="sb-sub" title="Add shortcut" style={{ color: 'rgba(168,196,224,.3)' }}>
            <i className="ti ti-plus" style={{ fontSize: 10 }} />
            <span className="sbi-text">Add shortcut</span>
          </div>
        </div>

        <div className="sb-sp" />
        <div className="sb-div" />

        <div className="sb-sec" style={{ paddingBottom: 0 }}>
          <Link href="/audit" className={`sbi${isOn('/audit') ? ' on' : ''}`} title="Audit History">
            <i className="ti ti-history" />
            <span className="sbi-text"> Audit History</span>
          </Link>
          <div className="sbi" title="Defects">
            <i className="ti ti-bug" />
            <span className="sbi-text"> Defects</span>
          </div>
          <div className="sbi disabled" title="Integrations">
            <i className="ti ti-plug" />
            <span className="sbi-text"> Integrations</span>
            <span className="soon">Planned</span>
          </div>
          <div className="sbi" title="Settings">
            <i className="ti ti-settings" />
            <span className="sbi-text"> Settings</span>
          </div>
        </div>

        <div className="sb-foot">
          <div className="sb-av">NQ</div>
          <div>
            <div className="sb-uname">Noel Q.</div>
            <div className="sb-urole">Super Admin</div>
          </div>
        </div>
      </nav>

      <div className="main">{children}</div>
    </div>
  )
}
