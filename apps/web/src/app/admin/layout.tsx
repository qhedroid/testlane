import type { ReactNode } from 'react'
import { AdminShell } from '@/fresh/components/admin/AdminShell'
import '@/fresh/styles/fresh.css'
import '@/fresh/styles/admin.css'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
