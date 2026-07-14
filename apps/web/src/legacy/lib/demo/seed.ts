import type {
  AttentionItem,
  DemoState,
  ExecCase,
  TestCase,
  TestPlan,
  TestRun,
} from './types'

function mapCases(): TestCase[] {
  const raw: Array<{
    id: string
    suite: string
    section: string
    title: string
    pri: TestCase['priority']
    type: string
    last: TestCase['lastResult']
    by: string
    steps: number
    upd: string
    precond: string
    stepList: { a: string; e: string }[]
    tags?: string[]
  }> = [
    { id: 'TC-1001', suite: 'CTMS', section: 'Role & permissions', title: 'Validate CTMS role permissions for Viewer user', pri: 'critical', type: 'Functional', last: 'pass', by: 'Priya Malhotra', steps: 4, upd: '2d ago', precond: 'CTMS test tenant has Admin, Executor, and Reader users seeded for permission testing.', stepList: [
      { a: 'Log in as a Viewer user and open the CTMS module', e: 'Viewer can open CTMS in read-only mode' },
      { a: 'Attempt to create a CTMS record from the toolbar', e: 'Create action is hidden or disabled' },
      { a: 'Navigate directly to the create-record route', e: 'Request is rejected with a permission error' },
      { a: 'Verify audit history captures the denied action', e: 'Audit entry records user, module, and attempted action' },
    ], tags: ['ctms', 'permissions', 'regression'] },
    { id: 'TC-1002', suite: 'CTMS', section: 'Record management', title: 'Create CTMS record with required fields', pri: 'critical', type: 'Functional', last: 'pass', by: 'Priya Malhotra', steps: 3, upd: '2d ago', precond: 'Executor user has CTMS create permission in UAT.', stepList: [
      { a: 'Open the CTMS module and select New record', e: 'Create form opens with required fields marked' },
      { a: 'Submit the form with valid required values', e: 'Record saves successfully and receives a system ID' },
      { a: 'Reopen the record from search results', e: 'Saved values match the submitted data' },
    ], tags: ['ctms', 'records'] },
    { id: 'TC-1003', suite: 'eTMF', section: 'Document upload', title: 'eTMF document upload preserves classification metadata', pri: 'critical', type: 'Functional', last: 'pass', by: 'Marcus Webb', steps: 5, upd: '3d ago', precond: 'eTMF test project contains a configured document workflow and sample PDF.', stepList: [
      { a: 'Open eTMF document upload from the module navigation', e: 'Upload dialog appears with classification fields' },
      { a: 'Upload a valid PDF using drag and drop', e: 'File is accepted and appears in the upload queue' },
      { a: 'Select document type and workflow owner', e: 'Metadata values are accepted without validation errors' },
      { a: 'Submit the document into workflow', e: 'Document status changes to QC review' },
      { a: 'Reopen the document details pane', e: 'Classification metadata is retained exactly' },
    ] },
    { id: 'TC-1004', suite: 'CTMS', section: 'Role & permissions', title: 'CTMS user role mapping preserves Viewer permission', pri: 'high', type: 'Functional', last: 'fail', by: 'Priya Malhotra', steps: 4, upd: '1d ago', precond: 'CTMS module has a Viewer user assigned through SSO/IAM role mapping.', stepList: [
      { a: 'Assign Viewer role to the user from User Management', e: 'Viewer role appears on the user profile' },
      { a: 'Save the role mapping and reopen the profile', e: 'Viewer role remains assigned' },
      { a: 'Open CTMS as that user', e: 'User sees read-only CTMS pages' },
      { a: 'Review audit history for role update', e: 'Audit entry includes before and after role values' },
    ], tags: ['ctms', 'role-mapping'] },
    { id: 'TC-1005', suite: 'eTMF', section: 'Document upload', title: 'Bulk upload eTMF documents routes each file to workflow', pri: 'high', type: 'Functional', last: 'pass', by: 'Devon Reyes', steps: 5, upd: '4d ago', precond: 'eTMF document workflow is enabled and bulk upload test files are available.', stepList: [
      { a: 'Open bulk upload in the eTMF module', e: 'Bulk upload panel accepts multiple files' },
      { a: 'Upload five valid PDF documents', e: 'All files complete scanning successfully' },
      { a: 'Apply classification metadata to each row', e: 'Each document has required type and owner values' },
      { a: 'Submit the batch', e: 'Every document enters the selected workflow state' },
      { a: 'Filter the document list by batch ID', e: 'All uploaded documents appear with expected statuses' },
    ] },
    { id: 'TC-1006', suite: 'Viewer', section: 'Read-only permissions', title: 'Reader cannot edit configuration in Viewer module', pri: 'high', type: 'Security', last: 'pass', by: 'Marcus Webb', steps: 3, upd: '5d ago', precond: 'Reader user has access to Viewer module dashboards.', stepList: [
      { a: 'Open Viewer module as Reader', e: 'Dashboard and records are visible in read-only mode' },
      { a: 'Attempt to update a configuration field through direct URL', e: 'Request is rejected with insufficient permission' },
      { a: 'Verify security audit entry is created', e: 'Denied edit attempt is recorded with user and module IDs' },
    ] },
    { id: 'TC-1007', suite: 'Viewer', section: 'Grid & filtering', title: 'Viewer grid filter refreshes result count', pri: 'critical', type: 'Integration', last: 'fail', by: 'Priya Malhotra', steps: 4, upd: '1d ago', precond: 'Viewer module contains seeded records across multiple statuses.', stepList: [
      { a: 'Open the Viewer grid with all records visible', e: 'Total count matches seeded dataset' },
      { a: 'Apply Status = Active filter', e: 'Grid rows are filtered to active records' },
      { a: 'Clear the filter and apply Owner = Current user', e: 'Rows update to owned records only' },
      { a: 'Verify footer count after each filter change', e: 'Displayed count matches visible rows' },
    ] },
    { id: 'TC-1008', suite: 'Reporting', section: 'Export', title: 'Reporting export includes skipped and not-run executions', pri: 'critical', type: 'Functional', last: 'fail', by: 'Priya Malhotra', steps: 3, upd: '1d ago', precond: 'Completed test run contains Passed, Failed, Blocked, Skipped, and Not run executions.', stepList: [
      { a: 'Open the run summary report', e: 'All result categories are visible in the summary' },
      { a: 'Export the report to CSV', e: 'CSV downloads successfully' },
      { a: 'Compare CSV rows to run execution table', e: 'Skipped and Not run executions are included' },
    ] },
    { id: 'TC-1009', suite: 'GlobalLearn', section: 'Course completions', title: 'GlobalLearn completion syncs to user training widget', pri: 'medium', type: 'Integration', last: 'pass', by: 'Devon Reyes', steps: 3, upd: '6d ago', precond: 'Test user has assigned GlobalLearn training in the integration environment.', stepList: [
      { a: 'Mark required training complete in GlobalLearn', e: 'Completion event is available for sync' },
      { a: 'Run training sync for the user account', e: 'User training status changes to Complete' },
      { a: 'Open the training widget in User Management', e: 'Training item is marked complete with completion date' },
    ] },
    { id: 'TC-1010', suite: 'eTMF', section: 'Classification & QC', title: 'Document workflow metadata survives status transition', pri: 'medium', type: 'Functional', last: 'pass', by: 'Elena Voss', steps: 4, upd: '3d ago', precond: 'Document workflow has Draft, QC review, Approved, and Rejected states.', stepList: [
      { a: 'Create a document record with required metadata', e: 'Document record saves with type, owner, and module values' },
      { a: 'Move document from Draft to QC review', e: 'Workflow transition succeeds' },
      { a: 'Approve the document from QC review', e: 'Status changes to Approved' },
      { a: 'Reopen document metadata panel', e: 'Original metadata values are preserved' },
    ] },
    { id: 'TC-1011', suite: 'CTMS', section: 'Audit history', title: 'Archive inactive CTMS record without losing audit history', pri: 'low', type: 'Functional', last: 'not_run', by: 'Tom Bright', steps: 2, upd: '7d ago', precond: 'CTMS record has prior edits and linked audit history.', stepList: [
      { a: 'Archive the inactive CTMS record from record actions', e: 'Record is removed from active lists' },
      { a: 'Open audit history and historical reports', e: 'Archived record activity remains available for reporting' },
    ] },
    { id: 'TC-1012', suite: 'SSO/IAM', section: 'Role mapping & sync', title: 'SSO/IAM role change propagates to module permissions', pri: 'high', type: 'Security', last: 'pass', by: 'Elena Voss', steps: 2, upd: '5d ago', precond: 'User has Executor access to CTMS and eTMF modules.', stepList: [
      { a: 'Change user from Executor to Reader in User Management', e: 'Role change is saved on the user profile' },
      { a: 'Open CTMS and eTMF permissions for the same user', e: 'User access is downgraded to read-only without manual sync' },
    ] },
  ]

  return raw.map((c) => ({
    id: c.id,
    suite: c.suite,
    section: c.section,
    title: c.title,
    priority: c.pri,
    type: c.type,
    lastResult: c.last,
    assignedTo: c.by,
    steps: c.stepList.map((s) => ({ action: s.a, expected: s.e })),
    preconditions: c.precond,
    tags: c.tags ?? [c.suite.toLowerCase()],
    updatedAt: c.upd,
  }))
}

