/** Canonical demo team — single source of truth for assignee / person names in the UI. */
export const TEAM_USERS = [
  'Noel Quadri',
  'Shaun Sevume',
  'Nasir Dipto',
  'Monica Dayalani',
  'Jamil Khan',
  'Arvindh Chandran',
  'Nadim Sharif',
  'Syed Ahmed',
] as const

export type TeamUser = (typeof TEAM_USERS)[number]

const TEAM_USER_SET = new Set<string>(TEAM_USERS)

/** Maps legacy placeholder names (full or abbreviated) to a team user. */
const LEGACY_ASSIGNEE_MAP: Record<string, TeamUser> = {
  You: 'Shaun Sevume',
  'Noel Q.': 'Noel Quadri',
  'Noel Quinn': 'Noel Quadri',
  'Aisha Rahman': 'Nadim Sharif',
  'Aisha R.': 'Nadim Sharif',
  'Marcus Webb': 'Nasir Dipto',
  'Marcus W.': 'Nasir Dipto',
  'Priya Nair': 'Monica Dayalani',
  'Priya N.': 'Monica Dayalani',
  "James O'Sullivan": 'Jamil Khan',
  'James O.': 'Jamil Khan',
  'Fatima Al-Amin': 'Syed Ahmed',
  'Fatima A.': 'Syed Ahmed',
  'Alex Viewer': 'Arvindh Chandran',
  'Nadim S.': 'Nadim Sharif',
  'Nasir D.': 'Nasir Dipto',
  'Monica D.': 'Monica Dayalani',
  'Jamil K.': 'Jamil Khan',
  'Syed A.': 'Syed Ahmed',
  'Shaun S.': 'Shaun Sevume',
  'Arvindh C.': 'Arvindh Chandran',
}

export function isTeamUserName(name: string): boolean {
  return TEAM_USER_SET.has(name)
}

/** Normalize a stored/display assignee string to one of the 8 team names. */
export function normalizeAssigneeName(name: string | undefined | null): TeamUser | undefined {
  if (!name || name === '—' || name === 'Unassigned') return undefined
  const trimmed = name.trim()
  if (isTeamUserName(trimmed)) return trimmed as TeamUser
  return LEGACY_ASSIGNEE_MAP[trimmed]
}

export function displayAssigneeName(name: string | undefined | null): string {
  return normalizeAssigneeName(name) ?? '—'
}
