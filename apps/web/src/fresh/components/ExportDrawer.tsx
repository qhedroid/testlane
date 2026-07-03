'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFresh } from '../data/FreshProvider'
import type {
  DemoRun,
  ExportArtifact,
  ExportEntryPoint,
  ExportFormatChoice,
  ExportSectionKey,
} from '../data/demo-model'
import { newId } from '../data/demo-model'
import {
  artifactKindForChoice,
  artifactKindLabel,
  buildExportContent,
  downloadExport,
  EXPORT_SECTION_LABELS,
  fileExtensionForChoice,
  formatBytes,
  registerExportBlob,
} from '../data/export-utils'
import { projectPath } from '../lib/project-routes'

export interface ExportDrawerContext {
  entry: ExportEntryPoint
  run?: DemoRun
  /** Label + count for the "whole object" scope radio. */
  wholeLabel: string
  wholeCount: number
  wholeCountUnit?: string
  /** Current-filter scope (optional per entry point). */
  filterLabel?: string
  filteredCaseIds?: string[]
  /** Current-selection scope (optional per entry point). */
  selectedCaseIds?: string[]
  /** Static audit events, audit entry point only. */
  auditEvents?: { text: string; ctx: string; time: string }[]
  /** File-name stem, e.g. "run-00001" / "project-DP". */
  fileStem: string
  /** Pre-select a format when opened from a format-specific entry point. */
  initialFormat?: ExportFormatChoice
}

type ScopeChoice = 'whole' | 'filter' | 'selection'

const RUN_SECTIONS: ExportSectionKey[] = ['summary', 'perCase', 'stepDetail', 'defects', 'requirements', 'auditTrail']

const PRESETS: {
  id: string
  label: string
  format: ExportFormatChoice
  sections: ExportSectionKey[]
}[] = [
  { id: 'custom', label: 'Custom', format: 'csv', sections: [] },
  {
    id: 'signoff',
    label: 'Release sign-off pack',
    format: 'pdf',
    sections: ['summary', 'perCase', 'defects', 'requirements', 'auditTrail'],
  },
  { id: 'raw', label: 'Raw results (CSV)', format: 'csv', sections: ['summary', 'perCase'] },
  {
    id: 'full',
    label: 'Everything (CSV)',
    format: 'csv',
    sections: ['summary', 'perCase', 'stepDetail', 'defects', 'requirements', 'auditTrail'],
  },
]

interface ToastState {
  fileName: string
  sizeLabel: string
  kindLabel: string
  exportId: string
}

