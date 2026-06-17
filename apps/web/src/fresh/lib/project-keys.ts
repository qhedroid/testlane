/** Project key validation — uppercase URL-safe identifiers */

export const PROJECT_KEY_PATTERN = /^[A-Z0-9_-]+$/

export function normalizeProjectKeyInput(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9_-]/g, '')
}

export function validateProjectKey(key: string): string | null {
  const trimmed = key.trim()
  if (!trimmed) return 'Key is required'
  if (!PROJECT_KEY_PATTERN.test(trimmed)) {
    return 'Use only letters, numbers, hyphens, and underscores'
  }
  return null
}

export function keyFromName(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24)
  return base || 'PROJECT'
}
