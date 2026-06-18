'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Bot,
  Building2,
  FormInput,
  History,
  Info,
  Key,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Shield,
  User,
  UserCircle,
  Users,
  FolderKanban,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin/profile', label: 'My profile', icon: User },
  { href: '/admin/account', label: 'My account', icon: UserCircle },
  { href: '/admin/api-keys', label: 'API keys', icon: Key },
  { href: '/admin/organization', label: 'Organization', icon: Building2 },
  { href: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { href: '/admin/users', label: 'User management', icon: Users },
  { href: '/admin/roles', label: 'Role management', icon: Shield },
  { href: '/admin/integrations', label: 'Integrations', icon: Plug },
  { href: '/admin/custom-fields', label: 'Custom fields', icon: FormInput },
  { href: '/admin/automation', label: 'Automation', icon: Bot },
  { href: '/admin/audit-log', label: 'Audit log', icon: History },
] as const

export function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className={`admin-sb${collapsed ? ' collapsed' : ''}`}>
      <div className="admin-sb-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-sbi${isActive(item.href) ? ' on' : ''}`}
              title={item.label}
            >
              <span className="admin-sbi-icon">
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="admin-sbi-text">{item.label}</span>
            </Link>
          )
        })}
      </div>
      <div className="admin-sb-foot">
        <span className="admin-sbi" title="About" style={{ cursor: 'default' }}>
          <span className="admin-sbi-icon">
            <Info size={16} strokeWidth={2} />
          </span>
          <span className="admin-sbi-text">About</span>
        </span>
        <button
          type="button"
          className="admin-sbi"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((v) => !v)}
          style={{ width: '100%', border: 'none', background: 'transparent', font: 'inherit' }}
        >
          <span className="admin-sbi-icon">
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={2} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={2} />
            )}
          </span>
          <span className="admin-sbi-text">Collapse</span>
        </button>
      </div>
    </nav>
  )
}
