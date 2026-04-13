# Deploy Guide

## What's built

- Next.js 14 (App Router, TypeScript, Tailwind)
- Pages: `/`, `/lenders`, `/how-it-works`, `/data`, `/about`, `/outcome`
- API routes: `/api/benchmark`, `/api/submit`, `/api/outcome`, `/api/stats`, `/api/cron/outcome-prompts`
- Supabase DB schema + seed data in `supabase/migrations/`
- Vercel cron for D+3 outcome prompts

## Steps to deploy

### 1. Supabase

1. Create a new project at supabase.com
2. In the SQL editor, run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_benchmarks.sql`
3. Grab from Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. Resend

1. Create account at resend.com
2. Add and verify `loyaltytax.com.au` domain
3. Grab API key → `RESEND_API_KEY`

### 3. Vercel

1. Connect the GitHub repo `jhei21244/mortgage-tax`
2. Add environment variables (from `.env.local.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `NEXT_PUBLIC_SITE_URL=https://loyaltytax.com.au`
   - `CRON_SECRET` (generate a random string)
3. Deploy — Vercel auto-detects Next.js
4. Add custom domain: `loyaltytax.com.au`
5. Cron job (`/api/cron/outcome-prompts`) will run daily at 06:00 UTC (20:00 AEST)

### 4. Post-deploy

- Verify benchmark data loads on `/lenders`
- Test calculator → results → gate → insights flow end-to-end
- Test `/outcome?token=` with a real token from Supabase

## Known MVP limitations

- **Email for outcome prompts**: The cron logs pending tokens but can't send emails because we only store email hashes, not addresses. To send D+3 emails, you'd need to add an encrypted `email_address` field to `submissions` and send the address server-side after the gate submission — or implement a token-only approach (link delivered on-screen).
- **Rate scraper**: Not implemented. Seed data covers 7 lenders. Real scraping needs a separate service or Supabase Edge Function with pg_cron.
- **Benchmark aggregation**: Seeded data is static. The hourly aggregation job (updating benchmarks from new submissions) is not yet implemented — add as a Supabase Edge Function with pg_cron.
- **Admin dashboard**: Not built. Use Supabase's built-in Table Editor for now, or wire up Retool.

## File structure

```
app/
  page.tsx                    ← homepage + calculator
  lenders/page.tsx            ← lender rankings table
  how-it-works/page.tsx
  data/page.tsx
  about/page.tsx
  outcome/page.tsx            ← post-call outcome form
  api/
    benchmark/route.ts        ← GET benchmark data
    submit/route.ts           ← POST submission
    outcome/route.ts          ← POST outcome
    stats/route.ts            ← GET trust bar counts
    cron/outcome-prompts/     ← Vercel cron (D+3)
components/
  Nav.tsx
  Footer.tsx
lib/
  supabase.ts
supabase/
  migrations/
    001_initial_schema.sql
    002_seed_benchmarks.sql
_docs/
  loyalty_tax_spec.md         ← product spec
  loyaltytax_mockup.html      ← original HTML mockup
```
