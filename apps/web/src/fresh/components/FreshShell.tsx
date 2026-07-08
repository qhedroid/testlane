'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { RelayMark } from '../assets/RelayMark'
import { useProjectHref } from '../hooks/useProjectHref'
import { useResizablePanes } from '../hooks/useResizablePanes'
import { getModuleFromPathname } from '../lib/project-routes'
import type { ModuleSlug } from '../lib/project-routes'

const TESTING_NAV: { module: ModuleSlug; label: string; icon: string }[] = [
  { module: 'cases', label: 'Test Cases', icon: 'ti-file-description' },
  { module: 'plans', label: 'Test Plans', icon: 'ti-clipboard-list' },
  { module: 'testruns', label: 'Test Runs', icon: 'ti-player-play' },
  { module: 'milestones', label: 'Milestones', icon: 'ti-flag' },
]

const TRACEABILITY_NAV: { module: ModuleSlug; label: string; icon: string }[] = [
  { module: 'requirements', label: 'Requirements', icon: 'ti-list-details' },
  { module: 'defects', label: 'Defects', icon: 'ti-bug' },
  { module: 'reports', label: 'Reports', icon: 'ti-chart-bar' },
  { module: 'audit', label: 'Audit History', icon: 'ti-history' },
  { module: 'aistudio', label: 'AI Studio', icon: 'ti-sparkles' },
]

function NavItem({
  href,
  active,
  icon,
  label,
}: {
  href: string
  active: boolean
  icon: string
  label: string
}) {
  return (
    <Link href={href} className={`sbi${active ? ' on' : ''}`} title={label}>
      <i className={`ti ${icon}`} />
      <span className="sbi-text"> {label}</span>
    </Link>
  )
}

export function FreshShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const projectHref = useProjectHref()
  const [collapsed, setCollapsed] = useState(false)
  useResizablePanes()

  const currentModule = getModuleFromPathname(pathname)

  function isOn(module: ModuleSlug) {
    return currentModule === module
  }

  const isAdmin = pathname.startsWith('/admin')

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
          <NavItem
            href={projectHref('dashboard')}
            active={isOn('dashboard')}
            icon="ti-layout-dashboard"
            label="Dashboard"
          />
          <NavItem
            href={projectHref('mywork')}
            active={isOn('mywork')}
            icon="ti-user-check"
            label="My Work"
          />
        </div>

        <div className="sb-sec">
          <div className="sb-lbl">Testing</div>
          {TESTING_NAV.map((item) => (
            <NavItem
              key={item.module}
              href={projectHref(item.module)}
              active={isOn(item.module)}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </div>

        <div className="sb-sec">
          <div className="sb-lbl">Traceability</div>
          {TRACEABILITY_NAV.map((item) => (
            <NavItem
              key={item.module}
              href={projectHref(item.module)}
              active={isOn(item.module)}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </div>

        <div className="sb-sp" />
        <div className="sb-div" />

        <div className="sb-sec" style={{ paddingBottom: 0 }}>
          <Link href="/admin" className={`sbi${isAdmin ? ' on' : ''}`} title="Project Settings">
            <i className="ti ti-settings" />
            <span className="sbi-text"> Project Settings</span>
          </Link>
        </div>

        <div className="sb-foot">
          <div className="sb-av">NQ</div>
          <div>
            <div className="sb-uname">Noel Quadri</div>
            <div className="sb-urole">Super Admin</div>
          </div>
        </div>
      </nav>

      <div className="main">{children}</div>
    </div>
  )
}
