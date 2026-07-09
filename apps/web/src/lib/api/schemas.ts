import { z } from 'zod'

const ulid = z.string().length(26, 'Expected a 26-character ULID')

export const createRunBodySchema = z.object({
  projectId: ulid,
  testPlanId: ulid,
  name: z.string().trim().min(1).max(500).optional(),
  environment: z.string().trim().min(1).max(100).optional(),
  assigneeIds: z.array(ulid).optional(),
  caseIds: z.array(ulid).optional(),
})

export type CreateRunBody = z.infer<typeof createRunBodySchema>

export const updateCaseResultBodySchema = z.object({
  status: z.enum([
    'not_run',
    'pass',
    'fail',
    'blocked',
    'skip',
    'skipped',
  ]),
  comment: z.string().max(65535).nullable().optional(),
})

export type UpdateCaseResultBody = z.infer<typeof updateCaseResultBodySchema>

const runStatus = z.enum(['active', 'stalled', 'sealed', 'archived'])

export const listRunsQuerySchema = z.object({
  projectId: ulid,
  status: runStatus.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export type ListRunsQuery = z.infer<typeof listRunsQuerySchema>

export const getRunDetailQuerySchema = z.object({
  projectId: ulid,
})

export type GetRunDetailQuery = z.infer<typeof getRunDetailQuerySchema>

const globalRole = z.enum(['super_admin', 'admin', 'contributor', 'viewer'])
const projectRoleValue = z.enum(['admin', 'contributor', 'viewer'])

export const createUserBodySchema = z.object({
  orgId: ulid,
  email: z.string().trim().email().max(255),
  name: z.string().trim().min(1).max(255),
  globalRole,
  password: z.string().min(8).max(255),
})

export type CreateUserBody = z.infer<typeof createUserBodySchema>

export const updateUserBodySchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  globalRole: globalRole.optional(),
  isActive: z.boolean().optional(),
})

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>

export const createProjectBodySchema = z.object({
  orgId: ulid,
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(65535).optional(),
})

export type CreateProjectBody = z.infer<typeof createProjectBodySchema>

export const assignProjectRoleBodySchema = z.object({
  userId: ulid,
  role: projectRoleValue,
})

export type AssignProjectRoleBody = z.infer<typeof assignProjectRoleBodySchema>

const casePriority = z.enum(['critical', 'high', 'medium', 'low'])
const caseType = z.enum(['functional', 'smoke', 'regression', 'integration', 'security'])

const caseStepSchema = z.object({
  id: ulid.optional(),
  action: z.string().trim().min(1).max(65535),
  expectedResult: z.string().trim().max(65535).nullable().optional(),
})

// projectId for all of the below comes from the route segment
// (/api/projects/[projectId]/...), not the query/body — these schemas only
// cover the remaining fields.

export const listCasesQuerySchema = z.object({
  folderId: z.union([ulid, z.literal('__unfiled__')]).optional(),
  includeArchived: z.coerce.boolean().optional(),
})

export type ListCasesQuery = z.infer<typeof listCasesQuerySchema>

export const createCaseBodySchema = z.object({
  folderId: ulid.nullable().optional(),
  title: z.string().trim().min(1).max(500),
  priority: casePriority.optional(),
  type: caseType.optional(),
  preconditions: z.string().trim().max(65535).optional(),
  description: z.string().trim().max(65535).optional(),
  tags: z.array(z.string().trim().min(1).max(100)).optional(),
  assignedTo: ulid.nullable().optional(),
  steps: z.array(caseStepSchema).optional(),
})

export type CreateCaseBody = z.infer<typeof createCaseBodySchema>

export const updateCaseBodySchema = z.object({
  folderId: ulid.nullable().optional(),
  title: z.string().trim().min(1).max(500).optional(),
  priority: casePriority.optional(),
  type: caseType.optional(),
  preconditions: z.string().trim().max(65535).nullable().optional(),
  description: z.string().trim().max(65535).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(100)).optional(),
  assignedTo: ulid.nullable().optional(),
  isArchived: z.boolean().optional(),
  steps: z.array(caseStepSchema).optional(),
})

export type UpdateCaseBody = z.infer<typeof updateCaseBodySchema>

export const createFolderBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  parentId: ulid.nullable().optional(),
  description: z.string().trim().max(65535).optional(),
})

export type CreateFolderBody = z.infer<typeof createFolderBodySchema>

const planStatus = z.enum(['draft', 'active', 'archived'])

export const createPlanBodySchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(65535).optional(),
  environment: z.string().trim().min(1).max(100).optional(),
  ownerId: ulid.optional(),
  assigneeIds: z.array(ulid).optional(),
  caseIds: z.array(ulid).optional(),
})

export type CreatePlanBody = z.infer<typeof createPlanBodySchema>

export const updatePlanBodySchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().max(65535).nullable().optional(),
  status: planStatus.optional(),
  environment: z.string().trim().min(1).max(100).nullable().optional(),
  ownerId: ulid.nullable().optional(),
  assigneeIds: z.array(ulid).optional(),
})

export type UpdatePlanBody = z.infer<typeof updatePlanBodySchema>

export const setPlanCasesBodySchema = z.object({
  caseIds: z.array(ulid),
})

export type SetPlanCasesBody = z.infer<typeof setPlanCasesBodySchema>

// Defect links (Phase 6) hang off /api/runs/* (projectId comes from the body,
// matching that route family's existing flat convention — see
// updateCaseResultBodySchema above — not the nested /api/projects/[projectId]/...
// convention used by cases/plans/dashboard).

export const linkDefectBodySchema = z.object({
  projectId: ulid,
  defectRef: z.string().trim().min(1).max(100),
  defectUrl: z.string().trim().url().max(500).optional(),
})

export type LinkDefectBody = z.infer<typeof linkDefectBodySchema>

export const unlinkDefectBodySchema = z.object({
  projectId: ulid,
})

export type UnlinkDefectBody = z.infer<typeof unlinkDefectBodySchema>

export const listDefectLinksQuerySchema = z.object({
  projectId: ulid,
  includeUnlinked: z.coerce.boolean().optional(),
})

export type ListDefectLinksQuery = z.infer<typeof listDefectLinksQuerySchema>

// Audit log reads (Phase 6) use the nested /api/projects/[projectId]/...
// convention, matching cases/plans/dashboard.

export const listAuditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  before: z.coerce.date().optional(),
})

export type ListAuditLogQuery = z.infer<typeof listAuditLogQuerySchema>