export function ExportDrawer({
  open,
  onClose,
  context,
}: {
  open: boolean
  onClose: () => void
  context: ExportDrawerContext | null
}) {
  const router = useRouter()
  const { state, activeProject, recordExport } = useFresh()
  const [scope, setScope] = useState<ScopeChoice>('whole')
  const [format, setFormat] = useState<ExportFormatChoice>('pdf')
  const [sections, setSections] = useState<Set<ExportSectionKey>>(
    () => new Set<ExportSectionKey>(['summary', 'perCase', 'defects', 'requirements', 'auditTrail']),
  )
  const [preset, setPreset] = useState('signoff')
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    if (!open) return
    setScope('whole')
    if (context?.initialFormat) {
      setFormat(context.initialFormat)
      if (context.initialFormat !== 'pdf') {
        setPreset('raw')
        setSections(new Set<ExportSectionKey>(['summary', 'perCase']))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 8000)
    return () => clearTimeout(t)
  }, [toast])

  const sectionsForEntry = useMemo<ExportSectionKey[]>(() => {
    if (!context) return []
    return context.entry === 'run' ? RUN_SECTIONS : []
  }, [context])

  if (!context && !toast) return null

  const filterCount = context?.filteredCaseIds?.length ?? 0
  const selectionCount = context?.selectedCaseIds?.length ?? 0

  function toggleSection(key: ExportSectionKey) {
    setPreset('custom')
    setSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function applyPreset(id: string) {
    setPreset(id)
    const p = PRESETS.find((x) => x.id === id)
    if (!p || p.id === 'custom') return
    setFormat(p.format)
    setSections(new Set(p.sections))
  }

  function handleGenerate() {
    if (!context) return
    const caseIds =
      scope === 'filter' ? context.filteredCaseIds : scope === 'selection' ? context.selectedCaseIds : undefined
    const scopeLabel =
      scope === 'whole'
        ? context.wholeLabel
        : scope === 'filter'
          ? `${context.filterLabel} (${filterCount} cases)`
          : `Selected cases (${selectionCount})`
    const chosenSections =
      context.entry === 'run' ? ([...sections] as ExportSectionKey[]) : (['summary'] as ExportSectionKey[])

    const { content, kind } = buildExportContent({
      entry: context.entry,
      state,
      projectId: activeProject.id,
      projectName: activeProject.name,
      run: context.run,
      caseIds,
      sections: chosenSections,
      formatChoice: format,
      scopeLabel,
      auditEvents: context.auditEvents,
    })

    const id = newId('export')
    const fileName = `${context.fileStem}-${preset === 'custom' ? 'export' : preset}.${fileExtensionForChoice(format)}`
    const { sizeBytes } = registerExportBlob(id, content, kind)
    const artifact: ExportArtifact = {
      id,
      projectId: activeProject.id,
      fileName,
      formatChoice: format,
      artifactKind: artifactKindForChoice(format),
      scopeLabel,
      sections: chosenSections,
      createdAt: new Date().toISOString(),
      sizeBytes,
      regen: {
        entry: context.entry,
        runId: context.run?.id,
        caseIds,
      },
    }
    recordExport(artifact)
    setToast({
      fileName,
      sizeLabel: formatBytes(sizeBytes),
      kindLabel: artifactKindLabel(format),
      exportId: id,
    })
    onClose()
  }

  return (
    <>
      {open && context ? (
        <div className="exd-overlay" onClick={onClose}>
          <div className="exd-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="exd-hd">
              <i className="ti ti-download" style={{ fontSize: 14, color: 'var(--accent)' }} />
              <span className="exd-title">Export</span>
              <button type="button" className="exd-close" onClick={onClose} title="Close">
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="exd-body">
              <div className="exd-sec">
                <div className="exd-sec-lbl">Scope</div>
                <label className="exd-radio">
                  <input type="radio" name="exd-scope" checked={scope === 'whole'} onChange={() => setScope('whole')} />
                  <span>
                    {context.wholeLabel}{' '}
                    <span className="exd-dim">({context.wholeCount} {context.wholeCountUnit ?? 'cases'})</span>
                  </span>
                </label>
                <label className={`exd-radio${!context.filterLabel || filterCount === 0 ? ' exd-disabled' : ''}`}>
                  <input
                    type="radio"
                    name="exd-scope"
                    disabled={!context.filterLabel || filterCount === 0}
                    checked={scope === 'filter'}
                    onChange={() => setScope('filter')}
                  />
                  <span>
                    {context.filterLabel ? (
                      <>Current filter — {context.filterLabel} <span className="exd-dim">({filterCount} cases)</span></>
                    ) : (
                      <>Current filter <span className="exd-dim">(no filter active here)</span></>
                    )}
                  </span>
                </label>
                <label className={`exd-radio${selectionCount === 0 ? ' exd-disabled' : ''}`}>
                  <input
                    type="radio"
                    name="exd-scope"
                    disabled={selectionCount === 0}
                    checked={scope === 'selection'}
                    onChange={() => setScope('selection')}
                  />
                  <span>Current selection <span className="exd-dim">({selectionCount} cases)</span></span>
                </label>
              </div>

              <div className="exd-sec">
                <div className="exd-sec-lbl">Format</div>
                <div className="exd-seg">
                  {(['pdf', 'excel', 'csv'] as ExportFormatChoice[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`exd-seg-btn${format === f ? ' on' : ''}`}
                      onClick={() => {
                        setFormat(f)
                        setPreset('custom')
                      }}
                    >
                      {f === 'pdf' ? 'PDF report' : f === 'excel' ? 'Excel' : 'CSV'}
                    </button>
                  ))}
                </div>
                <div className="exd-dim" style={{ marginTop: 4 }}>
                  Prototype output: {artifactKindLabel(format)}.
                </div>
              </div>

              {sectionsForEntry.length > 0 ? (
                <div className="exd-sec">
                  <div className="exd-sec-lbl" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Contents
                    <select className="exd-preset" value={preset} onChange={(e) => applyPreset(e.target.value)}>
                      {PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                  {sectionsForEntry.map((key) => (
                    <label key={key} className="exd-check">
                      <input type="checkbox" checked={sections.has(key)} onChange={() => toggleSection(key)} />
                      <span>{EXPORT_SECTION_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="exd-sec">
                  <div className="exd-sec-lbl">Contents</div>
                  <div className="exd-dim">
                    {context.entry === 'audit'
                      ? 'Audit timeline events (static demo seed).'
                      : 'Project run summary table.'}
                  </div>
                </div>
              )}

              <div className="exd-sec">
                <label className="exd-check exd-disabled" title="Needs a backend — not available in the frontend prototype">
                  <input type="checkbox" disabled />
                  <span>Also create shareable link (expires 30 days) — <em>stub, needs backend</em></span>
                </label>
              </div>
            </div>
            <div className="exd-foot">
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button
                type="button"
                className="btn btn-p"
                disabled={context.entry === 'run' && sections.size === 0}
                onClick={handleGenerate}
              >
                <i className="ti ti-file-export" style={{ fontSize: 12 }} /> Generate export
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="exd-toast">
          <i className="ti ti-circle-check" style={{ color: 'var(--pass)', fontSize: 15 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 11.5 }}>Export ready — {toast.fileName} ({toast.sizeLabel})</div>
            <div className="exd-dim">{toast.kindLabel} · expires on reload</div>
          </div>
          <button
            type="button"
            className="btn btn-p"
            style={{ fontSize: 10.5, padding: '2px 8px' }}
            onClick={() => downloadExport(toast.exportId, toast.fileName)}
          >
            Download
          </button>
          <button
            type="button"
            className="btn"
            style={{ fontSize: 10.5, padding: '2px 8px' }}
            onClick={() => {
              setToast(null)
              router.push(`${projectPath(activeProject.key, 'reports')}?view=exports`)
            }}
          >
            Open exports
          </button>
          <button type="button" className="exd-close" onClick={() => setToast(null)} title="Dismiss">
            <i className="ti ti-x" />
          </button>
        </div>
      ) : null}
    </>
  )
}
