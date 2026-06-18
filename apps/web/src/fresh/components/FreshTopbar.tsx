'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'
import { useFreshUI } from '../hooks/useFreshUI'
import { ProjectSwitcher } from './ProjectSwitcher'

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
            style={searchWidth ? { width: searchWidth, minWidth: searchWidth } : { minWidth: 220 }}
            onClick={openSearch}
          >
            <i className="ti ti-search" style={{ fontSize: 13 }} />
            <span style={{ flex: 1 }}>{searchPlaceholder}</span>
            <span className="kbd" style={{ marginLeft: 6 }}>⌘K</span>
          </button>
        ) : null}
        {actions}
      </div>
    </div>
  )
}
