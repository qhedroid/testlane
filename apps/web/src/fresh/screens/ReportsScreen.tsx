'use client'

import { useEffect, useMemo, useState } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'
import { PrototypeBanner } from '../components/PrototypeBanner'
import { ExportDrawer, type ExportDrawerContext } from '../components/ExportDrawer'
import { useFresh } from '../data/FreshProvider'
import type { ExecStatus, SavedReport } from '../data/demo-model'
import { folderLabel } from '../data/demo-model'
import {
  artifactKindLabel,
  downloadExport,
  formatBytes,
  getExportBlob,
  regenerateExport,
} from '../data/export-utils'
import {
  computeDrillDownRows,
  computeReportKpis,
  computeScopedRunStats,
  computeTopFailingCases,
  resolveRequirementCoverage,
  resolveScopedRuns,
  type DrillDownFilter,
  type ScopedRunStat,
} from '../data/report-utils'
import { RequirementCoverageBadge } from '../components/RequirementCoverageBadge'
import { RunDonut } from '../components/RunDonut'

const RANGE_OPTIONS = [
  { value: 3, label: 'Last 3 runs' },
  { value: 6, label: 'Last 6 runs' },
  { value: 12, label: 'Last 12 runs' },
  { value: 0, label: 'All runs' },
]

const FOLDER_PALETTE = ['#1565C0', '#6A1B9A', '#00838F', '#EF6C00', '#5D4037', '#C2185B', '#2E7D32', '#455A64']

const STATUS_COLOR: Record<ExecStatus, string> = {
  Passed: '#2E7D32',
  Failed: '#C62828',
  Blocked: '#E65100',
  Skipped: '#4527A0',
  'Not run': '#C5D1DE',
}

interface ControlState {
  scopeType: 'project' | 'plan' | 'run'
  scopeId?: string
  rangeRuns: number
  compare: boolean
}

const DEFAULT_CONTROLS: ControlState = { scopeType: 'project', rangeRuns: 6, compare: false }

