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
