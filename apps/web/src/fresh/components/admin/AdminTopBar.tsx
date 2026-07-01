'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useFresh } from '@/fresh/data/FreshProvider'
import { ActorSwitcher } from './ActorSwitcher'

export function AdminTopBar() {
  const { adminSettings } = useFresh()
  const orgName = adminSettings.organization.fullName || 'Demo Organization'

  return (
    <header className="admin-topbar">
      <Link href="/DP/dashboard" className="admin-back">
        <ArrowLeft size={16} strokeWidth={2} />
        Back to Relay
      </Link>
      <div className="admin-topbar-div" />
      <span className="admin-org">Current organisation: {orgName}</span>
      <div className="admin-topbar-spacer" />
      <ActorSwitcher />
    </header>
  )
}
