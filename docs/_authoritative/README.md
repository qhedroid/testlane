# Authoritative documentation

Future Relay development — human or agent — should **start here**, not by scanning all of `docs/`.

Everything outside this folder is supplementary: onboarding notes, process guides, historical handovers, long-form design references, or one-off prompts. Those files may be useful, stale, or duplicated. **When they conflict with `_authoritative` or the repo, the repo wins** — then update the authoritative doc.

---

## Current phase: frontend-only

We are in a **frontend-only prototype phase**. The maintained docs below describe demo UI, contracts, and as-built behaviour. **Do not treat mock screens or placeholder routes as shipped product features.**

**Backend-phase reference only (not maintained for day-to-day frontend work):**

| Doc | Location | Use when |
|-----|----------|----------|
| HTTP API contracts | [`docs/implementation/api-contracts.md`](../implementation/api-contracts.md) | Wiring `/runs/api` or extending run APIs |
| DB schema rationale | [`docs/database/schema-rationale.md`](../database/schema-rationale.md) | Schema/migration work |
| Service deep-dives | [`docs/architecture/TestRunService-design.md`](../architecture/TestRunService-design.md) | Spawn/execution service internals |

The full-stack **target** is [`ARCHITECTURE_BASELINE.md`](ARCHITECTURE_BASELINE.md) — future backend phase, not current UI scope.

---

## How to use this folder

1. **Before planning or coding**, read the docs below in order.
2. **Verify against the repo** — routes, APIs, and services change faster than prose.
3. **Update authoritative docs in the same PR** when you change contracts, routes, or shipped behaviour.
4. **Do not treat** [`ARCHITECTURE_BASELINE.md`](ARCHITECTURE_BASELINE.md) future scope as implemented.

### Recommended reading order

1. [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) — entry point, rules, route map
2. [`MVP_FRONTEND_ONLY_SCOPE.md`](MVP_FRONTEND_ONLY_SCOPE.md) — phase boundaries
3. [`AS_BUILT_SNAPSHOT.md`](AS_BUILT_SNAPSHOT.md) — what exists today
4. [`FRONTEND_CONTRACTS.md`](FRONTEND_CONTRACTS.md) — per-screen contracts
5. [`DOMAIN_MODEL.md`](DOMAIN_MODEL.md) — entities, IDs, invariants

---

## Maintained authoritative set

| File | Role |
|------|------|
| [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) | **Entry point** — product identity, branch, route map, agent rules |
| [`MVP_FRONTEND_ONLY_SCOPE.md`](MVP_FRONTEND_ONLY_SCOPE.md) | **Phase scope** — in/out of scope for frontend-only work |
| [`AS_BUILT_SNAPSHOT.md`](AS_BUILT_SNAPSHOT.md) | **As-built** — stack, routes, what works, commands |
| [`FRONTEND_CONTRACTS.md`](FRONTEND_CONTRACTS.md) | **UI contracts** — per-route data, actions, future APIs |
| [`DOMAIN_MODEL.md`](DOMAIN_MODEL.md) | **Domain model** — multi-project scoping, IDs, invariants |
| [`AI_HANDOFF.md`](AI_HANDOFF.md) | **Portable bootstrap** — paste into new AI chats for context |
| [`ARCHITECTURE_BASELINE.md`](ARCHITECTURE_BASELINE.md) | **Target architecture** (backend phase) — full MVP intent |

Originals preserved at their source paths; `_authoritative/` copies are the maintained versions for frontend phase work.

| Authoritative copy | Original (preserved) |
|--------------------|----------------------|
| `PROJECT_CONTEXT.md` | [`docs/collaboration/relay-agent-context.md`](../collaboration/relay-agent-context.md) |
| `FRONTEND_CONTRACTS.md` | [`docs/implementation/frontend-contracts.md`](../implementation/frontend-contracts.md) |
| `ARCHITECTURE_BASELINE.md` | [`docs/architecture/relay-architecture-baseline.md`](../architecture/relay-architecture-baseline.md) |

---

## Superseded docs (stale banners added)

| Stale file | Superseded by |
|------------|---------------|
| [`docs/collaboration/relay-build-context.md`](../collaboration/relay-build-context.md) | `AS_BUILT_SNAPSHOT.md`, `PROJECT_CONTEXT.md` |
| [`docs/collaboration/friend-handover.md`](../collaboration/friend-handover.md) | `AS_BUILT_SNAPSHOT.md`, `PROJECT_CONTEXT.md` |
| [`docs/collaboration/context.md`](../collaboration/context.md) | `PROJECT_CONTEXT.md` |
| [`docs/implementation/current-state.md`](../implementation/current-state.md) | `AS_BUILT_SNAPSHOT.md` |

---

## Sync checklist (frontend phase)

- [ ] Route or `dataState` changed → `PROJECT_CONTEXT.md` + `FRONTEND_CONTRACTS.md` + `prototype-contracts.ts`
- [ ] New mock/API split or persistence change → `AS_BUILT_SNAPSHOT.md` + `DOMAIN_MODEL.md`
- [ ] Phase scope change → `MVP_FRONTEND_ONLY_SCOPE.md`
- [ ] API/services touched (backend slice) → `docs/implementation/api-contracts.md` + `pnpm api:validate`

---

## Related repo entry points (outside `docs/`)

| Path | Purpose |
|------|---------|
| [`README.md`](../../README.md) | Clone, install, quick start |
| [`DEMO.md`](../../DEMO.md) | Stakeholder walkthrough (no Docker for UI demo) |
| [`apps/web/src/lib/relay/prototype-contracts.ts`](../../apps/web/src/lib/relay/prototype-contracts.ts) | Machine-readable route metadata |
| [`packages/db/schema.ts`](../../packages/db/schema.ts) | Schema source of truth (backend phase) |

---

*Updated June 2026. Branch: `demo/contract-aware-prototype`.*
