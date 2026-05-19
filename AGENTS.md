# Moonbeam — Agent Rules

These are persistent instructions for any agent working in this workspace. Read this and SPEC.md before planning any work.

## Source of truth

- **SPEC.md** — full technical specification (v1.6). Authoritative for all architecture, schema, flows, UI, and scope decisions.
- **intent-scoring-rubric.md** — authoritative source for the scoring + drafting prompts. Use the prompts in this file verbatim. Do not paraphrase or "improve" them — they were calibrated against hand-graded data and small wording changes have outsized effects.

## Stack constraints

- Next.js 14+ App Router, TypeScript (strict mode)
- Tailwind CSS for styling
- Drizzle ORM
- Supabase Postgres (use the connection string only — no Supabase Auth, no Supabase RLS, no Supabase client SDK for queries)
- Vercel for hosting and Cron
- `@anthropic-ai/sdk` for LLM calls (Claude Sonnet)
- `apify-client` for scraping

## Architectural rules

1. **No auth library.** Single-tenant app. Operator unlocks admin via `?token=...` URL that sets a cookie. Visitors see read-only dashboard. See SPEC.md sections 2 and 7.1.
2. **No users table.** Schema is in SPEC.md section 4: `scan_config` (single row), `scans`, `signals`. Nothing else.
3. **No Supabase RLS policies.** There are no users to scope to. Cookie check happens in Next.js server actions before any mutation.
4. **No 7-template inference flow.** REPLAICED is hardcoded. Queries live in `scan_config.search_queries` and are edited via SQL.
5. **Server actions for mutations.** Do not create REST API routes for the dashboard. The only API routes are:
   - `/api/cron/daily-scan` — Vercel Cron entry point
   - `/api/admin/unlock` — sets the operator cookie
6. **Date handling for the scoring prompt:** the current date and the `tweetAgeLabel` MUST be computed in JavaScript and injected into the prompt string. Never let the LLM reason about dates from raw timestamps. See `intent-scoring-rubric.md` for the exact code pattern.

## Code style

- TypeScript strict mode, no `any` unless genuinely unavoidable (and then commented why)
- Prefer single-file components until they exceed ~250 lines
- Server components by default; only use client components when interactivity requires it (copy buttons, expandable sections)
- No localStorage / sessionStorage anywhere
- No global state libraries (Redux, Zustand, etc.) — server-side rendering with revalidation handles state
- Tailwind classes inline; reach for CSS modules only if there's a strong reason
- CSS variables defined in `app/globals.css` per SPEC.md section 6.1

## What NOT to do

- Don't add NextAuth, Clerk, Supabase Auth, or any auth library
- Don't add a users table, accounts table, or sessions table
- Don't add email digests, push notifications, or Slack integrations
- Don't add analytics or visitor tracking (Posthog, Mixpanel, etc.)
- Don't add Sentry, Datadog, or other observability tools
- Don't add image optimization, CDN, or other premature performance work
- Don't add the 7-template inference flow — REPLAICED is the only product
- Don't build an Edit Product UI — operator edits queries via SQL in v1.6
- Don't add a "post to Twitter" or "send DM" feature — out of scope, ToS-risky

## Scope discipline

The full v1.6 scope and what's out of scope is in SPEC.md section 0. If a task seems to require something out of scope, **stop and ask** rather than scope-creeping.

The build plan in SPEC.md section 9 is structured into phases (Saturday Hours 1-2, Hours 3-4, etc.). Implement one phase at a time. Do not skip ahead.

## Verification

When generating code that calls external services (Apify, Anthropic), include a way to test the integration without burning real API credits — e.g. a `--dry-run` flag, mock data fixtures, or a clearly-labeled test endpoint. Do not run real Apify scrapes during initial development; use the test harness in `~/moonbeam-test-harness/` for that.

## Cost awareness

This is a personal-tool prototype with a ~$95/month budget ceiling (SPEC.md section 8). Cost-aware code patterns:
- Drafting only runs for tweets in tier ≥faint (score ≥40). Don't generate drafts for hidden tier.
- Dedup against existing `signals.tweet_id` before scoring — don't re-score tweets we've already seen.
- Track `cost_cents` per scan in the `scans` table.

## When in doubt

- Re-read SPEC.md
- Ask before adding dependencies
- Ask before introducing patterns not described in the SPEC
- Ask before deviating from the prompts in `intent-scoring-rubric.md`
