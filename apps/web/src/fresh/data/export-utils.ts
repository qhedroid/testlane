import type {
  Case,
  Defect,
  DemoRun,
  DemoState,
  ExportArtifactKind,
  ExportEntryPoint,
  ExportFormatChoice,
  ExportSectionKey,
  Requirement,
} from './demo-model'
import { runSummary } from './demo-model'
import { AUDIT_EVENTS } from './seed'

/**
 * Client-side export generation (Area B).
 *
 * Honesty rules for this prototype:
 * - 'csv' produces a real CSV file.
 * - 'excel' produces a CSV file (opens in Excel) — labelled as such.
 * - 'pdf' produces a print-friendly HTML document (browser Print → PDF) — labelled as such.
 * Generated artifacts live in in-memory blob URLs and expire on reload.
 */

export const EXPORT_SECTION_LABELS: Record<ExportSectionKey, string> = {
  summary: 'Run summary',
  perCase: 'Per-case results',
  stepDetail: 'Step-level detail & comments',
  defects: 'Linked defects',
  requirements: 'Requirements traceability',
  auditTrail: 'Audit trail for this run',
}

/** In-memory registry of generated blobs — intentionally NOT persisted. */
const blobRegistry = new Map<string, { url: string; sizeBytes: number }>()

export function getExportBlob(exportId: string): { url: string; sizeBytes: number } | undefined {
  return blobRegistry.get(exportId)
}

export function registerExportBlob(
  exportId: string,
  content: string,
  kind: ExportArtifactKind,
): { url: string; sizeBytes: number } {
  const prev = blobRegistry.get(exportId)
  if (prev) URL.revokeObjectURL(prev.url)
  const mime = kind === 'csv' ? 'text/csv;charset=utf-8' : 'text/html;charset=utf-8'
  const blob = new Blob([content], { type: mime })
  const entry = { url: URL.createObjectURL(blob), sizeBytes: blob.size }
  blobRegistry.set(exportId, entry)
  return entry
}

