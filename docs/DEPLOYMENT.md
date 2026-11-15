# Deployment

## Requirements

* Node.js **22.5+** (the app uses the built-in `node:sqlite`; the demo runs on 22.22)
* A **persistent disk** for `data/` (SQLite database + uploads)
* Outbound HTTPS for payment providers (only when you enable card payments)

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `AUTH_SECRET` | yes | ≥16 chars, `openssl rand -hex 32`. The app throws on session creation in production if it is missing |
| `NEXT_PUBLIC_SITE_URL` | yes | Absolute origin, e.g. `https://shop.client.com` — canonical URLs, Open Graph, sitemap, payment callbacks |
| `DATABASE_PATH` | no | Defaults to `./data/store.db`; point it at the mounted volume, e.g. `/var/data/store.db` |
| `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` | optional | Enables Paystack when both are set |
| `FLUTTERWAVE_SECRET_KEY` / `FLUTTERWAVE_PUBLIC_KEY` | optional | Enables Flutterwave |
| `FLUTTERWAVE_WEBHOOK_HASH` | optional | Secret hash configured in the Flutterwave dashboard |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | optional | First administrator created by `npm run db:seed` |

`data/` (database, WAL files, uploads) is git-ignored. Keep it out of the build output and back it up.

## Vercel

Vercel's filesystem is read-only/ephemeral at runtime, so **SQLite needs a persistent volume**:

1. Import the repository, framework preset **Next.js**.
2. Set the environment variables above; point `DATABASE_PATH` at `/var/data/store.db` if you attach a volume
   (Vercel Postgres/Supabase would require swapping the `Database` implementation — see below).
3. Run `npm run db:seed` once against the production data path (locally with the same `DATABASE_PATH`, or as a
   one-off job), then sign in and change the admin password.
4. Add the custom domain, then update `NEXT_PUBLIC_SITE_URL` and redeploy.

For a purely serverless deployment with no volume, the cleanest path is Postgres: implement `lib/db.ts`'s `Database`
interface with `pg` or Supabase, seed the schema (`lib/db/schema.sql` needs small dialect tweaks: `AUTOINCREMENT` →
`GENERATED`, `datetime('now')` → `now()`), and keep the repositories untouched.

## Docker / VPS / Railway / Render / Fly

```dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
services:
  shop:
    build: .
    ports: ["3000:3000"]
    env_file: .env.local
    volumes:
      - ./data:/app/data      # database + uploads survive restarts
    restart: unless-stopped
```

Behind nginx/Caddy, terminate TLS at the proxy and forward to `127.0.0.1:3000`.

## First-deploy checklist

1. `AUTH_SECRET` and `NEXT_PUBLIC_SITE_URL` set for the real domain.
2. `npm run db:seed` executed once; sign in at `/admin/login`; **change the seeded admin password**.
3. Payment keys present only for providers you have contracts with; confirm the provider dashboard shows the correct
   webhook URLs (`/api/payments/paystack/webhook`, `/api/payments/flutterwave/webhook`) and callback origin.
4. Place a real low-value test order to confirm the verification path marks it paid — and only that path.
5. Check `/sitemap.xml` and `/robots.txt` resolve on the custom domain; submit the sitemap in Google Search Console.
6. Confirm `data/` is on a volume and included in backups.

## Backups

SQLite is a single file: stop writes (or use `.backup`), copy `data/store.db` plus `data/uploads/`, keep both together.
A nightly `sqlite3 data/store.db ".backup '/backups/store-$(date +%F).db'"` plus `rsync` of `data/uploads` is enough
for most client stores.

## Operations

* **Logs:** server actions surface failures as inline messages; unexpected errors land in the platform log with a
  digest shown to the user by `app/error.tsx`.
* **Health:** any successful storefront or admin request proves the DB is reachable (the schema bootstraps on boot).
* **Upgrades:** `npm ci && npm run build` then restart. Schema changes are additive (`CREATE TABLE IF NOT EXISTS`),
  and settings documents are deep-merged over defaults, so older data keeps working.
