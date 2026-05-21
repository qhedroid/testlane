import { ulid } from 'ulid'

/** Generate a new ULID primary key (26-char, time-ordered). */
export function createId(): string {
  return ulid()
}