function mapExecCases(runId: string): ExecCase[] {
  const raw: Array<{
    id: string
    title: string
    status: ExecCase['status']
    by: string
    pri: ExecCase['priority']
    precond: string
    steps: { a: string; e: string }[]
    sr: (ExecCase['status'] | null)[]
    defects: string[]
    suite?: string
    type?: string
  }> = [
    { id: 'TC-2041', title: 'CTMS user role mapping drops Viewer permission', status: 'fail', by: 'Priya Malhotra', pri: 'critical', precond: 'CTMS test tenant contains seeded Admin, Executor, and Reader users with module-level permissions enabled.', steps: [
      { a: 'Assign Viewer permission to the user from User Management', e: 'Viewer permission appears on the user profile' },
      { a: 'Save the permission update', e: 'Success toast confirms the role mapping was saved' },
      { a: 'Reopen the user profile', e: 'Viewer permission is still present' },
      { a: 'Open CTMS as that user', e: 'User can view CTMS records in read-only mode' },
    ], sr: ['fail', null, null, null], defects: ['TI-4419'], suite: 'CTMS', type: 'Functional' },
    { id: 'TC-2042', title: 'eTMF bulk upload preserves document classifications', status: 'not_run', by: 'Priya Malhotra', pri: 'critical', precond: 'eTMF module has bulk upload enabled and five sample PDFs ready.', steps: [
      { a: 'Open the eTMF bulk upload dialog', e: 'Dialog supports multiple files and classification columns' },
      { a: 'Upload five PDFs and classify each row', e: 'Each row has document type, owner, and workflow state' },
      { a: 'Submit the batch and reopen the document list', e: 'All documents retain their selected classifications' },
    ], sr: [null, null, null], defects: [], suite: 'eTMF', type: 'Functional' },
    { id: 'TC-2043', title: 'Viewer grid count updates after filter changes', status: 'pass', by: 'Devon Reyes', pri: 'high', precond: 'Viewer module has seeded rows across multiple statuses.', steps: [
      { a: 'Apply Status = Active filter in the Viewer grid', e: 'Grid displays only active rows' },
      { a: 'Clear the filter and apply Owner = Current user', e: 'Grid displays only rows owned by current user' },
      { a: 'Check footer count after each filter change', e: 'Footer count matches visible row count' },
    ], sr: ['pass', 'pass', 'pass'], defects: [], suite: 'Viewer', type: 'Integration' },
    { id: 'TC-2044', title: 'Reader cannot approve eTMF workflow item', status: 'pass', by: 'Elena Voss', pri: 'high', precond: 'Reader user has access to an eTMF document in QC review.', steps: [
      { a: 'Open document workflow as Reader', e: 'Workflow item is visible in read-only mode' },
      { a: 'Attempt to approve the workflow item', e: 'Approval action is hidden and API rejects direct request' },
    ], sr: ['pass', 'pass'], defects: [], suite: 'eTMF', type: 'Security' },
    { id: 'TC-2045', title: 'Admin can reopen sealed test run', status: 'not_run', by: "Marcus Webb", pri: 'medium', precond: 'Completed test run is sealed with failed executions.', steps: [
      { a: 'Open sealed run as Admin', e: 'Reopen action is available with confirmation' },
      { a: 'Reopen the run and add reason', e: 'Run becomes editable and reason is required' },
      { a: 'Verify audit log records reopen event', e: 'Audit entry includes admin user, timestamp, and reason' },
    ], sr: [null, null, null], defects: [] },
    { id: 'TC-2046', title: 'Reporting export blocks when run data is still syncing', status: 'blocked', by: "Marcus Webb", pri: 'medium', precond: 'Run result aggregation job is still in progress.', steps: [
      { a: 'Open run report while aggregation is in progress', e: 'Report shows syncing state' },
      { a: 'Attempt to export CSV before aggregation completes', e: 'Export is blocked with a clear message' },
      { a: 'Wait for aggregation to complete and retry export', e: 'CSV export is enabled and downloads successfully' },
    ], sr: ['blocked', null, null], defects: ['TI-4422'], suite: 'Reporting', type: 'Functional' },
    { id: 'TC-2047', title: 'Archived CTMS record remains visible in audit history', status: 'not_run', by: 'Tom Bright', pri: 'low', precond: 'CTMS record has historical edits and linked audit events.', steps: [
      { a: 'Archive inactive CTMS record', e: 'Record is removed from active lists' },
      { a: 'Open audit history for the module', e: 'Archived record activity remains visible with archived label' },
    ], sr: [null, null], defects: [] },
    { id: 'TC-2048', title: 'SSO/IAM role change syncs to module permissions', status: 'pass', by: 'Elena Voss', pri: 'high', precond: 'User has Executor access to CTMS and eTMF modules.', steps: [
      { a: 'Downgrade user from Executor to Reader in User Management', e: 'Role change saves successfully' },
      { a: 'Open CTMS and eTMF as the same user', e: 'User has read-only access after sync' },
    ], sr: ['pass', 'pass'], defects: [], suite: 'SSO/IAM', type: 'Security' },
    { id: 'TC-2049', title: 'Export completed run evidence for release sign-off', status: 'not_run', by: 'Shaun Sevume', pri: 'high', precond: 'At least one completed regression run exists for the release.', steps: [
      { a: 'Open completed run and click Export', e: 'Export options dialog is shown' },
      { a: 'Select release sign-off CSV format', e: 'CSV file is generated' },
      { a: 'Open CSV and verify headers match spec', e: 'ID, Title, Status, Assigned, Result, Defect columns are present' },
      { a: 'Verify row count matches execution total', e: 'No missing or extra rows' },
    ], sr: [null, null, null, null], defects: [] },
    { id: 'TC-2050', title: 'Import legacy regression test cases from Excel', status: 'not_run', by: 'Devon Reyes', pri: 'medium', precond: 'Valid .xlsx template with 50 test cases populated.', steps: [
      { a: 'Navigate to Test Cases and click Import', e: 'Import dialog is shown' },
      { a: 'Upload valid regression workbook', e: 'Preview of 50 cases with folder mapping is shown' },
      { a: 'Confirm import', e: '50 cases are created in target folder without error' },
    ], sr: [null, null, null], defects: [] },
  ]

  return raw.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    assignedTo: c.by,
    priority: c.pri,
    preconditions: c.precond,
    steps: c.steps.map((s) => ({ action: s.a, expected: s.e })),
    stepResults: c.sr,
    defects: c.defects,
    suite: c.suite,
    type: c.type,
    tags: c.suite ? [c.suite.toLowerCase()] : undefined,
  }))
}