export function downloadExport(exportId: string, fileName: string): boolean {
  const entry = blobRegistry.get(exportId)
  if (!entry) return false
  const a = document.createElement('a')
  a.href = entry.url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  return true
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function artifactKindForChoice(choice: ExportFormatChoice): ExportArtifactKind {
  return choice === 'pdf' ? 'html' : 'csv'
}

export function artifactKindLabel(choice: ExportFormatChoice): string {
  if (choice === 'pdf') return 'print-friendly HTML (use browser Print for PDF)'
  if (choice === 'excel') return 'CSV (opens in Excel)'
  return 'CSV'
}

export function fileExtensionForChoice(choice: ExportFormatChoice): string {
  return choice === 'pdf' ? 'html' : 'csv'
}

function csvEscape(value: unknown): string {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function csvRows(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n')
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function htmlTable(headers: string[], rows: unknown[][]): string {
  const head = `<tr>${headers.map((h) => `<th>${htmlEscape(h)}</th>`).join('')}</tr>`
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${htmlEscape(c)}</td>`).join('')}</tr>`)
    .join('\n')
  return `<table>${head}\n${body}</table>`
}

export interface ExportBuildInput {
  entry: ExportEntryPoint
  state: DemoState
  projectId: string
  projectName: string
  run?: DemoRun
  /** Restrict per-case sections to these case ids (filter/selection scope). */
  caseIds?: string[]
  sections: ExportSectionKey[]
  formatChoice: ExportFormatChoice
  scopeLabel: string
  /** Static audit events (audit entry point only). */
  auditEvents?: { text: string; ctx: string; time: string }[]
}

interface SectionBlock {
  title: string
  headers: string[]
  rows: unknown[][]
}

function caseById(state: DemoState, caseId: string): Case | undefined {
  return state.cases.find((c) => c.id === caseId)
}

function runSectionBlocks(input: ExportBuildInput, run: DemoRun): SectionBlock[] {
  const { state, sections } = input
  const include = new Set(sections)
  const blocks: SectionBlock[] = []
  const scopedCaseIds = input.caseIds
    ? run.caseOrder.filter((id) => input.caseIds!.includes(id))
    : run.caseOrder

  if (include.has('summary')) {
    const s = runSummary(run)
    blocks.push({
      title: 'Run summary',
      headers: ['Field', 'Value'],
      rows: [
        ['Run', `${run.runKey} ${run.name}`],
        ['Plan', run.planName ?? '—'],
        ['Created', run.createdAt],
        ['Status', run.sealed ? 'Closed' : 'Open'],
        ['Cases', s.total],
        ['Passed', s.passed],
        ['Failed', s.failed],
        ['Blocked', s.blocked],
        ['Skipped', s.skipped],
        ['Not run', s.notRun],
      ],
    })
  }
  if (include.has('perCase')) {
    blocks.push({
      title: 'Per-case results',
      headers: ['Case', 'Title', 'Result', 'Assignee', 'Tested by', 'Tested at', 'Notes'],
      rows: scopedCaseIds.map((caseId) => {
        const c = caseById(state, caseId)
        const ex = run.executions[caseId]
        return [
          c?.caseKey ?? caseId,
          c?.title ?? 'Unknown case',
          ex?.status ?? 'Not run',
          ex?.assignee ?? c?.assignee ?? '',
          ex?.testedBy ?? '',
          ex?.testedAt ?? '',
          ex?.resultNotes ?? '',
        ]
      }),
    })
  }
  if (include.has('stepDetail')) {
    const rows: unknown[][] = []
    for (const caseId of scopedCaseIds) {
      const c = caseById(state, caseId)
      if (!c) continue
      const ex = run.executions[caseId]
      c.steps.forEach((step, i) => {
        rows.push([
          c.caseKey ?? caseId,
          `Step ${i + 1}`,
          step.action,
          step.expected,
          ex?.stepResults[step.id] ?? 'Not run',
          step.comments.map((cm) => `${cm.author}: ${cm.body}`).join(' | '),
        ])
      })
    }
    blocks.push({
      title: 'Step-level detail & comments',
      headers: ['Case', 'Step', 'Action', 'Expected', 'Result', 'Comments'],
      rows,
    })
  }
  if (include.has('defects')) {
    const rows: unknown[][] = []
    for (const caseId of scopedCaseIds) {
      const c = caseById(state, caseId)
      const ex = run.executions[caseId]
      for (const defectId of ex?.defects ?? []) {
        const defect: Defect | undefined = state.defectsById?.[defectId]
        rows.push([
          c?.caseKey ?? caseId,
          defect?.defectKey ?? defectId,
          defect?.title ?? '(external/legacy reference)',
          defect?.status ?? '',
        ])
      }
    }
    blocks.push({
      title: 'Linked defects',
      headers: ['Case', 'Defect', 'Title', 'Status'],
      rows,
    })
  }
  if (include.has('requirements')) {
    const rows: unknown[][] = []
    for (const caseId of scopedCaseIds) {
      const c = caseById(state, caseId)
      if (!c) continue
      for (const reqId of c.requirementIds ?? []) {
        const req: Requirement | undefined = state.requirementsById?.[reqId]
        rows.push([
          c.caseKey ?? caseId,
          req?.requirementKey ?? reqId,
          req?.title ?? '(unknown requirement)',
          req?.status ?? '',
        ])
      }
    }
    blocks.push({
      title: 'Requirements traceability',
      headers: ['Case', 'Requirement', 'Title', 'Status'],
      rows,
    })
  }
  if (include.has('auditTrail')) {
    blocks.push({
      title: 'Audit trail for this run',
      headers: ['At', 'By', 'Case', 'From', 'To', 'Event'],
      rows: (run.executionLog ?? []).map((e) => {
        const c = caseById(state, e.caseId)
        return [e.at, e.by, c?.caseKey ?? e.caseId, e.from, e.to, e.event ?? 'result']
      }),
    })
  }
  return blocks
}

function dashboardSectionBlocks(input: ExportBuildInput): SectionBlock[] {
  const { state, projectId } = input
  const runs = state.runs.filter((r) => r.projectId === projectId && !r.archivedAt)
  return [
    {
      title: 'Project run summary',
      headers: ['Run', 'Name', 'Plan', 'Status', 'Cases', 'Passed', 'Failed', 'Blocked', 'Skipped', 'Not run'],
      rows: runs.map((r) => {
        const s = runSummary(r)
        return [r.runKey, r.name, r.planName ?? '', r.sealed ? 'Closed' : 'Open', s.total, s.passed, s.failed, s.blocked, s.skipped, s.notRun]
      }),
    },
  ]
}

function auditSectionBlocks(input: ExportBuildInput): SectionBlock[] {
  return [
    {
      title: 'Audit timeline (static demo seed)',
      headers: ['Event', 'Context', 'Time'],
      rows: (input.auditEvents ?? []).map((e) => [e.text, e.ctx, e.time]),
    },
  ]
}

export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

/**
 * Rebuild an expired export from its persisted regeneration spec using
 * current state, and register a fresh blob under the same id.
 * Returns the new size, or null when the source (e.g. a deleted run) is gone.
 */
export function regenerateExport(
  artifact: import('./demo-model').ExportArtifact,
  state: DemoState,
  projectName: string,
): { sizeBytes: number } | null {
  let run: DemoRun | undefined
  if (artifact.regen.entry === 'run') {
    run = state.runs.find((r) => r.id === artifact.regen.runId)
    if (!run) return null
  }
  const auditEvents =
    artifact.regen.entry === 'audit'
      ? AUDIT_EVENTS.map((e) => ({ text: stripHtmlTags(e.html), ctx: e.ctx, time: e.time }))
      : undefined
  const { content, kind } = buildExportContent({
    entry: artifact.regen.entry,
    state,
    projectId: artifact.projectId,
    projectName,
    run,
    caseIds: artifact.regen.caseIds,
    sections: artifact.sections,
    formatChoice: artifact.formatChoice,
    scopeLabel: artifact.scopeLabel,
    auditEvents,
  })
  const { sizeBytes } = registerExportBlob(artifact.id, content, kind)
  return { sizeBytes }
}

export function buildExportContent(input: ExportBuildInput): { content: string; kind: ExportArtifactKind } {
  let blocks: SectionBlock[]
  if (input.entry === 'run' && input.run) {
    blocks = runSectionBlocks(input, input.run)
  } else if (input.entry === 'audit') {
    blocks = auditSectionBlocks(input)
  } else {
    // 'dashboard' and 'reports' both export project-level run summaries
    blocks = dashboardSectionBlocks(input)
  }

  const kind = artifactKindForChoice(input.formatChoice)
  if (kind === 'csv') {
    const parts = blocks.map((b) =>
      [csvRows([[b.title]]), csvRows([b.headers, ...b.rows])].join('\r\n'),
    )
    return { content: parts.join('\r\n\r\n'), kind }
  }

  const body = blocks
    .map((b) => `<h2>${htmlEscape(b.title)}</h2>\n${htmlTable(b.headers, b.rows)}`)
    .join('\n')
  const content = `<!doctype html>
<html><head><meta charset="utf-8"><title>${htmlEscape(input.scopeLabel)}</title>
<style>
body{font-family:-apple-system,system-ui,sans-serif;color:#0F1C2E;margin:32px;font-size:13px}
h1{font-size:20px;margin-bottom:2px}
.sub{color:#5A7089;font-size:12px;margin-bottom:20px}
h2{font-size:14px;margin:22px 0 8px}
table{border-collapse:collapse;width:100%;margin-bottom:14px}
th,td{border:1px solid #D5DEE8;padding:5px 8px;text-align:left;font-size:11.5px;vertical-align:top}
th{background:#F0F4F9}
@media print{body{margin:12mm}}
</style></head><body>
<h1>${htmlEscape(input.projectName)} — ${htmlEscape(input.scopeLabel)}</h1>
<div class="sub">Generated ${new Date().toISOString()} · Relay frontend prototype · print this page to produce a PDF</div>
${body}
</body></html>`
  return { content, kind }
}
