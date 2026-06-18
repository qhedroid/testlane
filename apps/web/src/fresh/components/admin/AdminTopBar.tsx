import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function AdminTopBar() {
  return (
    <header className="admin-topbar">
      <Link href="/" className="admin-back">
        <ArrowLeft size={16} strokeWidth={2} />
        Back to Relay
      </Link>
      <div className="admin-topbar-div" />
      <span className="admin-org">Demo Organization</span>
    </header>
  )
}
