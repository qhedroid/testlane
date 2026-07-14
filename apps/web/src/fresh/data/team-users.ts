/** Canonical demo team — single source of truth for assignee / person names in the UI. */
export const TEAM_USERS = [
  'Noel Quadri',
  'Shaun Sevume',
  'Devon Reyes',
  'Elena Voss',
  'Marcus Webb',
  'Sam Okafor',
  'Priya Malhotra',
  'Tom Bright',
] as const

export type TeamUser = (typeof TEAM_USERS)[number]

const TEAM_USER_SET = new Set<string>(TEAM_USERS)

/** Maps legacy placeholder names (full or abbreviated) to a team user. */
const LEGACY_ASSIGNEE_MAP: Record<string, TeamUser> = {
  You: 'Shaun Sevume',
  'Noel Q.': 'Noel Quadri',
  'Noel Quinn': 'Noel Quadri',
  'Aisha Rahman': 'Priya Malhotra',
  'Aisha R.': 'Priya Malhotra',
  // Former placeholder that previously mapped to today's Devon Reyes persona.
  // Not keyed as "Marcus Webb" — that name is now a canonical TEAM_USERS entry.
  // Old abbreviated key kept for localStorage.
  'Marcus W.': 'Devon Reyes',
  'Priya Nair': 'Elena Voss',
  'Priya N.': 'Elena Voss',
  "James O'Sullivan": 'Marcus Webb',
  'James O.': 'Marcus Webb',
  'Fatima Al-Amin': 'Tom Bright',
  'Fatima A.': 'Tom Bright',
  'Alex Viewer': 'Sam Okafor',
  // Prior abbreviated forms (kept so old localStorage assignee strings still normalize)
  'Nadim S.': 'Priya Malhotra',
  'Nasir D.': 'Devon Reyes',
  'Monica D.': 'Elena Voss',
  'Jamil K.': 'Marcus Webb',
  'Syed A.': 'Tom Bright',
  'Arvindh C.': 'Sam Okafor',
  'Shaun S.': 'Shaun Sevume',
  // Current abbreviated forms
  'Devon R.': 'Devon Reyes',
  'Elena V.': 'Elena Voss',
  'Marcus K.': 'Marcus Webb',
  'Sam O.': 'Sam Okafor',
  'Priya M.': 'Priya Malhotra',
  'Tom B.': 'Tom Bright',
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
