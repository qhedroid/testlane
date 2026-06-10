/** Seeded CTMS project — local dev default. */
export const RELAY_PROJECT_ID = '01SEED00000000000000000010'

/** PLAN-001 on CTMS — default plan for create run. */
export const RELAY_TEST_PLAN_ID = '01SEED00000000000000000400'

/** Arvindh Chandran (viewer) — read-only; mutations return 403 from API. */
export const RELAY_VIEWER_ACTOR_ID = '01SEED00000000000000000007'

/** Monica Dayalani (contributor) — read runs and update results. Override via NEXT_PUBLIC_RELAY_USER_ID. */
export const RELAY_DEV_ACTOR_ID =
  process.env.NEXT_PUBLIC_RELAY_USER_ID ?? '01SEED00000000000000000004'

/** Shaun Sevume (admin) — spawn runs (POST /api/runs requires admin+). */
export const RELAY_CREATE_ACTOR_ID = '01SEED00000000000000000003'

export const RELAY_USER_HEADER = 'x-relay-user-id'

/** Local dev: contributor/admin can mutate; viewer cannot. */
export function relayCanMutate(actorId: string): boolean {
  return actorId !== RELAY_VIEWER_ACTOR_ID
}