function countResults(cases: ExecCase[]) {
  return cases.reduce(
    (acc, c) => {
      if (c.status === 'pass') acc.pass++
      else if (c.status === 'fail') acc.fail++
      else if (c.status === 'blocked') acc.blocked++
      else if (c.status === 'skip') acc.skipped++
      else acc.notrun++
      return acc
    },
    { pass: 0, fail: 0, blocked: 0, skipped: 0, notrun: 0 },
  )
}

function buildRuns(): TestRun[] {
  const ctmsCases = mapExecCases('R1')
  const ctmsCounts = countResults(ctmsCases)
  const total = ctmsCases.length

  const runs: TestRun[] = [
    {
      id: 'R1',
      name: 'CTMS Regression — Sprint 44',
      planId: 'PLAN-001',
      planName: 'Release 2.4.1 Regression',
      status: 'active',
      due: '12 May',
      environment: 'UAT',
      pass: ctmsCounts.pass,
      fail: ctmsCounts.fail,
      blocked: ctmsCounts.blocked,
      notrun: ctmsCounts.notrun,
      skipped: ctmsCounts.skipped,
      stalled: false,
      assignees: [
        { name: 'Priya Malhotra', cases: 48 },
        { name: 'Shaun Sevume', cases: 35 },
        { name: 'Devon Reyes', cases: 31 },
        { name: 'Elena Voss', cases: 17 },
      ],
      defects: ['TI-4419', 'TI-4422'],
      cases: ctmsCases,
    },
    {
      id: 'R2',
      name: 'eTMF Document Workflow Smoke — Pre-release',
      planId: 'PLAN-002',
      planName: 'Pre-release Smoke Suite',
      status: 'active',
      due: '9 May',
      environment: 'QA',
      pass: 32,
      fail: 4,
      blocked: 0,
      notrun: 4,
      stalled: false,
      assignees: [
        { name: "Marcus Webb", cases: 18 },
        { name: 'Devon Reyes', cases: 12 },
        { name: 'Elena Voss', cases: 10 },
      ],
      defects: ['TI-4421'],
      cases: ctmsCases.slice(0, 4).map((c, i) => ({
        ...c,
        id: `TC-30${i + 1}`,
        status: i === 1 ? 'fail' : i === 0 ? 'pass' : 'not_run',
      })),
    },
    {
      id: 'R3',
      name: 'Viewer Module — Functional Regression',
      planId: 'PLAN-005',
      planName: 'Viewer Module Regression',
      status: 'stalled',
      due: '10 May',
      environment: 'UAT',
      pass: 28,
      fail: 6,
      blocked: 8,
      notrun: 28,
      stalled: true,
      assignees: [{ name: 'Tom Bright' }],
      defects: [],
      cases: ctmsCases.slice(0, 3),
    },
    {
      id: 'R4',
      name: 'Reporting Module — Integration Suite',
      planId: 'PLAN-004',
      planName: 'Reporting Integration Tests',
      status: 'active',
      due: '11 May',
      environment: 'Staging',
      pass: 49,
      fail: 12,
      blocked: 2,
      notrun: 17,
      stalled: false,
      assignees: [
        { name: 'Devon Reyes', cases: 38 },
        { name: 'Elena Voss', cases: 29 },
        { name: 'Shaun Sevume', cases: 13 },
      ],
      defects: ['TI-4421', 'TI-4422'],
      cases: ctmsCases.slice(0, 5),
    },
    {
      id: 'R5',
      name: 'SSO/IAM Role Matrix — Permission Validation',
      planId: 'PLAN-003',
      planName: 'Permissions Hardening Suite',
      status: 'active',
      due: '12 May',
      environment: 'UAT',
      pass: 8,
      fail: 2,
      blocked: 0,
      notrun: 14,
      stalled: false,
      assignees: [
        { name: "Marcus Webb", cases: 14 },
        { name: 'Priya Malhotra', cases: 10 },
      ],
      defects: [],
      cases: ctmsCases.slice(0, 3),
    },
  ]

  // Normalize totals for display (prototype shows larger totals than case list)
  runs[0].pass = 71
  runs[0].fail = 24
  runs[0].blocked = 7
  runs[0].notrun = 30
  void total

  return runs
}

