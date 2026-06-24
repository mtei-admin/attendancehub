# AttendanceHub — Next.js + Neon + Vercel

## Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database
- A [Vercel](https://vercel.com) account
- GitHub repo connected to Vercel (`mtei-admin/attendancehub`)

## 1. Install Dependencies

```bash
cd "c:\CursorAi Creation\New\MTEI Slips"
npm install
```

## 2. Configure Environment

Copy `.env.example` to `.env.local` and set your Neon connection string:

```powershell
copy .env.example .env.local
```

```env
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

Use Neon’s **pooled connection string** for Vercel and local scripts.

> **Production migrations:** Temporarily point `.env.local` at the production Neon URL when running `db:migrate` or seed scripts against prod. Do not commit `.env.local`.

## 3. Create Database Schema

```bash
npm run db:migrate
```

This runs `scripts/migrate-schema.ts` (additive migrations, companies table, indexes, backfills). Safe to re-run.

Alternative for dev-only schema sync:

```bash
npm run db:push
```

Prefer `db:migrate` for production.

## 4. Seed Data (optional)

```bash
npm run db:seed          # sample attendance requests (empty DB only)
npm run db:seed:users    # Admin, Manager, HR portal accounts
npm run db:seed:roster   # employee roster from scripts/roster-seed-data.ts
```

- `db:seed:users` upserts accounts and sets `password_hint` for the Admin credentials tab.
- `db:seed:roster` **deletes all employees** and re-imports from the seed file. It does **not** create companies or departments — those must exist first (Admin/HR Companies and Departments tabs).

## 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Before pushing, verify production build:

```bash
npm run build
```

### Default test logins (change in production)

| Portal | Username | Password |
|--------|----------|----------|
| Admin | `admin` | `admin2026` |
| Manager | `hr.manager` | `hr2026` |
| HR | `virg` | `rf2026` |
| Employee | `maria.santos` | `emp2026` |

---

## 6. Deploy to Vercel

1. Push to `main` on GitHub.
2. Vercel builds with `npm run build` and deploys automatically.
3. Ensure **Settings → Environment Variables** includes `DATABASE_URL` (Production, and Preview if needed).
4. After first deploy (or any schema change), run migrations from your machine — see [Production runbook](#production-runbook) below.

---

# Production runbook

Quick reference for operating AttendanceHub on **Vercel + Neon**.

## Architecture

| Layer | Service | Notes |
|-------|---------|--------|
| App | Vercel | Next.js 15, Server Actions, middleware auth |
| Database | Neon Postgres | Access via `DATABASE_URL` only |
| Source | GitHub `main` | Push triggers production deploy |

Vercel does **not** run database migrations on deploy. You run them manually.

## Standard release (code only, no schema change)

1. Pull latest locally and test:
   ```bash
   npm run build
   ```
2. Push to `main`:
   ```bash
   git push origin main
   ```
3. In Vercel → **Deployments**, confirm the latest build is **Ready**.
4. Smoke-test production (see [Smoke test checklist](#smoke-test-checklist)).

## Release with database changes

When a deploy adds columns, tables, or migration script updates:

1. Merge/push code to `main` (or migrate first if the new code **requires** new columns immediately).
2. Set `.env.local` `DATABASE_URL` to the **production** Neon URL (pooled is fine).
3. Run migrations:
   ```bash
   npm run db:migrate
   ```
4. Confirm Vercel deployment is **Ready**.
5. Run smoke tests.

**Order rule:** If the app reads new columns on first request, migrate **before** or **with** deploy. If migration failed partway (e.g. missing column errors on site), fix `scripts/migrate-schema.ts`, re-run `db:migrate`, then redeploy if needed.

## Replace employee roster only

Does not add companies or departments. Existing Companies/Departments in Admin must cover the seed file.

1. Update `scripts/roster-seed-data.ts` if the spreadsheet changed.
2. Point `.env.local` at production `DATABASE_URL`.
3. Run:
   ```bash
   npm run db:seed:roster
   ```
4. Verify Admin → **Employee roster** and Employee portal cascade.

## Refresh portal accounts

Upserts users from `scripts/seed-users.ts` (does not delete employees):

```bash
npm run db:seed:users
```

Use after adding columns like `company` or `password_hint`, or to reset demo passwords.

## Smoke test checklist

After each production deploy:

- [ ] Welcome page loads (`/`)
- [ ] Admin login → Dashboard, Companies, Departments, Employee roster
- [ ] Employee portal → Company → Department → Employee cascade
- [ ] Submit a test request (Employee portal)
- [ ] Manager login → pending list scoped to company + department
- [ ] HR login → pending / checked / all records, CSV export link
- [ ] No “Something went wrong” error page (note **Reference** digest in Vercel logs if it appears)

## Environment variables (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string (use **pooled** URL) |

Set for **Production**. For **Preview** deployments, use a separate Neon branch/database so previews never write to prod.

## Neon operations

- **Backups:** Enable Neon backup / PITR on your plan before relying on prod for HR data.
- **Branches:** Create a `staging` branch for testing migrations and seeds.
- **Sleep (free tier):** First request after idle may be slow; expected on hobby tiers.
- **Connection pooling:** Always use the pooled connection string on Vercel.

## Monitoring and incidents

| Symptom | Where to look | Common fix |
|---------|---------------|------------|
| Build failed | Vercel → Deployments → build log | Fix locally with `npm run build`, push again |
| “Something went wrong” + Reference ID | Vercel → Logs (Runtime) | Often missing DB column — run `npm run db:migrate` |
| Empty employee dropdown | Employee portal | Run `db:seed:roster` or add roster in Admin; ensure departments exist |
| Manager sees no requests | Manager portal | Manager account needs **both** `company` and `department`; requests must match scope |
| Login works locally, not on Vercel | Vercel env vars | Confirm `DATABASE_URL` is set for Production |

## Rollback

**App rollback (fast):**

1. Vercel → **Deployments** → previous successful deployment → **Promote to Production**.

**Database rollback:**

- Neon PITR / restore from backup if a bad migration or seed ran.
- There is no automatic down-migration script — plan migrations as additive when possible.

**Do not** run `db:seed:roster` on production unless you intend to wipe and replace all employees.

## Security checklist (production)

- [ ] Change default passwords from seed users (`admin`, `hr.manager`, etc.)
- [ ] Restrict who has Admin credentials tab access in practice
- [ ] Never commit `.env.local` or paste `DATABASE_URL` in chat/tickets
- [ ] Consider a custom domain + HTTPS (Vercel provides TLS on `*.vercel.app` too)
- [ ] If the app must not be public internet, plan Vercel access controls or network restrictions (team plan features)

## Git workflow summary

```text
local change → npm run build → git push origin main → Vercel deploys
                      ↓
              (if schema changed)
              npm run db:migrate  (with prod DATABASE_URL in .env.local)
                      ↓
              smoke test production URL
```

## Useful commands (PowerShell)

```powershell
cd "c:\CursorAi Creation\New\MTEI Slips"
npm run build
npm run db:migrate
npm run db:seed:users
npm run db:seed:roster
git push origin main
```

---

## Restore Streamlit Version

The original Streamlit + SQLite setup is in `backup/streamlit-original/`.
See `backup/streamlit-original/README.md` for restore instructions.
