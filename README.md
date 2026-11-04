# Pocketly

Pocketly is a mobile-first personal finance tracker. **Semua uangmu, satu kantong.** The interface is in Indonesian and all amounts are stored as integer Rupiah.

Pocketly does not automatically synchronize with Indonesian banks or e-wallets. There is no free, reliable bank/e-wallet API for this use case, so users enter every balance and transaction themselves. This is a deliberate product decision.

## Stack

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Supabase Auth and Postgres with Row Level Security on every application table
- Recharts, Zod, Vitest, and Playwright
- Vercel for deployment

## Run locally

For the full local Supabase setup, see [docs/setup-local.md](docs/setup-local.md). For a cloud Supabase project and GitHub-to-Vercel deployment, see [docs/deploy.md](docs/deploy.md).

1. Install Node.js 20.9 or later and npm.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project.
3. Apply the SQL migration in `supabase/migrations` to the project. For local development, start the Supabase stack with `npm run db:start` (Docker is required).
4. Install dependencies and start the app:

   ```sh
   npm install
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). Sign up, verify your email, and add at least one asset account in the onboarding wizard.

For password reset, add `http://localhost:3000/auth/callback` to the Supabase Auth redirect URL allow list. Set `NEXT_PUBLIC_SITE_URL` to the deployed origin for production.

## Checks

```sh
npm run lint
npm run type-check
npm test
npm run test:e2e
npm run db:start
npm run db:test
npm run db:stop
```

The unit tests cover asset and liability balances, loan disbursement, one-time transfer fees, transfer fee edits and restore behavior, income validation for liabilities, and the exclusion of balance adjustments from period income/expense totals. The database pgTAP suite checks ownership isolation, the `wallet_balances` view, transfer fee synchronization, direct fee mutation prevention, and liability income rejection.

## Balance model

Balances are computed from opening balances, transactions, transfers, and dated account adjustments. Asset balances add income and inbound transfers and subtract expenses and outbound transfers. Liability balances add expenses and outbound transfers and subtract inbound transfers. The transfer principal moves between accounts only; its fee is represented once as a linked expense transaction on the source account. The database view does not subtract `transfers.fee` a second time.

Opening balance edits are written to `account_balance_adjustments`. They affect the balance view but are not transactions, so they do not become income or expenses. A “Tak tercatat” correction entered as a transaction remains a transaction and is included in its selected category total.

## Database and security

The initial schema is in `supabase/migrations`. A profile and its default categories are created by database triggers when a Supabase Auth user is created. Composite foreign keys keep account, category, transfer, and transaction relationships within the same user. The `wallet_balances` view uses `security_invoker` so table RLS also applies through the view.

Transfers are changed through database functions so the transfer and its linked fee transaction are created, updated, soft-deleted, and restored atomically. Regular transaction rows support soft deletion. Transfer fee rows cannot be edited or deleted directly.

Never commit `.env.local`, access tokens, or service-role keys. Only the public Supabase URL and publishable key belong in browser-facing environment variables; database authorization is enforced with RLS.

## Deploy on Vercel

Apply the migration to the Supabase project first. Then import the Pocketly repository into Vercel and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` in the Vercel project settings. Add the production callback URL (`https://your-domain/auth/callback`) to the Supabase Auth redirect allow list and deploy the Next.js project.
