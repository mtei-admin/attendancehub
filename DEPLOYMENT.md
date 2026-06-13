# AttendanceHub — Next.js + Neon + Vercel

## Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database
- A [Vercel](https://vercel.com) account (optional, for hosting)

## 1. Install Dependencies

```bash
cd "c:\CursorAi Creation\New\MTEI Slips"
npm install
```

## 2. Configure Environment

Copy `.env.example` to `.env.local` and set your Neon connection string:

```bash
cp .env.example .env.local
```

```env
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

Use Neon's **pooled connection string** when deploying to Vercel.

## 3. Create Database Schema

```bash
npm run db:push
```

## 4. Seed Sample Data (optional)

```bash
npm run db:seed
npm run db:seed:users
```

`db:seed:users` creates Admin, Manager, and HR portal accounts (passwords are hashed in the database).

## 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the welcome page lets you pick a portal and sign in.

### Test logins

| Portal | Username | Password |
|--------|----------|----------|
| Admin | `admin` | `admin2026` |
| Manager | `hr.manager` | `hr2026` |
| HR | `virg` | `rf2026` |
| Employee | `maria.santos` | `emp2026` |

## 6. Deploy to Vercel

1. Push the project to GitHub
2. Import the repo in Vercel
3. Add `DATABASE_URL` in Vercel → Settings → Environment Variables
4. Deploy

Vercel will run `npm run build` automatically.

After first deploy, run schema push and seed from your machine (or Neon SQL console):

```bash
npm run db:push
npm run db:seed
```

## Restore Streamlit Version

The original Streamlit + SQLite setup is backed up in `backup/streamlit-original/`.
See `backup/streamlit-original/README.md` for restore instructions.
