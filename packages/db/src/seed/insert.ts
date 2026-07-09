import bcryptjs from 'bcryptjs'
import { sql } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import {
  folders,
  organisations,
  projectRoles,
  projects,
  testCaseSteps,
  testCases,
  testPlanCases,
  testPlans,
  users,
} from '../../schema'
import type * as schema from '../../schema'
import { ids } from './ids'

/** Shared local-dev password for all seed users. Documented in README.md. */
export const SEED_DEV_PASSWORD = 'relay-dev-2026'

export async function insertSeedData(
  db: MySql2Database<typeof schema>,
): Promise<void> {
  await db.insert(organisations).values({
    id: ids.org,
    slug: 'relay-dev',
    name: 'Relay Development Organisation',
    isActive: true,
  })

  const devPasswordHash = bcryptjs.hashSync(SEED_DEV_PASSWORD, 12)

  await db.insert(users).values([
    {
      id: ids.users.noel,
      orgId: ids.org,
      email: 'noel.quadri@relay-dev.local',
      name: 'Noel Quadri',
      globalRole: 'super_admin',
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.shaun,
      orgId: ids.org,
      email: 'shaun.sevume@relay-dev.local',
      name: 'Shaun Sevume',
      globalRole: 'admin',
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.priya,
      orgId: ids.org,
      email: 'priya.nair@relay-dev.local',
      name: 'Monica Dayalani',
      globalRole: 'contributor',
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.marcus,
      orgId: ids.org,
      email: 'marcus.webb@relay-dev.local',
      name: 'Nasir Dipto',
      // Run Executor (frontend admin role) -> contributor. Was 'admin'; downgraded
      // to match the "Run Executor" designation from Shaun's 2026-07-09 role pass.
      globalRole: 'contributor',
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.james,
      orgId: ids.org,
      email: 'james.osullivan@relay-dev.local',
      name: 'Jamil Khan',
      globalRole: 'contributor', // Run Executor
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.viewer,
      orgId: ids.org,
      email: 'viewer@relay-dev.local',
      name: 'Arvindh Chandran',
      // Editor (frontend admin role) -> contributor. Was 'viewer'; upgraded to
      // match the "Editor" designation from Shaun's 2026-07-09 role pass.
      globalRole: 'contributor',
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.nadim,
      orgId: ids.org,
      email: 'nadim.sharif@relay-dev.local',
      name: 'Nadim Sharif',
      globalRole: 'viewer', // Viewer
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.syed,
      orgId: ids.org,
      email: 'syed.ahmed@relay-dev.local',
      name: 'Syed Ahmed',
      globalRole: 'contributor', // Run Manager -> contributor (DB has no distinct Run Manager role)
      isActive: true,
      passwordHash: devPasswordHash,
    },
  ])

  await db.insert(projects).values([
    {
      id: ids.projects.ctms,
      orgId: ids.org,
      slug: 'ctms',
      name: 'CTMS',
      description: 'Clinical trial management system QA module',
      status: 'active',
      createdBy: ids.users.noel,
    },
    {
      id: ids.projects.etmf,
      orgId: ids.org,
      slug: 'etmf',
      name: 'eTMF',
      description: 'Electronic trial master file module',
      status: 'active',
      createdBy: ids.users.noel,
    },
    {
      id: ids.projects.viewer,
      orgId: ids.org,
      slug: 'viewer',
      name: 'Viewer',
      description: 'Study document viewer module',
      status: 'active',
      createdBy: ids.users.marcus,
    },
    {
      id: ids.projects.ssoIam,
      orgId: ids.org,
      slug: 'sso-iam',
      name: 'SSO / IAM',
      description: 'Single sign-on and identity access management',
      status: 'active',
      createdBy: ids.users.marcus,
    },
    {
      id: ids.projects.reporting,
      orgId: ids.org,
      slug: 'reporting',
      name: 'Reporting',
      description: 'Operational and clinical reporting module',
      status: 'active',
      createdBy: ids.users.marcus,
    },
    {
      id: ids.projects.apiGateway,
      orgId: ids.org,
      slug: 'api-gateway',
      name: 'API Gateway',
      description: 'Platform API gateway and integration surface',
      status: 'active',
      createdBy: ids.users.noel,
    },
  ])

  await db.insert(projectRoles).values([
    {
      id: ids.projectRoles.shaunCtms,
      projectId: ids.projects.ctms,
      userId: ids.users.shaun,
      role: 'admin',
      grantedBy: ids.users.noel,
    },
    {
      id: ids.projectRoles.priyaCtms,
      projectId: ids.projects.ctms,
      userId: ids.users.priya,
      role: 'contributor',
      grantedBy: ids.users.shaun,
    },
    {
      id: ids.projectRoles.jamesEtmf,
      projectId: ids.projects.etmf,
      userId: ids.users.james,
      role: 'contributor',
      grantedBy: ids.users.shaun,
    },
  ])

  await db.insert(folders).values([
    {
      id: ids.folders.ctmsStudySetup,
      projectId: ids.projects.ctms,
      name: 'Study Setup',
      description: 'Site activation, protocol config, and study metadata',
      position: 0,
      createdBy: ids.users.shaun,
    },
    {
      id: ids.folders.ctmsVisits,
      projectId: ids.projects.ctms,
      name: 'Subject Visits',
      description: 'Visit scheduling, capture, and visit report workflows',
      position: 1,
      createdBy: ids.users.shaun,
    },
    {
      id: ids.folders.etmfUpload,
      projectId: ids.projects.etmf,
      name: 'Document Upload',
      position: 0,
      createdBy: ids.users.james,
    },
    {
      id: ids.folders.etmfQc,
      projectId: ids.projects.etmf,
      name: 'QC Review',
      position: 1,
      createdBy: ids.users.james,
    },
    {
      id: ids.folders.viewerLoad,
      projectId: ids.projects.viewer,
      name: 'Study Viewer Load',
      position: 0,
      createdBy: ids.users.priya,
    },
    {
      id: ids.folders.viewerAnnotations,
      projectId: ids.projects.viewer,
      name: 'Annotations',
      position: 1,
      createdBy: ids.users.priya,
    },
    {
      id: ids.folders.ssoLogin,
      projectId: ids.projects.ssoIam,
      name: 'Login & SSO',
      position: 0,
      createdBy: ids.users.marcus,
    },
    {
      id: ids.folders.ssoRoles,
      projectId: ids.projects.ssoIam,
      name: 'Role Mapping',
      position: 1,
      createdBy: ids.users.marcus,
    },
    {
      id: ids.folders.reportingExport,
      projectId: ids.projects.reporting,
      name: 'Dashboard Export',
      position: 0,
      createdBy: ids.users.marcus,
    },
    {
      id: ids.folders.reportingScheduled,
      projectId: ids.projects.reporting,
      name: 'Scheduled Reports',
      position: 1,
      createdBy: ids.users.marcus,
    },
    {
      id: ids.folders.apiRouting,
      projectId: ids.projects.apiGateway,
      name: 'Routing',
      position: 0,
      createdBy: ids.users.noel,
    },
    {
      id: ids.folders.apiAuth,
      projectId: ids.projects.apiGateway,
      name: 'Auth Middleware',
      position: 1,
      createdBy: ids.users.noel,
    },
  ])

  await db.insert(testCases).values([
    {
      id: ids.cases.ctmsTc1001,
      caseRef: 'TC-1001',
      projectId: ids.projects.ctms,
      folderId: ids.folders.ctmsStudySetup,
      title: 'Create study with required protocol fields',
      priority: 'critical',
      type: 'functional',
      preconditions: 'Admin account with CTMS project access',
      tags: ['ctms', 'study-setup', 'regression'],
      assignedTo: ids.users.priya,
      createdBy: ids.users.shaun,
      position: 0,
    },
    {
      id: ids.cases.ctmsTc1002,
      caseRef: 'TC-1002',
      projectId: ids.projects.ctms,
      folderId: ids.folders.ctmsStudySetup,
      title: 'Validate site activation checklist completion',
      priority: 'high',
      type: 'smoke',
      tags: ['ctms', 'site-activation'],
      assignedTo: ids.users.priya,
      createdBy: ids.users.shaun,
      position: 1,
    },
    {
      id: ids.cases.ctmsTc1003,
      caseRef: 'TC-1003',
      projectId: ids.projects.ctms,
      folderId: ids.folders.ctmsVisits,
      title: 'Schedule screening visit for enrolled subject',
      priority: 'high',
      type: 'regression',
      tags: ['ctms', 'visits'],
      assignedTo: ids.users.priya,
      createdBy: ids.users.shaun,
      position: 0,
    },
    {
      id: ids.cases.ctmsTc1004,
      caseRef: 'TC-1004',
      projectId: ids.projects.ctms,
      folderId: ids.folders.ctmsVisits,
      title: 'Lock visit form after PI sign-off',
      priority: 'medium',
      type: 'functional',
      tags: ['ctms', 'visits', 'locking'],
      assignedTo: ids.users.james,
      createdBy: ids.users.shaun,
      position: 1,
    },
    {
      id: ids.cases.etmfTc1001,
      caseRef: 'TC-1001',
      projectId: ids.projects.etmf,
      folderId: ids.folders.etmfUpload,
      title: 'Upload TMF artifact with correct metadata',
      priority: 'high',
      type: 'functional',
      tags: ['etmf', 'upload'],
      assignedTo: ids.users.james,
      createdBy: ids.users.shaun,
      position: 0,
    },
    {
      id: ids.cases.etmfTc1002,
      caseRef: 'TC-1002',
      projectId: ids.projects.etmf,
      folderId: ids.folders.etmfQc,
      title: 'Reject document with missing signature page',
      priority: 'critical',
      type: 'regression',
      tags: ['etmf', 'qc'],
      assignedTo: ids.users.james,
      createdBy: ids.users.shaun,
      position: 0,
    },
    {
      id: ids.cases.viewerTc1001,
      caseRef: 'TC-1001',
      projectId: ids.projects.viewer,
      folderId: ids.folders.viewerLoad,
      title: 'Open large PDF study binder under 5 seconds',
      priority: 'high',
      type: 'functional',
      tags: ['viewer', 'performance'],
      assignedTo: ids.users.priya,
      createdBy: ids.users.marcus,
      position: 0,
    },
    {
      id: ids.cases.ssoTc1001,
      caseRef: 'TC-1001',
      projectId: ids.projects.ssoIam,
      folderId: ids.folders.ssoLogin,
      title: 'Authenticate via corporate SSO provider',
      priority: 'critical',
      type: 'security',
      tags: ['sso', 'login'],
      assignedTo: ids.users.marcus,
      createdBy: ids.users.marcus,
      position: 0,
    },
    {
      id: ids.cases.ssoTc1002,
      caseRef: 'TC-1002',
      projectId: ids.projects.ssoIam,
      folderId: ids.folders.ssoRoles,
      title: 'Map application role to IdP group',
      priority: 'high',
      type: 'integration',
      tags: ['sso', 'roles'],
      assignedTo: ids.users.marcus,
      createdBy: ids.users.marcus,
      position: 0,
    },
    {
      id: ids.cases.reportingTc1001,
      caseRef: 'TC-1001',
      projectId: ids.projects.reporting,
      folderId: ids.folders.reportingExport,
      title: 'Export dashboard to CSV with applied filters',
      priority: 'medium',
      type: 'functional',
      tags: ['reporting', 'export'],
      assignedTo: ids.users.priya,
      createdBy: ids.users.marcus,
      position: 0,
    },
    {
      id: ids.cases.apiTc1001,
      caseRef: 'TC-1001',
      projectId: ids.projects.apiGateway,
      folderId: ids.folders.apiRouting,
      title: 'Route request to CTMS upstream with trace header',
      priority: 'high',
      type: 'integration',
      tags: ['api-gateway', 'routing'],
      assignedTo: ids.users.noel,
      createdBy: ids.users.noel,
      position: 0,
    },
  ])

  await db.insert(testCaseSteps).values([
    {
      id: ids.steps.ctmsTc1001S1,
      testCaseId: ids.cases.ctmsTc1001,
      position: 1,
      action: 'Navigate to Studies and click New Study',
      expectedResult: 'Study creation wizard opens on step 1',
    },
    {
      id: ids.steps.ctmsTc1001S2,
      testCaseId: ids.cases.ctmsTc1001,
      position: 2,
      action: 'Enter protocol ID, title, and sponsor; submit',
      expectedResult: 'Study is created and visible in the study list',
    },
    {
      id: ids.steps.ctmsTc1002S1,
      testCaseId: ids.cases.ctmsTc1002,
      position: 1,
      action: 'Open site record and complete activation checklist',
      expectedResult: 'All mandatory checklist items show as complete',
    },
    {
      id: ids.steps.ctmsTc1002S2,
      testCaseId: ids.cases.ctmsTc1002,
      position: 2,
      action: 'Attempt to mark site active with incomplete checklist',
      expectedResult: 'Validation error lists incomplete checklist items',
    },
    {
      id: ids.steps.ctmsTc1003S1,
      testCaseId: ids.cases.ctmsTc1003,
      position: 1,
      action: 'Select subject and create Screening visit for next week',
      expectedResult: 'Visit appears on subject timeline as scheduled',
    },
    {
      id: ids.steps.ctmsTc1004S1,
      testCaseId: ids.cases.ctmsTc1004,
      position: 1,
      action: 'Complete visit as PI and apply electronic sign-off',
      expectedResult: 'Visit status changes to locked; fields become read-only',
    },
    {
      id: ids.steps.etmfTc1001S1,
      testCaseId: ids.cases.etmfTc1001,
      position: 1,
      action: 'Upload PDF with document type and version',
      expectedResult: 'Document appears in TMF inbox with correct metadata',
    },
    {
      id: ids.steps.etmfTc1002S1,
      testCaseId: ids.cases.etmfTc1002,
      position: 1,
      action: 'QC reviewer rejects document missing signature page',
      expectedResult: 'Status is Rejected with reason captured in audit trail',
    },
    {
      id: ids.steps.viewerTc1001S1,
      testCaseId: ids.cases.viewerTc1001,
      position: 1,
      action: 'Open 200-page study binder from study landing page',
      expectedResult: 'First page renders within performance threshold',
    },
    {
      id: ids.steps.ssoTc1001S1,
      testCaseId: ids.cases.ssoTc1001,
      position: 1,
      action: 'Initiate login via corporate SSO button',
      expectedResult: 'User is redirected to IdP and returned authenticated',
    },
    {
      id: ids.steps.ssoTc1002S1,
      testCaseId: ids.cases.ssoTc1002,
      position: 1,
      action: 'Assign IdP group to Contributor application role',
      expectedResult: 'Mapped users receive Contributor permissions on next login',
    },
    {
      id: ids.steps.reportingTc1001S1,
      testCaseId: ids.cases.reportingTc1001,
      position: 1,
      action: 'Apply date filter and export dashboard as CSV',
      expectedResult: 'Downloaded CSV rows match filtered dashboard totals',
    },
    {
      id: ids.steps.apiTc1001S1,
      testCaseId: ids.cases.apiTc1001,
      position: 1,
      action: 'Send GET /ctms/studies with X-Trace-Id header',
      expectedResult: 'Gateway forwards to CTMS upstream; trace ID echoed in response',
    },
  ])

  await db.insert(testPlans).values([
    {
      id: ids.plans.ctmsRegression,
      planRef: 'PLAN-001',
      projectId: ids.projects.ctms,
      title: 'CTMS Sprint 44 — Regression',
      description: 'End-to-end regression for study setup and visit workflows',
      status: 'active',
      environment: 'UAT',
      ownerId: ids.users.shaun,
      createdBy: ids.users.shaun,
      assigneeIds: [ids.users.shaun, ids.users.priya],
    },
    {
      id: ids.plans.etmfSmoke,
      planRef: 'PLAN-001',
      projectId: ids.projects.etmf,
      title: 'eTMF Upload & QC Smoke',
      status: 'draft',
      environment: 'QA',
      ownerId: ids.users.james,
      createdBy: ids.users.shaun,
      assigneeIds: [ids.users.james],
    },
  ])

  await db.insert(testPlanCases).values([
    {
      id: ids.planCases.ctmsPc1,
      testPlanId: ids.plans.ctmsRegression,
      testCaseId: ids.cases.ctmsTc1001,
      position: 0,
      addedBy: ids.users.shaun,
    },
    {
      id: ids.planCases.ctmsPc2,
      testPlanId: ids.plans.ctmsRegression,
      testCaseId: ids.cases.ctmsTc1002,
      position: 1,
      addedBy: ids.users.shaun,
    },
    {
      id: ids.planCases.ctmsPc3,
      testPlanId: ids.plans.ctmsRegression,
      testCaseId: ids.cases.ctmsTc1003,
      position: 2,
      addedBy: ids.users.shaun,
    },
    {
      id: ids.planCases.ctmsPc4,
      testPlanId: ids.plans.ctmsRegression,
      testCaseId: ids.cases.ctmsTc1004,
      position: 3,
      addedBy: ids.users.shaun,
    },
    {
      id: ids.planCases.etmfPc1,
      testPlanId: ids.plans.etmfSmoke,
      testCaseId: ids.cases.etmfTc1001,
      position: 0,
      addedBy: ids.users.james,
    },
    {
      id: ids.planCases.etmfPc2,
      testPlanId: ids.plans.etmfSmoke,
      testCaseId: ids.cases.etmfTc1002,
      position: 1,
      addedBy: ids.users.james,
    },
  ])

  await ensureRefCountersTable(db)
  await seedRefCounters(db)
}

