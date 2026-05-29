# GitHub setup (manual)

What to configure in GitHub for Relay collaboration. These steps are done in the GitHub UI, not in the repo.

**Repository:** https://github.com/qhedroid/Relay.git

---

## Repository access

- Keep the repository **private**.
- Add collaborators with **Write** access, not Admin, unless they need repo settings.
- Do not share `.env` or database credentials in issues or PRs.

---

## GitHub Project

Create a project board:

**Name:** Relay v0.1 Execution Readiness

**Recommended statuses:**

| Status | Use for |
|--------|---------|
| Backlog | Not started, prioritised later |
| Ready | Clear scope, can be picked up |
| In Progress | Someone is actively working on it |
| Review | PR open or awaiting review |
| Done | Merged and verified |
| Blocked | Waiting on decision, access, or dependency |

Link issues to the project when created.

---

## Recommended labels

| Label | Purpose |
|-------|---------|
| `p0` | Must have for v0.1 |
| `p1` | Should have |
| `p2` | Nice to have |
| `bug` | Something broken |
| `feature` | New behaviour |
| `ux` | UI/UX improvement |
| `docs` | Documentation only |
| `chore` | Tooling, deps, housekeeping |
| `v0.1` | In scope for first collaboration milestone |

---

## Recommended first issues

Create these as GitHub issues (titles can match; bodies should add acceptance criteria):

| ID | Title |
|----|-------|
| REL-001 | Manual UX audit of `/runs` |
| REL-002 | Resolve duplicate result controls |
| REL-003 | Improve loading, empty, and error states |
| REL-004 | Confirm RBAC/viewer mode UX |
| REL-005 | Add README and collaborator setup guide |
| REL-006 | Add v0.1 readiness checklist |
| REL-007 | Tag execution checkpoint |

**REL-005** may already be satisfied by the collaboration docs in this folder—close or repurpose after review.

Assign priorities with `p0`–`p2` labels. Track execution-readiness work under `v0.1`.

---

## Branch protection (optional but sensible)

On `main`:

- Require a pull request before merging.
- Require `pnpm build` / CI when CI exists (not yet mandatory in repo—run locally until then).
- Do not allow force-push to `main`.

---

## Releases and tags

For milestones, use lightweight tags, e.g.:

- `v0.1-execution-checkpoint` — after REL-007

Tag from a known-good commit on `main` with a short release note listing what `/runs` supports.

---

## Secrets and environments

No GitHub Actions secrets are required for local-only development today. When CI is added later, store `DATABASE_URL` and similar only in GitHub Secrets, never in the repo.
