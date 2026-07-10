/**
 * demo-project-seed.ts
 * Relay — Seed data
 *
 * The 7th seeded project: a richly-populated, explorable "Demo Project"
 * (Shaun, 2026-07-09 — mvp-backend "wire everything" session). Unlike the
 * other 6 projects (CTMS/eTMF/Viewer/SSO-IAM/Reporting/API Gateway, each with
 * a handful of cases and no runs at all), this project exists specifically
 * to give every wired screen (Dashboard/Cases/Plans/Runs/Defects) real,
 * varied data to render on first login — folders with nesting, cases with
 * step counts from 1 to 8, two plans built from different case-selection
 * conditions, and 4 runs spanning every lifecycle stage (two sealed/historical,
 * one in-progress, one not-yet-started) so dashboard aggregates, run history,
 * and per-case result trends all have something real to show. This is also
 * the clone source for the "Create Demo Project" button in ProjectSwitcher.tsx
 * (see DemoProjectService.ts / POST /api/projects/:id/clone).
 *
 * Deliberate scope decisions:
 *   - Requirements linking is NOT modeled here — there is no requirements
 *     table in schema.ts (out of scope for this whole branch, see
 *     TestCaseService.ts's file header). Cases below are varied in every
 *     dimension the real schema *can* represent (steps, priority, type,
 *     tags, assignee, folder, archived) but do not attempt to fake
 *     requirement links.
 *   - Test plan "conditions": the real schema has no dynamic-query storage
 *     (see TestPlanService.ts's file header / known-bugs.md GAP-01) — the two
 *     plans below are built by resolving realistic conditions once, here at
 *     seed time (by priority+folder for "Critical Path", by
 *     non-archived-all for "Full Regression"), then persisting the *result*
 *     as static test_plan_cases rows, exactly like TestPlanService.setPlanCases()
 *     would if a screen called it with a client-resolved list.
 *   - Historical run data: real schema has no append-only per-case execution
 *     transition log (unlike the frontend prototype's `executionLog`) — only
 *     a final status + one `executed_at` timestamp per (run, case). The two
 *     sealed runs below use realistic backdated `executed_at`/`created_at`/
 *     `sealed_at` values so a real trend can be reconstructed as "one data
 *     point per run" rather than "one point per status transition" — a
 *     coarser but genuine trend, not fabricated.
 *   - `run_case_step_snapshots` are generated from each case's live
 *     `test_case_steps` at the moment this seed runs (mirrors what
 *     TestRunService.createRun() does transactionally at real spawn time —
 *     duplicated here since this seed backdates runs the live service
 *     wouldn't naturally produce with historical timestamps).
 */

import type { MySql2Database } from 'drizzle-orm/mysql2'
import {
  folders,
  projectRoles,
  projects,
  runAssignees,
  runCaseStepSnapshots,
  runDefectLinks,
  runStepResults,
  testCaseSteps,
  testCases,
  testPlanCases,
  testPlans,
  testRunCases,
  testRuns,
  type NewFolder,
  type NewProjectRole,
  type NewRunAssignee,
  type NewRunCaseStepSnapshot,
  type NewRunDefectLink,
  type NewRunStepResult,
  type NewTestCase,
  type NewTestCaseStep,
  type NewTestPlan,
  type NewTestPlanCase,
  type NewTestRun,
  type NewTestRunCase,
} from '../../schema'
import type * as schema from '../../schema'
import { createId } from '../utils/id'
import { ids } from './ids'

type CasePriority = 'critical' | 'high' | 'medium' | 'low'
type CaseType = 'functional' | 'smoke' | 'regression' | 'integration' | 'security'
type CaseResultStatus = 'not_run' | 'pass' | 'fail' | 'blocked' | 'skip'

interface StepDef {
  action: string
  expectedResult: string
}

interface CaseDef {
  key: string
  title: string
  folderKey: string | null
  priority: CasePriority
  type: CaseType
  tags: string[]
  assignedTo: string
  isArchived?: boolean
  steps: StepDef[]
}