function buildPlans(): TestPlan[] {
  return [
    {
      id: 'PLAN-001',
      title: 'CTMS Module — Full Regression',
      status: 'active',
      cases: 87,
      description:
        'Full functional regression coverage for the CTMS module. Covers record management, role permissions, user assignment, and audit trail validation.',
      environment: 'UAT',
      owner: 'Priya Malhotra',
      createdBy: 'Shaun Sevume',
      createdAt: '14 Mar 2026',
      suiteCount: '4 suites',
      runsSpawned: 3,
      modules: [
        { name: 'CTMS — Record creation & editing', count: 24, passRate: 88 },
        { name: 'CTMS — Role & permission validation', count: 18, passRate: 94 },
        { name: 'CTMS — User assignment flows', count: 21, passRate: 71 },
        { name: 'CTMS — Audit history', count: 24, passRate: 83 },
      ],
      spawnedRuns: [
        { id: 'R1', status: 'active', name: 'CTMS Regression — Sprint 44', meta: 'Started 2d ago · Priya Malhotra' },
        { id: 'R6', status: 'sealed', name: 'CTMS Regression — Sprint 43', meta: 'Sealed 16d ago · 82% pass' },
        { id: 'R7', status: 'sealed', name: 'CTMS Regression — Sprint 42', meta: 'Sealed 30d ago · 79% pass' },
      ],
    },
    {
      id: 'PLAN-002',
      title: 'eTMF Document Workflow — Regression',
      status: 'active',
      cases: 64,
      description:
        'Regression coverage for eTMF document upload, classification, QC workflow, and metadata preservation.',
      environment: 'UAT',
      owner: 'Devon Reyes',
      createdBy: 'Noel Quadri',
      createdAt: '28 Jan 2026',
      suiteCount: '2 suites',
      runsSpawned: 2,
      modules: [
        { name: 'eTMF — Document upload & scanning', count: 22, passRate: 86 },
        { name: 'eTMF — Classification & QC workflow', count: 42, passRate: 72 },
      ],
      spawnedRuns: [
        { id: 'R2', status: 'active', name: 'eTMF Document Workflow Smoke — Pre-release', meta: 'Started 4h ago · Marcus Webb' },
        { id: 'R8', status: 'sealed', name: 'eTMF Regression — Sprint 43', meta: 'Sealed 18d ago · 76% pass' },
      ],
    },
    {
      id: 'PLAN-003',
      title: 'SSO/IAM & Permissions — Security Suite',
      status: 'active',
      cases: 52,
      description:
        'Security-focused coverage for RBAC enforcement across all modules.',
      environment: 'UAT',
      owner: "Marcus Webb",
      createdBy: 'Shaun Sevume',
      createdAt: '5 Feb 2026',
      suiteCount: '3 suites',
      runsSpawned: 2,
      modules: [
        { name: 'SSO/IAM — Role mapping & sync', count: 18, passRate: 94 },
        { name: 'User Management — Role assignment', count: 16, passRate: 88 },
        { name: 'Module permissions — Cross-module sync', count: 18, passRate: 77 },
      ],
      spawnedRuns: [
        { id: 'R5', status: 'sealed', name: 'SSO/IAM Role Matrix — Permission Validation', meta: 'Sealed 5d ago · 89% pass' },
        { id: 'R9', status: 'sealed', name: 'Permissions Hardening — Sprint 43', meta: 'Sealed 21d ago · 84% pass' },
      ],
    },
    {
      id: 'PLAN-004',
      title: 'Reporting Module — Integration Suite',
      status: 'active',
      cases: 80,
      description: 'Integration test coverage for the Reporting module.',
      environment: 'Staging',
      owner: 'Elena Voss',
      createdBy: 'Noel Quadri',
      createdAt: '12 Feb 2026',
      suiteCount: '4 suites',
      runsSpawned: 2,
      modules: [
        { name: 'Reporting — CSV export formats', count: 18, passRate: 94 },
        { name: 'Reporting — Run summary generation', count: 42, passRate: 72 },
        { name: 'Reporting — Data aggregation jobs', count: 18, passRate: 77 },
        { name: 'API Gateway — Report data endpoints', count: 15, passRate: 80 },
      ],
      spawnedRuns: [
        { id: 'R4', status: 'active', name: 'Reporting Module — Integration Suite', meta: 'Started 1d ago · Devon Reyes' },
        { id: 'R10', status: 'sealed', name: 'Reporting Integration — Sprint 43', meta: 'Sealed 20d ago · 81% pass' },
      ],
    },
    {
      id: 'PLAN-005',
      title: 'Viewer Module — Functional Regression',
      status: 'draft',
      cases: 29,
      description:
        'Draft functional regression plan for the Viewer module. Pending case review.',
      environment: 'QA',
      owner: 'Tom Bright',
      createdBy: 'Shaun Sevume',
      createdAt: '9 May 2026',
      suiteCount: '2 suites',
      runsSpawned: 0,
      modules: [
        { name: 'Viewer — Grid filtering & pagination', count: 14, passRate: null },
        { name: 'Viewer — Read-only permission checks', count: 15, passRate: null },
      ],
      spawnedRuns: [],
    },
  ]
}

