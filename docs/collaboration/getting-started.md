# Getting started (collaborators)

Practical steps to clone Testlane, run it locally, and confirm everything works before you change anything.

---

## 1. Clone and install

```bash
git clone https://github.com/qhedroid/testlane.git
cd Testlane
pnpm install
```

Copy environment variables:

```bash
cp .env.example .env
```

The defaults match the Docker Compose MySQL and OpenSearch services. Do not commit `.env`.

---

## 2. Start Docker services

```bash
pnpm docker:up
```

Check containers:

```bash
docker compose ps
```

You should see `relay-mysql` and `relay-opensearch` running. MySQL must be healthy before migrations.

If Docker is not running, start Docker Desktop first. Commands like `pnpm db:migrate` will fail with connection errors until MySQL is up.

---

## 3. Database migrate and seed

```bash
pnpm db:migrate
pnpm db:seed
```

- `db:migrate` waits for MySQL, then applies Drizzle migrations.
- `db:seed` is idempotent: it clears and reloads the `relay-dev` organisation (users, projects, PLAN-001, sample cases).

Seed prints stable ULIDs for manual API testing. See `packages/db/src/seed/ids.ts`.

---

## 4. Start the web app

```bash
pnpm dev
```

Open:

- http://localhost:3000/runs — main execution workspace
- http://localhost:3000/api/health — health check

Leave `pnpm dev` running in one terminal while you use the app or run API validation in another.

---

## 5. Validate build and API

**Production build (TypeScript + Next.js):**

```bash
pnpm build
```

**HTTP API suite (app must be running on port 3000):**

```bash
pnpm api:validate
```

Optional service scripts (direct DB, no HTTP):

```bash
pnpm db:validate-create-run
pnpm db:validate-update-case-result
```

---

## Dev auth (temporary)

There is no login screen. API routes use the header:

```
x-relay-user-id: <26-char ULID>
```

The `/runs` UI uses seeded actors from `apps/web/src/lib/relay/config.ts` (Priya for reads/updates, Shaun for create run). To test read-only viewer behaviour, set:

```bash
NEXT_PUBLIC_RELAY_USER_ID=01SEED00000000000000000007
```

in `.env.local` and restart `pnpm dev`.

Full user list and endpoints: [`docs/implementation/api-contracts.md`](../implementation/api-contracts.md).

---

## Common troubleshooting

### Stale Next.js cache (health returns HTML or 500 after `pnpm build`)

Symptoms: `curl /api/health` returns HTML, vendor-chunk errors, or `pnpm api:validate` cannot connect properly.

Fix:

```bash
pnpm dev:reset
pnpm dev
```

Or manually:

```bash
rm -rf apps/web/.next
pnpm dev
```

`dev:reset` stops anything on port 3000 and removes `.next`.

### Port 3000 already in use

Another process (often a zombie `next dev`) is holding the port.

```bash
lsof -ti :3000 | xargs kill -9
pnpm dev
```

Or use `pnpm dev:reset` then `pnpm dev`.

### Docker not running

Error: cannot connect to MySQL, `docker compose` fails.

- Start Docker Desktop.
- Run `pnpm docker:up` again.
- Wait 30–60 seconds, then `pnpm db:migrate`.

### Database connection issues

- Confirm `.env` exists and `DATABASE_URL` matches `docker-compose.yml` (user `relay`, password `relay`, database `relay`).
- Confirm MySQL is healthy: `docker compose ps`.
- Nuclear reset (wipes all local DB data):

  ```bash
  docker compose down -v
  docker compose up -d
  pnpm db:migrate
  pnpm db:seed
  ```

### `pnpm api:validate` hangs

Usually means nothing is listening on port 3000, or the server is stuck after a build.

1. `pnpm dev:reset && pnpm dev`
2. Wait for “Ready” in the dev terminal.
3. `curl http://localhost:3000/api/health` — expect JSON with `"mysql":"ok"`.
4. Run `pnpm api:validate` again.

---

## Where to read next

| Document | When |
|----------|------|
| [`working-agreement.md`](working-agreement.md) | Before your first branch/PR |
| [`github-setup.md`](github-setup.md) | Repo admin / project board setup |
| [`friend-handover.md`](friend-handover.md) | Quick context on what exists |
| [`../implementation/current-state.md`](../implementation/current-state.md) | Engineering checkpoint |
