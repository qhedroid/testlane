'use client'

import { Check, ChevronLeft, ChevronRight, GripVertical, Info, Pencil, Trash2, X } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

/* ── Primitives ── */

export function AdminSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <section className="admin-section">
      <div className="admin-section-hd">
        <span className="admin-section-icon">{icon}</span>
        <h2 className="admin-section-title">{title}</h2>
      </div>
      <div className="admin-section-div" />
      <div className="admin-section-body">{children}</div>
    </section>
  )
}

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">{children}</table>
    </div>
  )
}

export function AdminFormRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="admin-form-row">
      <div className="admin-form-row-label">
        <div className="admin-field-lbl">{label}</div>
        {description ? <p className="admin-field-desc">{description}</p> : null}
      </div>
      <div className="admin-form-row-control">{children}</div>
    </div>
  )
}

/* ── Shared helpers ── */

export function AdminCheck({ value }: { value: boolean }) {
  return value ? (
    <span className="admin-check"><Check size={14} strokeWidth={2.5} /></span>
  ) : null
}

export function AdminCross() {
  return <span className="admin-cross"><X size={13} strokeWidth={2} /></span>
}

export function AdminInfoIcon() {
  return (
    <span className="admin-info-icon" title="More information">
      <Info size={13} strokeWidth={2} />
    </span>
  )
}

export function AdminBadge({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'success' }) {
  return <span className={`admin-badge admin-badge-${variant}`}>{children}</span>
}

export function AdminToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="admin-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="admin-toggle-track" />
      {label ? <span className="admin-toggle-label">{label}</span> : null}
    </label>
  )
}

export function AdminPageFooter({ children }: { children: ReactNode }) {
  return <div className="admin-page-footer">{children}</div>
}

export function AdminToolbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="admin-toolbar">
      <div className="admin-toolbar-left">{left}</div>
      <div className="admin-toolbar-right">{right}</div>
    </div>
  )
}

export function AdminSearchInput({
  value,
  onChange,
  placeholder = 'Search by keyword',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      className="admin-search"
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

export function AdminProgressStat({
  label,
  current,
  total,
  rightLabel,
}: {
  label: string
  current: number
  total: number
  rightLabel?: string
}) {
  const pct = Math.min(100, Math.round((current / total) * 100))
  return (
    <div className="admin-progress-stat">
      <div className="admin-progress-stat-top">
        <span className="admin-progress-stat-label">{label}</span>
        <span className="admin-progress-stat-val">{rightLabel ?? `${current} of ${total}`}</span>
      </div>
      <div className="admin-progress-bar">
        <div className="admin-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function AdminCard({ children }: { children: ReactNode }) {
  return <div className="admin-card">{children}</div>
}

export function AdminTableFooter({
  total,
  page,
  pageSize,
  onPageChange,
  showPerPage = false,
}: {
  total: number
  page: number
  pageSize: number
  onPageChange?: (page: number) => void
  showPerPage?: boolean
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className="admin-table-footer">
      {showPerPage ? (
        <select className="admin-per-page" defaultValue="auto" aria-label="Results per page">
          <option value="auto">AUTO per page</option>
          <option value="20">20 per page</option>
          <option value="50">50 per page</option>
        </select>
      ) : <span />}
      <span className="admin-results-count">{total} results</span>
      {total > pageSize && onPageChange ? (
        <div className="admin-pagination">
          <button type="button" className="btn" disabled={!canPrev} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft size={14} />
          </button>
          <button type="button" className="btn" disabled={!canNext} onClick={() => onPageChange(page + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function AdminRowActions() {
  return (
    <span className="admin-row-actions">
      <button type="button" className="admin-icon-btn" title="Edit"><Pencil size={13} /></button>
      <button type="button" className="admin-icon-btn" title="Delete"><Trash2 size={13} /></button>
    </span>
  )
}

export function AdminDragHandle() {
  return <span className="admin-drag"><GripVertical size={14} /></span>
}

export function useAdminSearch<T>(items: T[], query: string, fields: (item: T) => string[]) {
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      fields(item).some((f) => f.toLowerCase().includes(q)),
    )
  }, [items, query, fields])
}

export function usePagination<T>(items: T[], page: number, pageSize: number) {
  return useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])
}

export function usePaginatedSearch<T>(
  items: T[],
  query: string,
  fields: (item: T) => string[],
  pageSize = 20,
) {
  const [page, setPage] = useState(1)
  const filtered = useAdminSearch(items, query, fields)
  const pageItems = usePagination(filtered, page, pageSize)
  const resetPage = (q: string) => {
    setPage(1)
    return q
  }
  return { filtered, pageItems, page, setPage, total: filtered.length, resetPage }
}

export function useSavedFeedback() {
  const [saved, setSaved] = useState(false)
  const showSaved = () => {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }
  return { saved, showSaved }
}

export function AdminModal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  if (!open) return null
  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-hd">
          <div className="admin-modal-title">{title}</div>
          <button type="button" className="btn" style={{ padding: '2px 6px' }} onClick={onClose}>×</button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer ? <div className="admin-modal-foot">{footer}</div> : null}
      </div>
    </div>
  )
}

export { formatRelativeTimestamp, formatUserLastLogin } from '@/fresh/data/admin-utils'

export function formatTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatLoginTimestamp() {
  const d = new Date()
  const date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${date}, ${time}`
}

export type Language = 'English' | 'French' | 'German' | 'Spanish'
export type RegionalFormat = 'Standard' | 'ISO'

export function getSampleFormats(language: Language, regional: RegionalFormat) {
  const now = new Date()
  const locale =
    language === 'French' ? 'fr-FR' :
    language === 'German' ? 'de-DE' :
    language === 'Spanish' ? 'es-ES' : 'en-US'

  const firstDay =
    language === 'French' || language === 'German' ? 'Monday' :
    language === 'Spanish' ? 'Monday' : 'Sunday'

  const dateStr = regional === 'ISO'
    ? now.toISOString().slice(0, 10)
    : now.toLocaleDateString(locale, { month: 'numeric', day: 'numeric', year: 'numeric' })

  const dateTimeStr = regional === 'ISO'
    ? `${now.toISOString().slice(0, 10)} ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    : now.toLocaleString(locale, { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })

  const dateTimeComplete = now.toLocaleString(locale, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  })

  return { firstDay, dateStr, dateTimeStr, dateTimeComplete }
}