const ATTENTION: AttentionItem[] = [
  { id: 'A1', title: 'CTMS user role mapping drops Viewer permission after save', priority: 'critical', runName: 'CTMS Regression · Sprint 44', actor: 'Priya Malhotra · 1h' },
  { id: 'A2', title: 'Viewer grid filter does not refresh row count after change', priority: 'critical', runName: 'Viewer Module Regression', actor: 'Elena Voss · 4h' },
  { id: 'A3', title: 'Document classification applies wrong type after bulk upload', priority: 'high', runName: 'eTMF Document Workflow Smoke', actor: 'Devon Reyes · 2h' },
  { id: 'A4', title: 'Run summary export omits skipped execution rows', priority: 'high', runName: 'Reporting Module · Integration Suite', actor: 'Marcus Webb · 3h', defectId: 'TI-4421' },
  { id: 'A5', title: 'Bulk API import drops request header metadata', priority: 'high', runName: 'API Gateway Regression', actor: 'Devon Reyes · 8h' },
  { id: 'A6', title: 'Reader role can access executor-only test action endpoint', priority: 'medium', runName: 'SSO/IAM Role Matrix', actor: 'Tom Bright · 6h', defectId: 'TI-4398' },
]

export function createInitialState(): DemoState {
  return {
    project: 'TI-Core Platform',
    cases: mapCases(),
    plans: buildPlans(),
    runs: buildRuns(),
    attention: ATTENTION,
    nextCaseNum: 1013,
    nextPlanNum: 6,
    nextRunNum: 11,
  }
}

