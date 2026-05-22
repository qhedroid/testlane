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
