'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { RelayMark } from '../assets/RelayMark'
import { useProjectHref } from '../hooks/useProjectHref'
import { useResizablePanes } from '../hooks/useResizablePanes'
import { useFresh } from '../data/FreshProvider'
import { getModuleFromPathname } from '../lib/project-routes'
import type { ModuleSlug } from '../lib/project-routes'

const PLATFORM_NAV: { module: ModuleSlug; label: string; icon: string }[] = [
  { module: 'cases', label: 'Test Cases', icon: 'ti-file-description' },
  { module: 'plans', label: 'Test Plans', icon: 'ti-clipboard-list' },
  { module: 'testruns', label: 'Test Runs', icon: 'ti-player-play' },
]

export function FreshShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const projectHref = useProjectHref()
  const { activeProject } = useFresh()
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
          <div className="sb-lbl">Workspace</div>
          <Link href={projectHref('dashboard')} className={`sbi${isOn('dashboard') ? ' on' : ''}`} title="Dashboard">
            <i className="ti ti-layout-dashboard" />
            <span className="sbi-text"> Dashboard</span>
          </Link>
        </div>

        <div className="sb-sec">
          <div className="sb-lbl">{activeProject.name}</div>
          {PLATFORM_NAV.map((item) => (
            <Link key={item.module} href={projectHref(item.module)} className={`sbi${isOn(item.module) ? ' on' : ''}`} title={item.label}>
              <i className={`ti ${item.icon}`} />
              <span className="sbi-text"> {item.label}</span>
            </Link>
          ))}
          <Link href={projectHref('reports')} className={`sbi${isOn('reports') ? ' on' : ''}`} title="Reports (planned)">
            <i className="ti ti-chart-bar" />
            <span className="sbi-text"> Reports</span>
            <span className="soon">Planned</span>
          </Link>
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
          <Link href={projectHref('audit')} className={`sbi${isOn('audit') ? ' on' : ''}`} title="Audit History">
            <i className="ti ti-history" />
            <span className="sbi-text"> Audit History</span>
          </Link>
          <Link href={projectHref('defects')} className={`sbi${isOn('defects') ? ' on' : ''}`} title="Defects">
            <i className="ti ti-bug" />
            <span className="sbi-text"> Defects</span>
          </Link>
          <Link href={projectHref('integrations')} className={`sbi${isOn('integrations') ? ' on' : ''}`} title="Integrations (planned)">
            <i className="ti ti-plug" />
            <span className="sbi-text"> Integrations</span>
            <span className="soon">Planned</span>
          </Link>
          <Link href={projectHref('settings')} className={`sbi${isOn('settings') ? ' on' : ''}`} title="Settings">
            <i className="ti ti-settings" />
            <span className="sbi-text"> Settings</span>
          </Link>
          <Link href="/admin" className={`sbi${isAdmin ? ' on' : ''}`} title="Admin">
            <span className="sbi-icon-lucide">
              <ShieldCheck size={18} strokeWidth={2} />
            </span>
            <span className="sbi-text"> Admin</span>
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
