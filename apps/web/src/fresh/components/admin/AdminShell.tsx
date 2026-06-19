import type { ReactNode } from 'react'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopBar } from './AdminTopBar'

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="admin-app">
      <AdminTopBar />
      <div className="admin-body">
        <AdminSidebar />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  )
}