function daysAgo(n: number, hour = 10): Date {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

export async function insertDemoProjectSeed(
  db: MySql2Database<typeof schema>,
): Promise<void> {
  const projectId = ids.projects.demo

  // ---------------------------------------------------------------------
  // Project
  // ---------------------------------------------------------------------
  await db.insert(projects).values({
    id: projectId,
    orgId: ids.org,
    slug: 'dp',
    name: 'Demo Project',
    description:
      'Explorable reference project — populated with sample folders, test cases of varying complexity, plans, and runs at every lifecycle stage. Use "Create Demo Project" in the project switcher to get your own fresh copy.',
    status: 'active',
    createdBy: ids.users.noel,
  })

  // Every seed user gets an explicit project_roles row here (unlike the
  // other 6 projects, which only grant 3 of 8 users a role) — this is meant
  // to be the one project every account can see and explore regardless of
  // global role, so contributor/viewer accounts (who only see projects with
  // an explicit row — see ProjectService.listProjects()) aren't locked out
  // of the default landing project.
  const projectRoleRows: NewProjectRole[] = [
    { id: createId(), projectId, userId: ids.users.noel, role: 'admin', grantedBy: ids.users.noel },
    { id: createId(), projectId, userId: ids.users.shaun, role: 'admin', grantedBy: ids.users.noel },
    { id: createId(), projectId, userId: ids.users.priya, role: 'contributor', grantedBy: ids.users.noel },
    { id: createId(), projectId, userId: ids.users.marcus, role: 'contributor', grantedBy: ids.users.noel },
    { id: createId(), projectId, userId: ids.users.james, role: 'contributor', grantedBy: ids.users.noel },
    { id: createId(), projectId, userId: ids.users.viewer, role: 'contributor', grantedBy: ids.users.noel },
    { id: createId(), projectId, userId: ids.users.nadim, role: 'viewer', grantedBy: ids.users.noel },
    { id: createId(), projectId, userId: ids.users.syed, role: 'contributor', grantedBy: ids.users.noel },
  ]
  await db.insert(projectRoles).values(projectRoleRows)

  // ---------------------------------------------------------------------
  // Folders (one nested, to show hierarchy; 2 cases stay unfiled)
  // ---------------------------------------------------------------------
  const folderIds = {
    auth: createId(),
    authPwReset: createId(),
    checkout: createId(),
    search: createId(),
  }

  const folderRows: NewFolder[] = [
    {
      id: folderIds.auth,
      projectId,
      name: 'Authentication',
      description: 'Login, lockout, and session behaviour',
      position: 0,
      createdBy: ids.users.shaun,
    },
    {
      id: folderIds.authPwReset,
      projectId,
      parentId: folderIds.auth,
      name: 'Password Recovery',
      description: 'Reset-link request, redemption, and expiry',
      position: 0,
      createdBy: ids.users.priya,
    },
    {
      id: folderIds.checkout,
      projectId,
      name: 'Checkout & Payments',
      description: 'Cart, payment methods, promo codes, tax',
      position: 1,
      createdBy: ids.users.james,
    },
    {
      id: folderIds.search,
      projectId,
      name: 'Search & Discovery',
      description: 'Search, filtering, and autocomplete',
      position: 2,
      createdBy: ids.users.nadim,
    },
  ]
  await db.insert(folders).values(folderRows)

  // ---------------------------------------------------------------------
  // Cases + steps
  // ---------------------------------------------------------------------
  const caseDefs: CaseDef[] = [
    {
      key: 'login',
      title: 'Log in with valid email and password',
      folderKey: 'auth',
      priority: 'critical',
      type: 'functional',
      tags: ['auth', 'login'],
      assignedTo: ids.users.shaun,
      steps: [
        { action: 'Navigate to /login and submit a valid email + password', expectedResult: 'User is redirected to the dashboard' },
        { action: 'Reload the dashboard page', expectedResult: 'Session persists; user remains logged in' },
      ],
    },
    {
      key: 'lockout',
      title: 'Lock account after 5 failed login attempts',
      folderKey: 'auth',
      priority: 'high',
      type: 'security',
      tags: ['auth', 'security'],
      assignedTo: ids.users.marcus,
      steps: [
        { action: 'Attempt login with an incorrect password 5 times', expectedResult: 'Account is locked after the 5th attempt' },
        { action: 'Attempt a 6th login with the correct password', expectedResult: 'Login is rejected with an account-locked message' },
        { action: 'Wait for the lockout window to expire and retry', expectedResult: 'Login succeeds with the correct password' },
      ],
    },
    {
      key: 'pwResetLink',
      title: 'Reset password via emailed link',
      folderKey: 'authPwReset',
      priority: 'high',
      type: 'functional',
      tags: ['auth', 'password-reset'],
      assignedTo: ids.users.priya,
      steps: [
        { action: 'Request a password reset from the login page', expectedResult: 'Reset email is sent to the registered address' },
        { action: 'Open the reset link from the email', expectedResult: 'Reset-password form is displayed' },
        { action: 'Enter a new password meeting complexity rules', expectedResult: 'Password is accepted' },
        { action: 'Submit the form', expectedResult: 'Password is updated and user is redirected to login' },
        { action: 'Log in with the new password', expectedResult: 'Login succeeds' },
      ],
    },
    {
      key: 'pwResetExpired',
      title: 'Reject expired password reset link',
      folderKey: 'authPwReset',
      priority: 'medium',
      type: 'functional',
      tags: ['auth', 'password-reset'],
      assignedTo: ids.users.priya,
      steps: [
        { action: 'Request a password reset and wait past the expiry window', expectedResult: 'Reset link expires per policy' },
        { action: 'Open the expired reset link', expectedResult: 'User sees an "expired link" message with a resend option' },
      ],
    },
    {
      key: 'checkoutSavedCard',
      title: 'Complete checkout with a saved credit card',
      folderKey: 'checkout',
      priority: 'critical',
      type: 'functional',
      tags: ['checkout', 'payments'],
      assignedTo: ids.users.james,
      steps: [
        { action: 'Add an item to the cart', expectedResult: 'Cart count increments' },
        { action: 'Proceed to checkout', expectedResult: 'Checkout page loads with shipping details prefilled' },
        { action: 'Select a saved credit card', expectedResult: 'Card is selected as the payment method' },
        { action: 'Review the order summary', expectedResult: 'Totals match cart contents including tax' },
        { action: 'Place the order', expectedResult: 'Order confirmation page is displayed' },
        { action: 'Check order history', expectedResult: 'New order appears with the correct status' },
      ],
    },
    {
      key: 'promoCode',
      title: 'Apply a valid promo code at checkout',
      folderKey: 'checkout',
      priority: 'medium',
      type: 'functional',
      tags: ['checkout', 'promotions'],
      assignedTo: ids.users.james,
      steps: [
        { action: 'Enter a valid promo code at checkout', expectedResult: 'Discount is applied to the order total' },
        { action: 'Remove the promo code', expectedResult: 'Order total reverts to the original amount' },
      ],
    },
    {
      key: 'expiredCard',
      title: 'Decline checkout when the saved card is expired',
      folderKey: 'checkout',
      priority: 'high',
      type: 'functional',
      tags: ['checkout', 'payments'],
      assignedTo: ids.users.viewer,
      steps: [
        { action: 'Select a saved card with a past expiry date', expectedResult: 'Card is flagged as expired in the UI' },
        { action: 'Attempt to place the order with the expired card', expectedResult: 'Checkout is blocked with an expired-card error' },
        { action: 'Switch to a valid card and retry', expectedResult: 'Order completes successfully' },
      ],
    },
    {
      key: 'multiRegionTax',
      title: 'Calculate tax correctly for a multi-region cart',
      folderKey: 'checkout',
      priority: 'high',
      type: 'regression',
      tags: ['checkout', 'tax', 'regression'],
      assignedTo: ids.users.syed,
      steps: [
        { action: 'Set the shipping address to Region A', expectedResult: 'Tax rate for Region A is displayed at checkout' },
        { action: 'Add a taxable item to the cart', expectedResult: 'Line-item tax matches the Region A rate' },
        { action: 'Add a tax-exempt item to the cart', expectedResult: 'No tax is applied to the exempt item' },
        { action: 'Change the shipping address to Region B', expectedResult: 'Tax recalculates using the Region B rate' },
        { action: 'Apply a promo code alongside the region change', expectedResult: 'Tax is recalculated on the discounted subtotal' },
        { action: 'Add a second item from a third-region warehouse', expectedResult: 'Tax uses the destination-based rate, not the warehouse region' },
        { action: 'Proceed to payment', expectedResult: 'Order summary tax total matches the sum of line-item taxes' },
        { action: 'Place the order', expectedResult: 'Generated invoice shows itemized tax by region' },
      ],
    },
    {
      key: 'searchPartial',
      title: 'Search returns relevant results for a partial query',
      folderKey: 'search',
      priority: 'medium',
      type: 'functional',
      tags: ['search'],
      assignedTo: ids.users.nadim,
      steps: [
        { action: 'Enter a partial product name in search', expectedResult: 'Relevant matching products are returned' },
      ],
    },
    {
      key: 'searchFilters',
      title: 'Filter search results by category and price range',
      folderKey: 'search',
      priority: 'medium',
      type: 'functional',
      tags: ['search', 'filters'],
      assignedTo: ids.users.nadim,
      steps: [
        { action: 'Run a search query', expectedResult: 'Result list is displayed' },
        { action: 'Apply a category filter', expectedResult: 'Results narrow to the selected category' },
        { action: 'Apply a price range filter', expectedResult: 'Results further narrow to the price range' },
        { action: 'Clear all filters', expectedResult: 'Full result set is restored' },
      ],
    },
    {
      key: 'searchAutocomplete',
      title: 'Autocomplete suggests recently viewed items',
      folderKey: 'search',
      priority: 'low',
      type: 'functional',
      tags: ['search'],
      assignedTo: ids.users.syed,
      steps: [
        { action: 'Focus the search box after viewing two products', expectedResult: 'Recently viewed items appear as autocomplete suggestions' },
      ],
    },
    {
      key: 'apiRateLimit',
      title: 'API rate limit returns 429 with Retry-After header',
      folderKey: null,
      priority: 'high',
      type: 'integration',
      tags: ['api', 'rate-limit'],
      assignedTo: ids.users.noel,
      steps: [
        { action: 'Send requests exceeding the rate limit threshold', expectedResult: 'API returns HTTP 429' },
        { action: 'Inspect the response headers', expectedResult: 'Retry-After header specifies the correct wait time' },
      ],
    },
    {
      key: 'sitemap',
      title: 'sitemap.xml includes all published pages',
      folderKey: null,
      priority: 'low',
      type: 'smoke',
      tags: ['seo'],
      assignedTo: ids.users.noel,
      steps: [
        { action: 'Fetch /sitemap.xml', expectedResult: 'All published pages are listed with correct URLs' },
      ],
    },
    {
      key: 'archivedPlaceholder',
      title: 'Legacy checkout flow (superseded)',
      folderKey: null,
      priority: 'low',
      type: 'functional',
      tags: ['deprecated'],
      assignedTo: ids.users.shaun,
      isArchived: true,
      steps: [
        { action: 'Old test — superseded by newer coverage', expectedResult: 'N/A — kept archived for reference' },
      ],
    },
  ]

  const caseIds: Record<string, string> = {}
  const caseRows: NewTestCase[] = []
  const stepRows: NewTestCaseStep[] = []
  const stepsByCase: Record<string, { id: string; action: string; expectedResult: string }[]> = {}

  caseDefs.forEach((def, i) => {
    const caseId = createId()
    caseIds[def.key] = caseId
    caseRows.push({
      id: caseId,
      caseRef: `TC-${1001 + i}`,
      projectId,
      folderId: def.folderKey ? folderIds[def.folderKey as keyof typeof folderIds] : null,
      title: def.title,
      priority: def.priority,
      type: def.type,
      tags: def.tags,
      assignedTo: def.assignedTo,
      isArchived: def.isArchived ?? false,
      createdBy: ids.users.noel,
      position: i,
    })
    stepsByCase[def.key] = []
    def.steps.forEach((s, si) => {
      const stepId = createId()
      stepRows.push({
        id: stepId,
        testCaseId: caseId,
        position: si + 1,
        action: s.action,
        expectedResult: s.expectedResult,
      })
      stepsByCase[def.key].push({ id: stepId, action: s.action, expectedResult: s.expectedResult })
    })
  })

  await db.insert(testCases).values(caseRows)
  await db.insert(testCaseSteps).values(stepRows)

  // ---------------------------------------------------------------------
  // Plans — two different "conditions", resolved here and persisted as
  // static test_plan_cases (see file header re: no dynamic-query storage).
  // ---------------------------------------------------------------------
  const criticalPathCaseKeys = [
    'login', 'lockout', 'pwResetLink', 'checkoutSavedCard', 'expiredCard', 'multiRegionTax',
  ] // condition: priority in (critical, high) AND folder in (Authentication*, Checkout & Payments)

  const fullRegressionCaseKeys = caseDefs
    .filter((d) => !d.isArchived)
    .map((d) => d.key) // condition: all non-archived cases

  const planIds = { criticalPath: ids.plans.demoCriticalPath, fullRegression: ids.plans.demoFullRegression }

  const planRows: NewTestPlan[] = [
    {
      id: planIds.criticalPath,
      planRef: 'PLAN-001',
      projectId,
      title: 'Critical Path',
      description: 'Critical/high-priority coverage across Authentication and Checkout — resolved from a priority + folder condition.',
      status: 'active',
      environment: 'Staging',
      ownerId: ids.users.shaun,
      createdBy: ids.users.shaun,
      assigneeIds: [ids.users.shaun, ids.users.james],
    },
    {
      id: planIds.fullRegression,
      planRef: 'PLAN-002',
      projectId,
      title: 'Full Regression',
      description: 'Every non-archived test case in the project — resolved from an "all cases" condition.',
      status: 'active',
      environment: 'QA',
      ownerId: ids.users.noel,
      createdBy: ids.users.noel,
      assigneeIds: [ids.users.noel, ids.users.marcus, ids.users.priya],
    },
  ]
  await db.insert(testPlans).values(planRows)

  const planCaseRows: NewTestPlanCase[] = [
    ...criticalPathCaseKeys.map((key, i): NewTestPlanCase => ({
      id: createId(),
      testPlanId: planIds.criticalPath,
      testCaseId: caseIds[key],
      position: i,
      addedBy: ids.users.shaun,
    })),
    ...fullRegressionCaseKeys.map((key, i): NewTestPlanCase => ({
      id: createId(),
      testPlanId: planIds.fullRegression,
      testCaseId: caseIds[key],
      position: i,
      addedBy: ids.users.noel,
    })),
  ]
  await db.insert(testPlanCases).values(planCaseRows)

  // ---------------------------------------------------------------------
  // Runs — 4 lifecycle stages: two sealed/historical, one in-progress,
  // one not-yet-started. Helper builds run + run_cases + step snapshots
  // from a case-key list and a per-case result map.
  // ---------------------------------------------------------------------
  function caseDefByKey(key: string): CaseDef {
    const def = caseDefs.find((d) => d.key === key)
    if (!def) throw new Error(`Unknown demo case key: ${key}`)
    return def
  }

  interface RunResultDef {
    status: CaseResultStatus
    testedBy?: string
    comment?: string
  }

  interface BuildRunInput {
    runRef: string
    title: string
    planId: string | null
    status: 'active' | 'sealed'
    createdAt: Date
    sealedAt?: Date
    sealedBy?: string
    environment: string
    createdBy: string
    assignees: string[]
    caseKeys: string[]
    results: Record<string, RunResultDef>
    /** Days-ago offset for executedAt on executed cases, relative to createdAt. */
    executedDaysAfterCreate?: number
  }

  const runRows: NewTestRun[] = []
  const runCaseRows: NewTestRunCase[] = []
  const stepSnapshotRows: NewRunCaseStepSnapshot[] = []
  const stepResultRows: NewRunStepResult[] = []
  const defectLinkRows: NewRunDefectLink[] = []
  const runAssigneeRows: NewRunAssignee[] = []

  function buildRun(input: BuildRunInput): string {
    const runId = createId()
    const executedAt = new Date(input.createdAt)
    executedAt.setHours(executedAt.getHours() + (input.executedDaysAfterCreate ?? 0) * 24 + 2)

    runRows.push({
      id: runId,
      runRef: input.runRef,
      projectId,
      testPlanId: input.planId,
      title: input.title,
      status: input.status,
      environment: input.environment,
      createdBy: input.createdBy,
      sealedAt: input.sealedAt ?? null,
      sealedBy: input.sealedBy ?? null,
      createdAt: input.createdAt,
      updatedAt: input.sealedAt ?? input.createdAt,
    })

    input.caseKeys.forEach((key, i) => {
      const def = caseDefByKey(key)
      const caseId = caseIds[key]
      const result = input.results[key] ?? { status: 'not_run' as CaseResultStatus }
      const runCaseId = createId()
      const isExecuted = result.status !== 'not_run'

      runCaseRows.push({
        id: runCaseId,
        testRunId: runId,
        testCaseId: caseId,
        snapshotCaseRef: `TC-${1001 + caseDefs.findIndex((d) => d.key === key)}`,
        snapshotTitle: def.title,
        snapshotPriority: def.priority,
        snapshotType: def.type,
        snapshotFolderName: def.folderKey
          ? folderRows.find((f) => f.id === folderIds[def.folderKey as keyof typeof folderIds])?.name ?? null
          : null,
        snapshotTags: def.tags,
        assignedTo: def.assignedTo,
        status: result.status,
        comment: result.comment ?? null,
        executedBy: isExecuted ? (result.testedBy ?? def.assignedTo) : null,
        executedAt: isExecuted ? executedAt : null,
        position: i,
        createdAt: input.createdAt,
        updatedAt: isExecuted ? executedAt : input.createdAt,
      })

      const snaps = stepsByCase[key].map((s, si) => {
        const snapId = createId()
        stepSnapshotRows.push({
          id: snapId,
          testRunCaseId: runCaseId,
          originalStepId: s.id,
          position: si + 1,
          action: s.action,
          expectedResult: s.expectedResult,
          createdAt: input.createdAt,
        })
        return snapId
      })

      // Step-level results for a couple of executed multi-step cases only —
      // enough to show the feature working without hand-authoring every
      // step of every case in every run.
      if (isExecuted && (key === 'multiRegionTax' || key === 'checkoutSavedCard') && snaps.length > 0) {
        snaps.forEach((snapId, si) => {
          const stepStatus: CaseResultStatus =
            result.status === 'fail' && si === snaps.length - 2 ? 'fail' : 'pass'
          stepResultRows.push({
            id: createId(),
            testRunCaseId: runCaseId,
            stepSnapshotId: snapId,
            status: stepStatus,
            executedBy: result.testedBy ?? def.assignedTo,
            executedAt,
            createdAt: input.createdAt,
            updatedAt: executedAt,
          })
        })
      }

      if (result.status === 'fail' || result.status === 'blocked') {
        // Link a defect on the notable failures so Defects/"needs attention"
        // has something real to show.
        if (key === 'multiRegionTax' || key === 'expiredCard') {
          defectLinkRows.push({
            id: createId(),
            testRunCaseId: runCaseId,
            defectRef: key === 'multiRegionTax' ? 'JIRA-4471' : 'JIRA-4522',
            defectUrl: null,
            linkedBy: input.createdBy,
            linkedAt: executedAt,
          })
        }
      }
    })

    input.assignees.forEach((userId) => {
      runAssigneeRows.push({
        id: createId(),
        testRunId: runId,
        userId,
        assignedBy: input.createdBy,
        assignedAt: input.createdAt,
      })
    })

    return runId
  }

  // R1 — sealed, ~18 days ago: Full Regression, a few real failures.
  buildRun({
    runRef: 'RUN-0001',
    title: 'Full Regression — Sprint 40',
    planId: planIds.fullRegression,
    status: 'sealed',
    createdAt: daysAgo(18),
    sealedAt: daysAgo(17, 16),
    sealedBy: ids.users.noel,
    environment: 'QA',
    createdBy: ids.users.noel,
    assignees: [ids.users.noel, ids.users.marcus, ids.users.priya],
    caseKeys: fullRegressionCaseKeys,
    executedDaysAfterCreate: 0,
    results: Object.fromEntries(
      fullRegressionCaseKeys.map((key): [string, RunResultDef] => {
        if (key === 'multiRegionTax') {
          return [key, { status: 'fail', testedBy: ids.users.syed, comment: 'Tax miscalculated for the 3rd-region warehouse item — used origin rate instead of destination rate.' }]
        }
        if (key === 'pwResetExpired') {
          return [key, { status: 'fail', testedBy: ids.users.priya, comment: 'Expired-link message not shown; reset form still submits successfully.' }]
        }
        if (key === 'searchAutocomplete') {
          return [key, { status: 'blocked', testedBy: ids.users.syed, comment: 'Recommendation service was down in this environment — could not verify.' }]
        }
        return [key, { status: 'pass', testedBy: caseDefByKey(key).assignedTo }]
      }),
    ),
  })

  // R2 — sealed, ~6 days ago: Full Regression again, improved pass rate
  // (multiRegionTax still failing — same real bug, not yet fixed).
  buildRun({
    runRef: 'RUN-0002',
    title: 'Full Regression — Sprint 42',
    planId: planIds.fullRegression,
    status: 'sealed',
    createdAt: daysAgo(6),
    sealedAt: daysAgo(5, 16),
    sealedBy: ids.users.noel,
    environment: 'QA',
    createdBy: ids.users.noel,
    assignees: [ids.users.noel, ids.users.marcus, ids.users.priya],
    caseKeys: fullRegressionCaseKeys,
    executedDaysAfterCreate: 0,
    results: Object.fromEntries(
      fullRegressionCaseKeys.map((key): [string, RunResultDef] => {
        if (key === 'multiRegionTax') {
          return [key, { status: 'fail', testedBy: ids.users.syed, comment: 'Still reproduces — same origin-rate bug as Sprint 40, not yet fixed.' }]
        }
        return [key, { status: 'pass', testedBy: caseDefByKey(key).assignedTo }]
      }),
    ),
  })

  // R3 — active, in progress (~2 days ago): Critical Path, half executed.
  buildRun({
    runRef: 'RUN-0003',
    title: 'Critical Path — Release Candidate',
    planId: planIds.criticalPath,
    status: 'active',
    createdAt: daysAgo(2),
    environment: 'Staging',
    createdBy: ids.users.shaun,
    assignees: [ids.users.shaun, ids.users.james],
    caseKeys: criticalPathCaseKeys,
    executedDaysAfterCreate: 0,
    results: {
      login: { status: 'pass', testedBy: ids.users.shaun },
      lockout: { status: 'pass', testedBy: ids.users.marcus },
      expiredCard: { status: 'fail', testedBy: ids.users.viewer, comment: 'Expired card is accepted instead of blocked — regression from last release.' },
      // pwResetLink, checkoutSavedCard, multiRegionTax intentionally left
      // "not_run" (default) — this run is still in progress.
    },
  })

  // R4 — active, not started: Full Regression, freshly spawned today.
  buildRun({
    runRef: 'RUN-0004',
    title: 'Full Regression — Sprint 43',
    planId: planIds.fullRegression,
    status: 'active',
    createdAt: daysAgo(0),
    environment: 'QA',
    createdBy: ids.users.noel,
    assignees: [ids.users.noel, ids.users.marcus],
    caseKeys: fullRegressionCaseKeys,
    results: {},
  })

  await db.insert(testRuns).values(runRows)
  await db.insert(testRunCases).values(runCaseRows)
  if (stepSnapshotRows.length > 0) await db.insert(runCaseStepSnapshots).values(stepSnapshotRows)
  if (stepResultRows.length > 0) await db.insert(runStepResults).values(stepResultRows)
  if (defectLinkRows.length > 0) await db.insert(runDefectLinks).values(defectLinkRows)
  if (runAssigneeRows.length > 0) await db.insert(runAssignees).values(runAssigneeRows)
}

/** Ref-counter seed rows for the demo project — next case/run/plan number after everything above. */
export function demoProjectRefCounterRows(): Array<{
  projectId: string
  entityType: 'case' | 'run' | 'plan'
  nextValue: number
}> {
  return [
    { projectId: ids.projects.demo, entityType: 'case', nextValue: 1015 },
    { projectId: ids.projects.demo, entityType: 'run', nextValue: 5 },
    { projectId: ids.projects.demo, entityType: 'plan', nextValue: 3 },
  ]
}
