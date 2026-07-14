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
import { demoProjectRefCounterRows, insertDemoProjectSeed } from './demo-project-seed'
import { insertAdminSeed } from './admin-seed'

/** Shared local-dev password for all seed users. Documented in README.md. */
export const SEED_DEV_PASSWORD = 'testlane-demo-2026'

export async function insertSeedData(
  db: MySql2Database<typeof schema>,
): Promise<void> {
  await db.insert(organisations).values({
    id: ids.org,
    slug: 'relay-dev',
    name: 'Testlane Development Organisation',
    isActive: true,
  })

  const devPasswordHash = bcryptjs.hashSync(SEED_DEV_PASSWORD, 12)

  await db.insert(users).values([
    {
      id: ids.users.noel,
      orgId: ids.org,
      email: 'nquadri@ti.com',
      name: 'Noel Quadri',
      globalRole: 'super_admin',
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.shaun,
      orgId: ids.org,
      email: 'ssevume@ti.com',
      name: 'Shaun Sevume',
      globalRole: 'admin',
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.elena,
      orgId: ids.org,
      email: 'elena.voss@testlane.dev',
      name: 'Elena Voss',
      globalRole: 'contributor',
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.devon,
      orgId: ids.org,
      email: 'devon.reyes@testlane.dev',
      name: 'Devon Reyes',
      // Run Executor (frontend admin role) -> contributor. Was 'admin'; downgraded
      // to match the "Run Executor" designation from Shaun's 2026-07-09 role pass.
      globalRole: 'contributor',
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.marcus,
      orgId: ids.org,
      email: 'marcus.webb@testlane.dev',
      name: 'Marcus Webb',
      globalRole: 'contributor', // Run Executor
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.sam,
      orgId: ids.org,
      email: 'sam.okafor@testlane.dev',
      name: 'Sam Okafor',
      // Editor (frontend admin role) -> contributor. Was 'viewer'; upgraded to
      // match the "Editor" designation from Shaun's 2026-07-09 role pass.
      globalRole: 'contributor',
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.priya,
      orgId: ids.org,
      email: 'priya.malhotra@testlane.dev',
      name: 'Priya Malhotra',
      globalRole: 'viewer', // Viewer
      isActive: true,
      passwordHash: devPasswordHash,
    },
    {
      id: ids.users.tom,
      orgId: ids.org,
      email: 'tom.bright@testlane.dev',
      name: 'Tom Bright',
      globalRole: 'contributor', // Run Manager -> contributor (DB has no distinct Run Manager role)
      isActive: true,
      passwordHash: devPasswordHash,
    },
  ])

  // Default workspace roster (reset baseline): Demo Project (richly seeded,
  // via insertDemoProjectSeed below) plus five EMPTY projects — no cases,
  // plans, or runs. Shaun's 2026-07-10 spec: DP, CTMS, eTMF, IAM,
  // eFeasibility, GL.
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
      id: ids.projects.ssoIam,
      orgId: ids.org,
      slug: 'iam',
      name: 'IAM',
      description: 'Identity and access management',
      status: 'active',
      createdBy: ids.users.noel,
    },
    {
      id: ids.projects.efeasibility,
      orgId: ids.org,
      slug: 'efeasibility',
      name: 'eFeasibility',
      description: 'Feasibility assessment module',
      status: 'active',
      createdBy: ids.users.noel,
    },
    {
      id: ids.projects.gl,
      orgId: ids.org,
      slug: 'gl',
      name: 'GL',
      description: 'GlobalLink module',
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
      id: ids.projectRoles.elenaCtms,
      projectId: ids.projects.ctms,
      userId: ids.users.elena,
      role: 'contributor',
      grantedBy: ids.users.noel,
    },
    {
      id: ids.projectRoles.marcusEtmf,
      projectId: ids.projects.etmf,
      userId: ids.users.marcus,
      role: 'contributor',
      grantedBy: ids.users.noel,
    },
  ])

  await insertDemoProjectSeed(db)

  // Admin panel: built-in role definitions + demo API keys (Phase G).
  await insertAdminSeed(db)

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
    ...demoProjectRefCounterRows(),
  ]

  for (const row of rows) {
    await db.execute(sql`
      INSERT INTO ref_counters (project_id, entity_type, next_value)
      VALUES (${row.projectId}, ${row.entityType}, ${row.nextValue})
      ON DUPLICATE KEY UPDATE next_value = ${row.nextValue}
    `)
  }
}