export const SUITE_TREE = [
  {
    id: 's1',
    name: 'CTMS',
    count: 87,
    sections: [
      { name: 'Record management', count: 24 },
      { name: 'Role & permissions', count: 18 },
      { name: 'User assignment', count: 21 },
      { name: 'Audit history', count: 24 },
    ],
  },
  {
    id: 's2',
    name: 'eTMF',
    count: 64,
    sections: [
      { name: 'Document upload', count: 22 },
      { name: 'Classification & QC', count: 42 },
    ],
  },
  {
    id: 's3',
    name: 'SSO/IAM & User Mgmt',
    count: 52,
    sections: [
      { name: 'Role mapping & sync', count: 18 },
      { name: 'Permission enforcement', count: 16 },
      { name: 'Cross-module access', count: 18 },
    ],
  },
  {
    id: 's4',
    name: 'Viewer',
    count: 29,
    sections: [
      { name: 'Grid & filtering', count: 14 },
      { name: 'Read-only permissions', count: 15 },
    ],
  },
  {
    id: 's5',
    name: 'API Gateway',
    count: 0,
    sections: [{ name: 'Import validation', count: 0, empty: true }],
  },
] as const

export const PROJECTS = [
  'TI-Core Platform',
  'CTMS',
  'eTMF',
  'SSO / IAM',
  'Viewer',
  'Reporting',
  'GlobalLearn',
  'API Gateway',
  'User Management',
] as const

export const DEFECT_NAMES: Record<string, string> = {
  'TI-4419': 'Viewer permission not persisted after role mapping',
  'TI-4421': 'Run summary export omits skipped execution rows',
  'TI-4422': 'Reporting export blocked while run data is syncing',
  'TI-4398': 'Reader role accessing executor-only endpoint',
}
