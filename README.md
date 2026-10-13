# Blancolores · Convocatoria

Mobile-first replacement for the legacy BlancolorConvocatorizator: players log in and say whether they play
this week's match (VOY / DUDA / NO VOY), add guests ("fichajes"), and anyone can see the squad.

- Next.js 16 (App Router, Server Components, Server Actions), TypeScript strict, Tailwind CSS 4
- PostgreSQL via Drizzle ORM (Neon in production, PGlite locally and in tests)
- Own DB sessions (hashed tokens, `__Host-` cookie, sliding expiry), Argon2id, login rate limiting, nonce-based CSP
- `next-intl` (Spanish by default), WCAG 2.2 AA checked with axe in E2E

## Getting started

```bash
cp .env.example .env          # set ADMIN_USERNAME / ADMIN_TEMP_PASSWORD
npm install
npm run db:seed               # migrations + settings + FAQ + first admin + legacy players (.data/dev)
npm run dev                   # PGlite as a local Postgres server + next dev on http://localhost:3000
```

Stop `npm run dev` before running `db:seed` / `db:migrate` locally (PGlite allows one process per data folder).
The first admin must set a new password and pick a team on first login. Every other player gets a one-time
link from **Admin → Jugadores** (copy or share via WhatsApp).

## Scripts

| Script                                   | What it does                                                          |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                            | Local DB server (`.data/dev`) + Next dev server                       |
| `npm run build` / `npm start`            | Production build / server (needs `DATABASE_URL`)                      |
| `npm run lint` / `npm run typecheck`     | ESLint / route types + `tsc`                                          |
| `npm test`                               | Vitest: unit, DB integration (in-memory PGlite) and component tests   |
| `npm run test:e2e`                       | Playwright (mobile + desktop) with axe, against the production build  |
| `npm run db:generate`                    | New SQL migration from `src/lib/db/schema.ts`                         |
| `npm run db:migrate` / `npm run db:seed` | Apply migrations / seed (idempotent; `--no-legacy` skips old players) |

Run `npm run build` before `npm run test:e2e`. If Playwright can't download its browser (corporate proxy),
use the installed Chrome: `PW_CHANNEL=chrome npm run test:e2e`.

## Deploying to Vercel

1. Create a Neon database and set `DATABASE_URL` (pooled connection string) and `APP_URL` in the Vercel project.
2. Vercel runs `vercel-build`, which applies migrations before `next build`.
3. Run the seed once against production with `ADMIN_USERNAME` / `ADMIN_TEMP_PASSWORD` set:
   `DATABASE_URL=… npm run db:seed`.

## Business rules

- One recurring match (default: Thursdays 20:30, Polideportivo La Concepción, Europe/Madrid), editable in
  **Admin → Partido semanal**. A new week starts 2 h after kick-off; answers reset with each match.
- Each player chooses their team (Blancos / Color) in their profile; admins can change it.
- No caps, no deadlines, no guest limits. Players on long-term absence (set by admins) can't answer.
- The squad, with names, is public; the site is `noindex`.
