# Working agreement

How two people (or more) work on Relay without stepping on each other or breaking `main`.

---

## `main` branch rule

**`main` should stay stable.**

It should always build and pass `pnpm api:validate` when Docker and the dev server are used as documented. Do not land half-finished feature work directly on `main`.

---

## Branch naming

Use short, ticket-prefixed branches:

```
rel-001-short-description
rel-002-short-description
```

Examples:

- `rel-001-runs-ux-audit`
- `rel-004-viewer-readonly-banner`

One logical change per branch where possible.

---

## Commit messages

Keep them short, clear, and practical. State what changed and why it matters.

Good:

- `Add compact count cards to execution case pane`
- `Fix api:validate comment persistence check`

Avoid:

- `WIP`
- `fixes`
- `update stuff`

---

## Before opening a pull request

Run locally:

```bash
pnpm build
pnpm api:validate   # with pnpm dev running
```

If you touched services or schema:

```bash
pnpm db:validate-create-run
pnpm db:validate-update-case-result
```

Fix failures before requesting review.

---

## Pull request expectations

Each PR should explain:

1. **What changed** — scope and files touched.
2. **How it was tested** — commands run, manual steps on `/runs` if relevant.
3. **Related ticket** — link or ID (e.g. REL-003).
4. **Known limitations** — anything deliberately left out.

Do **not** commit secrets (`.env`, credentials).

Do **not** commit directly to `main` for feature work. Use a branch and PR.

---

## What not to do without discussion

- Force-push `main`
- Large unrelated refactors mixed with a small fix
- Schema or migration changes without a note in the PR and an update to `current-state.md` if behaviour changes
- Changing seed IDs that `api:validate` or docs depend on without updating validation and contracts

---

## Docs-only changes

Documentation and collaboration guides can go through the same branch/PR flow. They still need a clear description; they do not need `api:validate` unless you also changed code.

---

## UK English

Use UK spelling in docs and PR descriptions (organisation, behaviour, colour) unless quoting code or API enums.