async function ensureRefCountersTable(
  db: MySql2Database<typeof schema>,
): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ref_counters (
      project_id VARCHAR(26) NOT NULL,
      entity_type ENUM('case', 'run', 'plan') NOT NULL,
      next_value INT UNSIGNED NOT NULL DEFAULT 1,
      PRIMARY KEY (project_id, entity_type)
    )
  `)
}

async function seedRefCounters(db: MySql2Database<typeof schema>): Promise<void> {
  const rows: Array<{
    projectId: string
    entityType: 'case' | 'run' | 'plan'
    nextValue: number
  }> = [
    { projectId: ids.projects.ctms, entityType: 'case', nextValue: 1005 },
    { projectId: ids.projects.ctms, entityType: 'run', nextValue: 1 },
    { projectId: ids.projects.ctms, entityType: 'plan', nextValue: 2 },
    { projectId: ids.projects.etmf, entityType: 'case', nextValue: 1003 },
    { projectId: ids.projects.etmf, entityType: 'run', nextValue: 1 },
    { projectId: ids.projects.etmf, entityType: 'plan', nextValue: 2 },
    { projectId: ids.projects.viewer, entityType: 'case', nextValue: 1002 },
    { projectId: ids.projects.viewer, entityType: 'run', nextValue: 1 },
    { projectId: ids.projects.viewer, entityType: 'plan', nextValue: 1 },
    { projectId: ids.projects.ssoIam, entityType: 'case', nextValue: 1003 },
    { projectId: ids.projects.ssoIam, entityType: 'run', nextValue: 1 },
    { projectId: ids.projects.ssoIam, entityType: 'plan', nextValue: 1 },
    { projectId: ids.projects.reporting, entityType: 'case', nextValue: 1002 },
    { projectId: ids.projects.reporting, entityType: 'run', nextValue: 1 },
    { projectId: ids.projects.reporting, entityType: 'plan', nextValue: 1 },
    { projectId: ids.projects.apiGateway, entityType: 'case', nextValue: 1002 },
    { projectId: ids.projects.apiGateway, entityType: 'run', nextValue: 1 },
    { projectId: ids.projects.apiGateway, entityType: 'plan', nextValue: 1 },
  ]

  for (const row of rows) {
    await db.execute(sql`
      INSERT INTO ref_counters (project_id, entity_type, next_value)
      VALUES (${row.projectId}, ${row.entityType}, ${row.nextValue})
      ON DUPLICATE KEY UPDATE next_value = ${row.nextValue}
    `)
  }
}
