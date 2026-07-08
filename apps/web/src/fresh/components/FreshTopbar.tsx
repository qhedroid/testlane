'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'
import { useFreshUI } from '../hooks/useFreshUI'
import { ProjectSwitcher } from './ProjectSwitcher'
import { TopbarGlobalActions } from './TopbarGlobalActions'

export interface Breadcrumb {
  label: string
  href?: string
}

interface FreshTopbarProps {
  breadcrumbs: Breadcrumb[]
  subtitle?: string
  actions?: ReactNode
  searchPlaceholder?: string
  searchWidth?: number | string
  showSearch?: boolean
}

export function FreshTopbar({
  breadcrumbs,
  subtitle,
  actions,
  searchPlaceholder = 'Search…',
  searchWidth,
  showSearch = true,
}: FreshTopbarProps) {
  const { openSearch } = useFreshUI()

  return (
    <div className="topbar">
      <ProjectSwitcher />
      <div className="bc">
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb.label}-${i}`} style={{ display: 'contents' }}>
            {i > 0 ? <span className="sep">/</span> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="bc-link">
                {crumb.label}
              </Link>
            ) : (
              <span className="cur">{crumb.label}</span>
            )}
          </span>
        ))}
        {subtitle ? (
          <>
            <span className="sep">·</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{subtitle}</span>
          </>
        ) : null}
      </div>
      <div className="ta">
        {showSearch ? (
          <button
            type="button"
            className="search-trigger"
            style={searchWidth ? { maxWidth: searchWidth, minWidth: searchWidth, flex: '0 1 auto' } : undefined}
            onClick={openSearch}
          >
            <i className="ti ti-search" />
            <span style={{ flex: 1, textAlign: 'left' }}>{searchPlaceholder}</span>
            <span className="kbd">⌘K</span>
          </button>
        ) : null}
        <TopbarGlobalActions />
        {actions}
      </div>
    </div>
  )
}
