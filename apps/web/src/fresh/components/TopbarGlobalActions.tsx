'use client'

import Link from 'next/link'
import { useFreshUI } from '../hooks/useFreshUI'
import { useProjectHref } from '../hooks/useProjectHref'

export function TopbarGlobalActions() {
  const { openCreateCase, openCreateRun, openShortcuts } = useFreshUI()
  const projectHref = useProjectHref()

  return (
    <div className="tb-global-actions">
      <button type="button" className="btn btn-neutral" onClick={() => openCreateCase()}>
        New test case
      </button>
      <button type="button" className="btn btn-p" onClick={openCreateRun}>
        New test run
      </button>
      <Link href={projectHref('aistudio')} className="tb-icon-btn ai" title="AI Studio">
        <i className="ti ti-sparkles" />
      </Link>
      <button type="button" className="tb-icon-btn" title="Notifications" aria-label="Notifications">
        <i className="ti ti-bell" />
        <span className="tb-notif-dot" aria-hidden />
      </button>
      <button type="button" className="tb-icon-btn" title="Help" aria-label="Help" onClick={openShortcuts}>
        <i className="ti ti-help-circle" />
      </button>
    </div>
  )
}