export function ReportsScreen() {
  const {
    activeProject,
    activeCases,
    activeFolders,
    activePlans,
    state,
    activeSavedReports,
    saveReport,
    renameSavedReport,
    deleteSavedReport,
    createDefectFromExecution,
    getDefect,
    activeExports,
    recordExport,
    deleteExport,
    activeRequirements,
    getRequirement,
  } = useFresh()

  const [railView, setRailView] = useState<'report' | 'exports'>('report')
  const [exportOpen, setExportOpen] = useState(false)
  const [controls, setControls] = useState<ControlState>(DEFAULT_CONTROLS)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URLSearchParams(window.location.search).get('view') === 'exports') {
      setRailView('exports')
    }
  }, [])
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [drill, setDrill] = useState<DrillDownFilter | null>(null)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // All non-archived runs for the active project (independent of the run picker).
  const projectRuns = useMemo(
    () => state.runs.filter((r) => r.projectId === activeProject.id && !r.archivedAt),
    [state.runs, activeProject.id],
  )

  const scopedRuns = useMemo(
    () => resolveScopedRuns(projectRuns, controls.scopeType, controls.scopeId, controls.rangeRuns),
    [projectRuns, controls],
  )
  const stats = useMemo(
    () => computeScopedRunStats(scopedRuns, activeCases, activeFolders),
    [scopedRuns, activeCases, activeFolders],
  )
  const kpis = useMemo(() => computeReportKpis(stats, activeCases), [stats, activeCases])
  const topFailing = useMemo(() => computeTopFailingCases(stats, activeCases), [stats, activeCases])
  const drillRows = useMemo(
    () => (drill ? computeDrillDownRows(stats, activeCases, activeFolders, drill) : []),
    [drill, stats, activeCases, activeFolders],
  )

  // Area H: requirement coverage rollup (project-wide, derived)
  const requirementCoverage = useMemo(
    () => resolveRequirementCoverage(state, activeProject.id),
    [state, activeProject.id],
  )
  const coverageSummary = useMemo(() => {
    const summary = { uncovered: 0, notRun: 0, passing: 0, failing: 0 }
    for (const cov of requirementCoverage) {
      if (cov.status === 'Uncovered') summary.uncovered += 1
      else if (cov.status === 'Covered — not run') summary.notRun += 1
      else if (cov.status === 'Covered — passing') summary.passing += 1
      else summary.failing += 1
    }
    return summary
  }, [requirementCoverage])

  // Compare deltas: last run in scope vs the one before it.
  const [prevStat, lastStat] = useMemo<[ScopedRunStat | null, ScopedRunStat | null]>(() => {
    if (stats.length < 2) return [null, stats[stats.length - 1] ?? null]
    return [stats[stats.length - 2], stats[stats.length - 1]]
  }, [stats])

  function applyControls(patch: Partial<ControlState>) {
    setControls((prev) => ({ ...prev, ...patch }))
    setActiveReportId(null)
    setDrill(null)
  }

  const scopeDescription =
    controls.scopeType === 'project'
      ? `whole project`
      : controls.scopeType === 'plan'
        ? `plan ${activePlans.find((p) => p.id === controls.scopeId)?.planKey ?? ''}`
        : `run ${projectRuns.find((r) => r.id === controls.scopeId)?.runKey ?? ''}`

  const exportContext: ExportDrawerContext = useMemo(
    () => ({
      entry: 'reports' as const,
      wholeLabel: `Current report — ${scopeDescription}`,
      wholeCount: scopedRuns.length,
      wholeCountUnit: 'runs',
      fileStem: `report-${activeProject.key}`,
    }),
    [scopeDescription, scopedRuns.length, activeProject.key],
  )

  function applySavedReport(report: SavedReport) {
    setControls({
      scopeType: report.scopeType,
      scopeId: report.scopeId,
      rangeRuns: report.rangeRuns,
      compare: report.compare,
    })
    setActiveReportId(report.id)
    setDrill(null)
  }

  function handleSave() {
    const name = saveName.trim()
    if (!name) return
    const { reportId } = saveReport({
      name,
      scopeType: controls.scopeType,
      scopeId: controls.scopeId,
      rangeRuns: controls.rangeRuns,
      compare: controls.compare,
    })
    setActiveReportId(reportId)
    setSaveOpen(false)
    setSaveName('')
  }

  const scopeValue =
    controls.scopeType === 'project' ? 'project' : `${controls.scopeType}:${controls.scopeId ?? ''}`

  function handleScopeChange(value: string) {
    if (value === 'project') {
      applyControls({ scopeType: 'project', scopeId: undefined })
    } else {
      const [type, id] = value.split(':')
      applyControls({ scopeType: type as 'plan' | 'run', scopeId: id })
    }
  }

  const drillChips: { label: string; onRemove: () => void }[] = []
  if (drill) {
    if (drill.runId) {
      const run = projectRuns.find((r) => r.id === drill.runId)
      drillChips.push({
        label: `Run: ${run ? `${run.runKey} ${run.name}` : drill.runId}`,
        onRemove: () => setDrill((d) => (d ? { ...d, runId: undefined } : d)),
      })
    }
    if (drill.rootFolderId) {
      drillChips.push({
        label: `Module: ${drill.rootFolderId === '__unfiled__' ? 'Unfiled' : folderLabel(activeFolders, drill.rootFolderId)}`,
        onRemove: () => setDrill((d) => (d ? { ...d, rootFolderId: undefined } : d)),
      })
    }
    for (const status of drill.statuses ?? []) {
      drillChips.push({
        label: `Result: ${status}`,
        onRemove: () =>
          setDrill((d) =>
            d ? { ...d, statuses: (d.statuses ?? []).filter((s) => s !== status) } : d,
          ),
      })
    }
  }

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[{ label: 'Reports' }]}
        subtitle={activeProject.name}
        searchPlaceholder="Search everything…"
        actions={
          <>
            <div style={{ position: 'relative' }}>
              <button type="button" className="btn" onClick={() => setSaveOpen((v) => !v)}>
                <i className="ti ti-device-floppy" style={{ fontSize: 12 }} /> Save as report
              </button>
              {saveOpen ? (
                <div className="rp-save-pop">
                  <div className="rp-save-lbl">Save current view as a named report</div>
                  <input
                    className="rp-input"
                    autoFocus
                    placeholder="e.g. Sprint regression overview"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave()
                      if (e.key === 'Escape') setSaveOpen(false)
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn" onClick={() => setSaveOpen(false)}>Cancel</button>
                    <button type="button" className="btn btn-p" disabled={!saveName.trim()} onClick={handleSave}>Save</button>
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => setExportOpen(true)}
              title="Export the current report scope"
            >
              <i className="ti ti-download" style={{ fontSize: 12 }} /> Export
            </button>
          </>
        }
      />
      <PrototypeBanner />
      <div className="rp-wrap">
        <div className="rp-rail">
          <div className="rp-rail-lbl">Reports</div>
          <button
            type="button"
            className={`rp-rail-item${railView === 'report' && activeReportId === null ? ' on' : ''}`}
            onClick={() => {
              setControls(DEFAULT_CONTROLS)
              setActiveReportId(null)
              setDrill(null)
              setRailView('report')
            }}
          >
            <i className="ti ti-chart-bar" style={{ fontSize: 12 }} /> Overview (default)
          </button>
          <div className="rp-rail-lbl" style={{ marginTop: 10 }}>Saved reports</div>
          {activeSavedReports.length === 0 ? (
            <div className="rp-rail-empty">No saved reports yet — set up the controls and use “Save as report”.</div>
          ) : (
            activeSavedReports.map((report) => (
              <div key={report.id} className={`rp-rail-item rp-rail-saved${activeReportId === report.id ? ' on' : ''}`}>
                {renamingId === report.id ? (
                  <input
                    className="rp-input"
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renameSavedReport(report.id, renameValue)
                        setRenamingId(null)
                      }
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    onBlur={() => setRenamingId(null)}
                  />
                ) : (
                  <>
                    <button type="button" className="rp-rail-name" onClick={() => { applySavedReport(report); setRailView('report') }}>
                      <i className="ti ti-report-analytics" style={{ fontSize: 12 }} /> {report.name}
                    </button>
                    <button
                      type="button"
                      className="rp-rail-ic"
                      title="Rename"
                      onClick={() => {
                        setRenamingId(report.id)
                        setRenameValue(report.name)
                      }}
                    >
                      <i className="ti ti-pencil" style={{ fontSize: 11 }} />
                    </button>
                    <button
                      type="button"
                      className="rp-rail-ic"
                      title="Delete"
                      onClick={() => {
                        if (window.confirm(`Delete saved report “${report.name}”?`)) {
                          deleteSavedReport(report.id)
                          if (activeReportId === report.id) setActiveReportId(null)
                        }
                      }}
                    >
                      <i className="ti ti-trash" style={{ fontSize: 11 }} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
          <div className="rp-rail-lbl" style={{ marginTop: 10 }}>Exports</div>
          <button
            type="button"
            className={`rp-rail-item${railView === 'exports' ? ' on' : ''}`}
            onClick={() => setRailView('exports')}
          >
            <i className="ti ti-file-export" style={{ fontSize: 12 }} /> Exports (this browser)
          </button>
        </div>

        {railView === 'exports' ? (
          <div className="rp-main">
            <div className="panel" style={{ flexShrink: 0 }}>
              <div className="pnl-hd">
                <i className="ti ti-file-export" style={{ fontSize: 13, color: 'var(--accent)' }} />
                <span className="pnl-ttl">Exports (this browser)</span>
                <span className="pnl-ct">{activeExports.length}</span>
                <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>
                  Prototype artifacts live in this browser session and expire on reload — expired entries can be re-generated from current data.
                </span>
              </div>
              {activeExports.length === 0 ? (
                <div className="rp-tbl-empty">
                  No exports yet. Use the Export buttons on the Dashboard, Test Runs, Audit History, or this Reports page.
                </div>
              ) : (
                <div className="rp-tbl-scroll" style={{ maxHeight: 'none' }}>
                  <table className="rp-tbl">
                    <thead>
                      <tr>
                        <th>Artifact</th>
                        <th>Scope</th>
                        <th>Created</th>
                        <th>Size</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {activeExports.map((e) => {
                        const ready = !!getExportBlob(e.id)
                        return (
                          <tr key={e.id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{e.fileName}</div>
                              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{artifactKindLabel(e.formatChoice)}</div>
                            </td>
                            <td>{e.scopeLabel}</td>
                            <td className="rp-mono">{new Date(e.createdAt).toLocaleString()}</td>
                            <td className="rp-mono">{formatBytes(e.sizeBytes)}</td>
                            <td>
                              <span className={`pill ${ready ? 'p-pass' : 'p-notrun'}`} style={{ fontSize: 9.5, padding: '1px 6px' }}>
                                {ready ? 'Ready' : 'Expired'}
                              </span>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {ready ? (
                                <button
                                  type="button"
                                  className="btn btn-p"
                                  style={{ fontSize: 10, padding: '2px 8px' }}
                                  onClick={() => downloadExport(e.id, e.fileName)}
                                >
                                  Download
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn"
                                  style={{ fontSize: 10, padding: '2px 8px' }}
                                  title="Rebuild this artifact from current data"
                                  onClick={() => {
                                    const result = regenerateExport(e, state, activeProject.name)
                                    if (!result) {
                                      window.alert('The source run for this export no longer exists — it cannot be re-generated.')
                                      return
                                    }
                                    recordExport({ ...e, createdAt: new Date().toISOString(), sizeBytes: result.sizeBytes })
                                  }}
                                >
                                  Re-generate
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: 10, padding: '2px 8px', marginLeft: 4 }}
                                title="Remove from history"
                                onClick={() => deleteExport(e.id)}
                              >
                                <i className="ti ti-trash" style={{ fontSize: 10 }} />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
        <div className="rp-main">
          {/* Control bar */}
          <div className="rp-controls">
            <label className="rp-ctl">
              <span className="rp-ctl-lbl">Scope</span>
              <select className="rp-select" value={scopeValue} onChange={(e) => handleScopeChange(e.target.value)}>
                <option value="project">Whole project — {activeProject.name}</option>
                {activePlans.length > 0 ? (
                  <optgroup label="Test plans">
                    {activePlans.map((p) => (
                      <option key={p.id} value={`plan:${p.id}`}>{p.planKey} — {p.title}</option>
                    ))}
                  </optgroup>
                ) : null}
                {projectRuns.length > 0 ? (
                  <optgroup label="Single run">
                    {[...projectRuns].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => (
                      <option key={r.id} value={`run:${r.id}`}>{r.runKey} — {r.name}</option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>
            <label className="rp-ctl">
              <span className="rp-ctl-lbl">Range</span>
              <select
                className="rp-select"
                value={controls.rangeRuns}
                onChange={(e) => applyControls({ rangeRuns: Number(e.target.value) })}
              >
                {RANGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label className="rp-ctl rp-ctl-check">
              <input
                type="checkbox"
                checked={controls.compare}
                onChange={(e) => applyControls({ compare: e.target.checked })}
              />
              <span>Compare vs previous run</span>
            </label>
            <span className="rp-ctl-note">
              {scopedRuns.length} run{scopedRuns.length === 1 ? '' : 's'} in scope · trend buckets are runs (no sprint entity in prototype)
            </span>
          </div>

          {/* KPI strip */}
          <div className="met-row" style={{ flexShrink: 0 }}>
            <KpiCard
              color="c-green"
              icon="ti-trending-up"
              value={kpis.passRate === null ? '—' : `${kpis.passRate.toFixed(1)}%`}
              label="Pass Rate"
              delta={
                controls.compare && lastStat && prevStat && lastStat.passRate !== null && prevStat.passRate !== null
                  ? { value: lastStat.passRate - prevStat.passRate, unit: 'pp', vs: prevStat.run.runKey }
                  : undefined
              }
              note={kpis.passRate === null ? 'No execution data in scope' : `${kpis.passedCount} of ${kpis.executedCount} executed`}
            />
            <KpiCard
              color="c-grey"
              icon="ti-chart-donut"
              value={`${Math.round(kpis.runCoveragePct)}%`}
              label="Run Coverage"
              note={`${kpis.coveredCaseCount} of ${kpis.totalCaseCount} cases in scoped runs`}
            />
            <KpiCard
              color="c-red"
              icon="ti-alert-circle"
              value={String(kpis.openFailures)}
              label="Open Failures"
              delta={
                controls.compare && lastStat && prevStat
                  ? { value: lastStat.summary.failed - prevStat.summary.failed, unit: '', vs: prevStat.run.runKey, invert: true }
                  : undefined
              }
              note="Failed executions in scope"
            />
            <KpiCard
              color="c-amber"
              icon="ti-ban"
              value={String(kpis.blocked)}
              label="Blocked"
              delta={
                controls.compare && lastStat && prevStat
                  ? { value: lastStat.summary.blocked - prevStat.summary.blocked, unit: '', vs: prevStat.run.runKey, invert: true }
                  : undefined
              }
              note="Blocked executions in scope"
            />
            <KpiCard
              color="c-blue"
              icon="ti-clock-play"
              value={kpis.avgCasesPerDay === null ? '—' : kpis.avgCasesPerDay.toFixed(1)}
              label="Avg. Results / Day"
              note={kpis.avgCasesPerDay === null ? 'No execution log data' : 'From recorded execution log'}
            />
          </div>

          {scopedRuns.length === 0 ? (
            <div className="panel rp-empty">
              <i className="ti ti-chart-bar" style={{ fontSize: 30, color: 'var(--text3)', opacity: 0.6 }} />
              <div style={{ fontSize: 15, fontWeight: 600 }}>No runs in scope</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 380 }}>
                Create and execute test runs in this project (or widen the scope/range above) to see reporting data.
              </div>
            </div>
          ) : (
            <>
              {/* Charts */}
              <div className="rp-charts">
                <div className="panel rp-chart-panel">
                  <div className="pnl-hd">
                    <i className="ti ti-chart-line" style={{ fontSize: 13, color: 'var(--accent)' }} />
                    <span className="pnl-ttl">Pass rate by run</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>
                      line: pass rate · dashed: execution progress · click a point to drill down
                    </span>
                  </div>
                  <PassRateLineChart stats={stats} onPick={(runId) => setDrill({ runId, statuses: ['Failed'] })} />
                </div>
                <div className="panel rp-chart-panel">
                  <div className="pnl-hd">
                    <i className="ti ti-chart-bar" style={{ fontSize: 13, color: 'var(--fail)' }} />
                    <span className="pnl-ttl">Failures by module per run</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>
                      module = top-level folder · click a segment to drill down
                    </span>
                  </div>
                  <FailuresBarChart
                    stats={stats}
                    folderName={(id) => (id === '__unfiled__' ? 'Unfiled' : folderLabel(activeFolders, id))}
                    onPick={(runId, rootFolderId) => setDrill({ runId, rootFolderId, statuses: ['Failed'] })}
                  />
                </div>
              </div>

              {/* Lower row: drill-down or summary tables */}
              {drill ? (
                <div className="panel rp-drill">
                  <div className="pnl-hd">
                    <i className="ti ti-filter" style={{ fontSize: 13, color: 'var(--accent)' }} />
                    <span className="pnl-ttl">Drill-down</span>
                    <span className="pnl-ct">{drillRows.length}</span>
                    <div className="rp-chiprow">
                      {drillChips.map((chip) => (
                        <span key={chip.label} className="rp-chip">
                          {chip.label}
                          <button type="button" onClick={chip.onRemove} title="Remove filter">✕</button>
                        </span>
                      ))}
                    </div>
                    <button type="button" className="btn" style={{ marginLeft: 'auto', fontSize: 10.5, padding: '2px 8px' }} onClick={() => setDrill(null)}>
                      Back to summary
                    </button>
                  </div>
                  <DrillDownTable
                    rows={drillRows}
                    getDefectKey={(id) => getDefect(id)?.defectKey ?? id}
                    onCreateDefect={(runId, caseId, title) =>
                      createDefectFromExecution(runId, caseId, { title })
                    }
                  />
                </div>
              ) : (
                <div className="rp-tables">
                  <div className="panel">
                    <div className="pnl-hd">
                      <i className="ti ti-list-details" style={{ fontSize: 13, color: 'var(--accent)' }} />
                      <span className="pnl-ttl">Run summaries</span>
                      <span className="pnl-ct">{stats.length}</span>
                    </div>
                    <div className="rp-tbl-scroll">
                      <table className="rp-tbl">
                        <thead>
                          <tr>
                            <th>Run</th>
                            <th>Plan</th>
                            <th>P · F · B · NR</th>
                            <th>Pass %</th>
                            {controls.compare ? <th>Δ vs prev</th> : null}
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...stats].reverse().map((s, idx) => {
                            const chronological = stats.length - 1 - idx
                            const prev = chronological > 0 ? stats[chronological - 1] : null
                            const delta =
                              s.passRate !== null && prev && prev.passRate !== null
                                ? s.passRate - prev.passRate
                                : null
                            return (
                              <tr key={s.run.id} className="rp-tbl-row" onClick={() => setDrill({ runId: s.run.id, statuses: ['Failed'] })}>
                                <td><span className="rp-runkey">{s.run.runKey}</span> {s.run.name}</td>
                                <td>{s.run.planName ?? '—'}</td>
                                <td className="rp-mono">
                                  <span style={{ color: 'var(--pass)' }}>{s.summary.passed}</span> ·{' '}
                                  <span style={{ color: 'var(--fail)' }}>{s.summary.failed}</span> ·{' '}
                                  <span style={{ color: 'var(--block)' }}>{s.summary.blocked}</span> ·{' '}
                                  <span style={{ color: 'var(--text3)' }}>{s.summary.notRun}</span>
                                </td>
                                <td className="rp-mono">{s.passRate === null ? '—' : `${s.passRate.toFixed(1)}%`}</td>
                                {controls.compare ? (
                                  <td className={`rp-mono ${delta === null ? '' : delta >= 0 ? 'rp-up' : 'rp-dn'}`}>
                                    {delta === null ? '—' : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)} pp`}
                                  </td>
                                ) : null}
                                <td>
                                  <span className={`pill ${s.run.sealed ? 'p-notrun' : 'p-act'}`} style={{ fontSize: 9.5, padding: '1px 6px' }}>
                                    {s.run.sealed ? 'Closed' : 'Open'}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="panel">
                    <div className="pnl-hd">
                      <i className="ti ti-flame" style={{ fontSize: 13, color: 'var(--fail)' }} />
                      <span className="pnl-ttl">Top failing cases</span>
                      <span className="pnl-ct">{topFailing.length}</span>
                    </div>
                    <div className="rp-tbl-scroll">
                      {topFailing.length === 0 ? (
                        <div className="rp-tbl-empty">No failed executions in scope.</div>
                      ) : (
                        <table className="rp-tbl">
                          <thead>
                            <tr>
                              <th>Case</th>
                              <th>Fails</th>
                              <th>Last 5</th>
                              <th>Defect</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topFailing.map((f) => (
                              <tr key={f.caseId}>
                                <td><span className="rp-runkey">{f.caseKey}</span> {f.title}</td>
                                <td className="rp-mono">{f.failCount}</td>
                                <td><StatusSparkline statuses={f.lastStatuses} /></td>
                                <td>
                                  {f.defectIds.length > 0
                                    ? f.defectIds.map((id) => (
                                        <span key={id} className="ed-dtag" style={{ fontSize: 9.5, padding: '1px 5px', marginRight: 3 }}>
                                          <i className="ti ti-bug" style={{ fontSize: 9 }} />
                                          {getDefect(id)?.defectKey ?? id}
                                        </span>
                                      ))
                                    : <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Requirements coverage (Area H) — project-wide, derived from latest results */}
          <div className="panel" style={{ flexShrink: 0 }}>
            <div className="pnl-hd">
              <i className="ti ti-checklist" style={{ fontSize: 13, color: 'var(--accent)' }} />
              <span className="pnl-ttl">Requirements coverage</span>
              <span className="pnl-ct">{requirementCoverage.length}</span>
              <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>
                project-wide · latest execution result per linked case
              </span>
            </div>
            {requirementCoverage.length === 0 ? (
              <div className="rp-tbl-empty">
                No requirements in this project yet — create them from a test case's Requirements tab.
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 16, padding: '10px 12px', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <RunDonut
                    pass={coverageSummary.passing}
                    fail={coverageSummary.failing}
                    blocked={0}
                    notrun={coverageSummary.uncovered}
                    skipped={coverageSummary.notRun}
                    size={86}
                    showCompleteLabel={false}
                  />
                  <div style={{ fontSize: 9.5, color: 'var(--text3)', textAlign: 'center', maxWidth: 120 }}>
                    green: passing · red: has failures · purple: covered, not run · grey: uncovered
                  </div>
                </div>
                <div className="rp-tbl-scroll" style={{ flex: 1, maxHeight: 220 }}>
                  <table className="rp-tbl">
                    <thead>
                      <tr>
                        <th>Requirement</th>
                        <th>Linked cases</th>
                        <th>P · F · B · NR</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requirementCoverage.map((cov) => {
                        const req = getRequirement(cov.requirementId)
                        if (!req) return null
                        return (
                          <tr key={cov.requirementId}>
                            <td><span className="rp-runkey">{req.requirementKey}</span> {req.title}</td>
                            <td className="rp-mono">{cov.linkedCaseCount}</td>
                            <td className="rp-mono">
                              <span style={{ color: 'var(--pass)' }}>{cov.passed}</span> ·{' '}
                              <span style={{ color: 'var(--fail)' }}>{cov.failed}</span> ·{' '}
                              <span style={{ color: 'var(--block)' }}>{cov.blocked}</span> ·{' '}
                              <span style={{ color: 'var(--text3)' }}>{cov.notRun}</span>
                            </td>
                            <td><RequirementCoverageBadge coverage={cov} /></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
      <ExportDrawer open={exportOpen} onClose={() => setExportOpen(false)} context={exportContext} />
    </div>
  )
}

function KpiCard({
  color,
  icon,
  value,
  label,
  note,
  delta,
}: {
  color: string
  icon: string
  value: string
  label: string
  note?: string
  delta?: { value: number; unit: string; vs: string; invert?: boolean }
}) {
  let deltaEl: React.ReactNode = null
  if (delta) {
    const up = delta.value >= 0
    const good = delta.invert ? !up : up
    deltaEl = (
      <div className={`mt ${good ? 'mt-up' : 'mt-dn'}`}>
        {up ? '▲' : '▼'} {Math.abs(delta.value).toFixed(delta.unit === 'pp' ? 1 : 0)}
        {delta.unit ? ` ${delta.unit}` : ''} vs {delta.vs}
      </div>
    )
  }
  return (
    <div className={`mc ${color}`}>
      <div className="mc-head">
        <div>
          <div className="mv">{value}</div>
          <div className="ml">{label}</div>
        </div>
        <div className="mc-ic"><i className={`ti ${icon}`} /></div>
      </div>
      {deltaEl ?? (note ? <div className="mt">{note}</div> : null)}
    </div>
  )
}

function StatusSparkline({ statuses }: { statuses: ExecStatus[] }) {
  return (
    <span className="rp-spark" title={statuses.join(' → ')}>
      {statuses.map((s, i) => (
        <span key={i} className="rp-spark-cell" style={{ background: STATUS_COLOR[s] }} />
      ))}
    </span>
  )
}

const CHART_W = 520
const CHART_H = 180
const PAD_L = 34
const PAD_R = 12
const PAD_T = 12
const PAD_B = 28

function PassRateLineChart({
  stats,
  onPick,
}: {
  stats: ScopedRunStat[]
  onPick: (runId: string) => void
}) {
  const n = stats.length
  const innerW = CHART_W - PAD_L - PAD_R
  const innerH = CHART_H - PAD_T - PAD_B
  const x = (i: number) => PAD_L + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (pct: number) => PAD_T + innerH - (pct / 100) * innerH

  const passPoints = stats
    .map((s, i) => (s.passRate === null ? null : `${x(i).toFixed(1)},${y(s.passRate).toFixed(1)}`))
    .filter((p): p is string => p !== null)
  const progressPoints = stats.map((s, i) => `${x(i).toFixed(1)},${y(s.progressPct).toFixed(1)}`)

  return (
    <div className="rp-chart-body">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={PAD_L} x2={CHART_W - PAD_R} y1={y(g)} y2={y(g)} stroke="#E5EBF2" strokeWidth={1} />
            <text x={PAD_L - 5} y={y(g) + 3} textAnchor="end" fontSize={8.5} fill="#7A92AB">{g}%</text>
          </g>
        ))}
        {progressPoints.length > 1 ? (
          <polyline points={progressPoints.join(' ')} fill="none" stroke="#1565C0" strokeWidth={1.4} strokeDasharray="4 3" opacity={0.65} />
        ) : null}
        {passPoints.length > 1 ? (
          <polyline points={passPoints.join(' ')} fill="none" stroke="#2E7D32" strokeWidth={2} />
        ) : null}
        {stats.map((s, i) =>
          s.passRate === null ? null : (
            <circle
              key={s.run.id}
              cx={x(i)}
              cy={y(s.passRate)}
              r={4.5}
              fill="#2E7D32"
              stroke="#fff"
              strokeWidth={1.5}
              style={{ cursor: 'pointer' }}
              onClick={() => onPick(s.run.id)}
            >
              <title>{`${s.run.runKey} ${s.run.name} — ${s.passRate.toFixed(1)}% pass`}</title>
            </circle>
          ),
        )}
        {stats.map((s, i) => (
          <text key={s.run.id} x={x(i)} y={CHART_H - 10} textAnchor="middle" fontSize={8.5} fill="#7A92AB" fontFamily="ui-monospace,monospace">
            {s.run.runKey}
          </text>
        ))}
      </svg>
    </div>
  )
}

function FailuresBarChart({
  stats,
  folderName,
  onPick,
}: {
  stats: ScopedRunStat[]
  folderName: (rootFolderId: string) => string
  onPick: (runId: string, rootFolderId: string) => void
}) {
  const rootIds = useMemo(() => {
    const set = new Set<string>()
    for (const s of stats) for (const id of Object.keys(s.failuresByRootFolder)) set.add(id)
    return [...set].sort()
  }, [stats])

  const colorFor = (rootId: string) => FOLDER_PALETTE[rootIds.indexOf(rootId) % FOLDER_PALETTE.length]
  const maxTotal = Math.max(1, ...stats.map((s) => Object.values(s.failuresByRootFolder).reduce((a, b) => a + b, 0)))

  const n = stats.length
  const innerW = CHART_W - PAD_L - PAD_R
  const innerH = CHART_H - PAD_T - PAD_B
  const slot = innerW / n
  const barW = Math.min(34, slot * 0.55)

  if (rootIds.length === 0) {
    return <div className="rp-chart-body rp-tbl-empty">No failures in scope — nothing to chart.</div>
  }

  return (
    <div className="rp-chart-body">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {[0, 0.5, 1].map((f) => {
          const gy = PAD_T + innerH - f * innerH
          return (
            <g key={f}>
              <line x1={PAD_L} x2={CHART_W - PAD_R} y1={gy} y2={gy} stroke="#E5EBF2" strokeWidth={1} />
              <text x={PAD_L - 5} y={gy + 3} textAnchor="end" fontSize={8.5} fill="#7A92AB">{Math.round(f * maxTotal)}</text>
            </g>
          )
        })}
        {stats.map((s, i) => {
          const cx = PAD_L + slot * i + slot / 2
          let yCursor = PAD_T + innerH
          return (
            <g key={s.run.id}>
              {rootIds.map((rootId) => {
                const count = s.failuresByRootFolder[rootId] ?? 0
                if (count === 0) return null
                const h = (count / maxTotal) * innerH
                yCursor -= h
                return (
                  <rect
                    key={rootId}
                    x={cx - barW / 2}
                    y={yCursor}
                    width={barW}
                    height={Math.max(1, h - 1)}
                    fill={colorFor(rootId)}
                    rx={1.5}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onPick(s.run.id, rootId)}
                  >
                    <title>{`${s.run.runKey} — ${folderName(rootId)}: ${count} failed`}</title>
                  </rect>
                )
              })}
              <text x={cx} y={CHART_H - 10} textAnchor="middle" fontSize={8.5} fill="#7A92AB" fontFamily="ui-monospace,monospace">
                {s.run.runKey}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="rp-legend">
        {rootIds.map((id) => (
          <span key={id} className="rp-legend-item">
            <span className="rp-legend-dot" style={{ background: colorFor(id) }} />
            {folderName(id)}
          </span>
        ))}
      </div>
    </div>
  )
}

function DrillDownTable({
  rows,
  getDefectKey,
  onCreateDefect,
}: {
  rows: import('../data/report-utils').DrillDownRow[]
  getDefectKey: (defectId: string) => string
  onCreateDefect: (runId: string, caseId: string, title: string) => { defectKey: string } | null
}) {
  const [linkingKey, setLinkingKey] = useState<string | null>(null)
  const [defectTitle, setDefectTitle] = useState('')

  if (rows.length === 0) {
    return <div className="rp-tbl-empty">No executions match the current drill-down filters.</div>
  }

  return (
    <div className="rp-tbl-scroll" style={{ maxHeight: 320 }}>
      <table className="rp-tbl">
        <thead>
          <tr>
            <th>Case</th>
            <th>Run</th>
            <th>Result</th>
            <th>Tested by</th>
            <th>Defects</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowKey = `${row.runId}:${row.caseId}`
            const canLink = (row.status === 'Failed' || row.status === 'Blocked') && !row.runSealed
            return (
              <tr key={rowKey}>
                <td><span className="rp-runkey">{row.caseKey}</span> {row.caseTitle}</td>
                <td className="rp-mono">{row.runKey}</td>
                <td>
                  <span className="rp-status" style={{ color: STATUS_COLOR[row.status] }}>{row.status}</span>
                </td>
                <td>{row.testedBy ?? '—'}</td>
                <td>
                  {row.defectIds.length > 0
                    ? row.defectIds.map((id) => (
                        <span key={id} className="ed-dtag" style={{ fontSize: 9.5, padding: '1px 5px', marginRight: 3 }}>
                          <i className="ti ti-bug" style={{ fontSize: 9 }} />
                          {getDefectKey(id)}
                        </span>
                      ))
                    : <span style={{ color: 'var(--text3)', fontSize: 10.5 }}>—</span>}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {linkingKey === rowKey ? (
                    <span className="rp-linkform">
                      <input
                        className="rp-input"
                        autoFocus
                        placeholder="Defect title…"
                        value={defectTitle}
                        onChange={(e) => setDefectTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && defectTitle.trim()) {
                            onCreateDefect(row.runId, row.caseId, defectTitle.trim())
                            setLinkingKey(null)
                            setDefectTitle('')
                          }
                          if (e.key === 'Escape') setLinkingKey(null)
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-p"
                        style={{ fontSize: 10, padding: '2px 7px' }}
                        disabled={!defectTitle.trim()}
                        onClick={() => {
                          onCreateDefect(row.runId, row.caseId, defectTitle.trim())
                          setLinkingKey(null)
                          setDefectTitle('')
                        }}
                      >
                        Create &amp; link
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn"
                      style={{ fontSize: 10, padding: '2px 7px' }}
                      disabled={!canLink}
                      title={
                        row.runSealed
                          ? 'Run is closed — re-open it to link defects'
                          : canLink
                            ? 'Create a local defect linked to this execution'
                            : 'Defects link to Failed or Blocked results only'
                      }
                      onClick={() => {
                        setLinkingKey(rowKey)
                        setDefectTitle('')
                      }}
                    >
                      <i className="ti ti-bug" style={{ fontSize: 10 }} /> Link defect
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
