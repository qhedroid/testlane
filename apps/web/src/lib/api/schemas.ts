import { z } from 'zod'

const ulid = z.string().length(26, 'Expected a 26-character ULID')

export const createRunBodySchema = z.object({
  projectId: ulid,
  // Optional since the ad-hoc-runs change — without it, caseIds is required
  // (enforced by the service with a 400 PLAN_EMPTY).
  testPlanId: ulid.optional(),
  name: z.string().trim().min(1).max(500).optional(),
  description: z.string().max(65535).nullable().optional(),
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

// Per-step result (new-tables candidate, Phase A). Same status enum as the
// case-level result body (including the 'skipped' alias). stepSnapshotId comes
// from the route segment, not the body.
export const stepResultBodySchema = z.object({
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

export type StepResultBody = z.infer<typeof stepResultBodySchema>

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

// PATCH /api/runs/[runId] — Phase 4 (mvp-backend). projectId in the body per
// the /api/runs/* family's flat convention (not a nested route segment).
// 'stalled' is deliberately not settable from the UI.
export const updateRunBodySchema = z.object({
  projectId: ulid,
  status: z.enum(['active', 'sealed', 'archived']).optional(),
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().max(65535).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
})

export type UpdateRunBody = z.infer<typeof updateRunBodySchema>

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

// Case comments (new-tables candidate, Phase C). stepId null/omitted => a
// general/case-level comment; a step id => a step comment. The author is the
// session actor, resolved server-side — never sent by the client.
export const createCaseCommentBodySchema = z.object({
  stepId: ulid.nullable().optional(),
  body: z.string().trim().min(1).max(65535),
})

export type CreateCaseCommentBody = z.infer<typeof createCaseCommentBodySchema>

// Requirements (new-tables candidate, Phase D). projectId comes from the route
// segment. Status is the DB's lowercase enum — requirement-client.ts maps it
// to/from the Capitalized frontend RequirementStatus.
const requirementStatus = z.enum(['draft', 'approved', 'implemented', 'obsolete'])

export const createRequirementBodySchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(65535).nullable().optional(),
  status: requirementStatus.optional(),
})

export type CreateRequirementBody = z.infer<typeof createRequirementBodySchema>

export const linkRequirementBodySchema = z.object({
  requirementId: ulid,
})

export type LinkRequirementBody = z.infer<typeof linkRequirementBodySchema>

const planStatus = z.enum(['draft', 'active', 'archived'])

// GAP-01 (Option a): the authored TestQuery[] definition, persisted verbatim on
// test_plans.query_definition. Faithful to demo-model.ts's TestQuery — the enum
// fields are validated, but the id/value/id-list fields stay permissive
// (z.string()) on purpose: folderIds may include the '__unfiled__' sentinel and
// caseIds are internal Case ids (not always ULIDs), so we round-trip them
// exactly rather than reject them. The server never interprets these.
const queryConditionSchema = z.object({
  field: z.enum(['title', 'priority', 'type', 'assignee', 'tags', 'caseKey']),
  operator: z.enum(['contains', 'not_contains', 'equals', 'not_equals']),
  value: z.string().max(2000),
})

export const testQueryDefinitionSchema = z.object({
  id: z.string().min(1).max(200),
  title: z.string().max(500),
  type: z.enum(['condition', 'folder', 'static']),
  conditions: z.array(queryConditionSchema).optional(),
  folderIds: z.array(z.string().max(200)).optional(),
  caseIds: z.array(z.string().max(200)).optional(),
})

export const createPlanBodySchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(65535).optional(),
  environment: z.string().trim().min(1).max(100).optional(),
  ownerId: ulid.optional(),
  assigneeIds: z.array(ulid).optional(),
  caseIds: z.array(ulid).optional(),
  queryDefinition: z.array(testQueryDefinitionSchema).nullable().optional(),
})

export type CreatePlanBody = z.infer<typeof createPlanBodySchema>

export const updatePlanBodySchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().max(65535).nullable().optional(),
  status: planStatus.optional(),
  environment: z.string().trim().min(1).max(100).nullable().optional(),
  ownerId: ulid.nullable().optional(),
  assigneeIds: z.array(ulid).optional(),
  queryDefinition: z.array(testQueryDefinitionSchema).nullable().optional(),
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
  // Internal defect FK (new-tables candidate, Phase E). Additive/optional — when
  // present the link points at a real `defects` row and defectRef is its DEF-<n>
  // key; when absent, defectRef is a free-text external ref (unchanged path).
  defectId: ulid.optional(),
})

export type LinkDefectBody = z.infer<typeof linkDefectBodySchema>

// Defect entities (new-tables candidate, Phase E) use the nested
// /api/projects/[projectId]/defects convention (project-level entity, like
// requirements). Status enum is lowercase; defect-client.ts maps it to/from the
// Capitalized frontend DefectStatus. No severity field — deliberately.
const defectStatus = z.enum(['open', 'in_progress', 'resolved', 'closed'])

export const createDefectBodySchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(65535).nullable().optional(),
  status: defectStatus.optional(),
})

export type CreateDefectBody = z.infer<typeof createDefectBodySchema>

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

// Project cloning ("Create Demo Project") — projectId (clone source) comes
// from the route segment, not the body.

export const cloneProjectBodySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens')
    .optional(),
  name: z.string().trim().min(1).max(255).optional(),
})

export type CloneProjectBody = z.infer<typeof cloneProjectBodySchema>

export const listAuditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  before: z.coerce.date().optional(),
})

export type ListAuditLogQuery = z.infer<typeof listAuditLogQuerySchema>

// Admin settings — role definitions + API keys (Phase G). Global/org-scoped
// (the Admin panel is not project-scoped); the actor's org is derived server-
// side, so no orgId in the body. `permissions` is a permissive boolean map so
// the frontend RolePermissions shape (16 keys, rbac.ts) round-trips faithfully.

const rolePermissions = z.record(z.boolean())

export const createRoleDefinitionBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(65535).nullable().optional(),
  isProjectLevel: z.boolean(),
  permissions: rolePermissions,
})

export type CreateRoleDefinitionBody = z.infer<typeof createRoleDefinitionBodySchema>

export const updateRoleDefinitionBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    description: z.string().trim().max(65535).nullable(),
    isProjectLevel: z.boolean(),
    permissions: rolePermissions,
  })
  .partial()

export type UpdateRoleDefinitionBody = z.infer<typeof updateRoleDefinitionBodySchema>

export const createApiKeyBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  // Already-masked display value (not a real secret — see AdminSettingsService).
  keyMasked: z.string().trim().min(1).max(255),
  project: z.string().trim().min(1).max(255),
  permissions: z.string().trim().min(1).max(255),
  expiration: z.string().trim().min(1).max(100),
  createdBy: ulid.nullable().optional(),
})

export type CreateApiKeyBody = z.infer<typeof createApiKeyBodySchema>
