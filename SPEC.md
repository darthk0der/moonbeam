# Moonbeam — Technical Specification

**Version:** 1.8 (Sticky tier-nav with scroll-spy; sort toggle removed)
**Audience:** Claude Code, BMAD method
**Last updated:** 2026-05-19

---

## 0. What this is

Moonbeam is a single-tenant prospecting tool for a single product: **REPLAICED** (a tool that scores AI-replacement risk for a resume and recommends skills + career pivots). It scrapes Twitter daily for people showing real intent signals (anxiety about AI displacement, recent layoffs, career-pivot questions), scores them, drafts replies + DMs, and presents them on a public dashboard.

The dashboard is **publicly viewable** — anyone can land on the URL and see today's prospects, their scores, the drafted replies. Only the operator (you) can take actions (copy, save, mark irrelevant, run scan, edit queries). Visitors clicking action buttons see a "sign in to use" toast.

This is a portfolio piece, not a SaaS product. The goal is to demonstrate AI-native build velocity to a LinkedIn network and to actually be useful for REPLAICED outreach.

### Critical scope decisions baked into v1.6

| Decision | Reasoning |
|----------|-----------|
| **Single-tenant, no users table, no auth** | Only one product (REPLAICED) and one operator (you). Auth is overhead. A `SUPER_USER_TOKEN` env var in code unlocks edit mode via cookie. |
| **Public dashboard, real data including drafted DMs** | Showing the system in action is the demo. Visitors see real tweets, real authors, real drafts. |
| **Visitor actions are clickable but show a "sign in to use" toast** | Advertises capability without cluttering the calm UI. Better than greyed-out disabled buttons. |
| **No 7-template inference, no onboarding flow** | REPLAICED is hardcoded. Queries live in code/DB and you tune them by hand. |
| **Daily cron scan (06:00 UTC)** | You want autopilot for your real REPLAICED outreach. |
| **The test harness is kept as a dev tool** | For periodic rubric re-tuning. Lives separately from the production app. |

### Out of scope for v1.6

- Multi-user (no users table at all)
- Onboarding flows, AI-inference of queries, vertical templates
- Email digests, push notifications, Slack alerts
- Posting tweets / sending DMs from the app (out of all versions)
- Mobile app (responsive web only)
- Analytics or tracking of visitor behavior
- Curated "showcase set" — the dashboard shows everything

### What gets shipped publicly

1. The working app at a public URL — anyone can view today's prospects
2. A LinkedIn post / Twitter thread documenting the build
3. A 60-90s demo video
4. A public GitHub repo with this spec, the rubric, and the test harness

---

## 1. Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Supabase (free tier, no auth product needed) |
| ORM | Drizzle |
| Styling | Tailwind CSS + custom CSS variables |
| UI primitives | shadcn/ui (selectively) |
| Scraping | apify-client npm package |
| LLM | @anthropic-ai/sdk (Claude Sonnet) |
| Cron | Vercel Cron (Hobby includes daily) |
| Hosting | Vercel Pro |
| Domain | yourchoice.com |

Why this stack: a solo developer can ship it in a 2-day weekend. Free tiers cover everything. No multi-service orchestration.

---

## 2. User experience

### 2.1 Visitor flow

Visitor lands on `moonbeam.yoursite.com`. No splash screen, no signup. Directly into the dashboard:

```
                    [moonbeam logo]
                    Finding signal in the noise for: REPLAICED

                    Recent prospects · last 14 days
                       142 found

                    [Sticky Nav Legend: Bright | Clear | Faint | Hidden]

  ─────────  BRIGHT SIGNALS  ─────────                        (15)
  [cards with full draft content — copy buttons and Open-in-X clickable]

  ─────────  CLEAR SIGNALS  ─────────                        (12)
  [cards, drafts collapsed — expandable]

  ─────────  FAINT SIGNALS — lower priority  ─────────       (15)
  [smaller dimmed cards]

  ▸ Show 10 low-fit signals

                    Built by [@yourhandle]
                    Powering REPLAICED outreach
```

A small "About" link in the footer explains what they're looking at: a live tool that scrapes Twitter daily for people anxious about AI replacing their job, ranks them, and drafts personalized replies. Built with Claude Code in one weekend.

When a visitor clicks a gated action button (Mark irrelevant), they see a toast: **"Sign in to use this. This is a public demo."** No prompt to actually sign in — there's no signup form. The toast is informational only.

### 2.2 Operator flow (you)

You unlock edit mode by visiting `moonbeam.yoursite.com?token=YOUR_SECRET` once. The token is read from `SUPER_USER_TOKEN` env var. On match, the server sets a `moonbeam_admin` cookie (HttpOnly, 30-day expiry). All subsequent requests with the cookie unlock action buttons and admin-only routes.

Once unlocked, you see the same dashboard but action buttons are functional:
- Copy reply (puts the drafted reply in clipboard, shows confirmation toast)
- Copy DM (same, for DM)
- Open in X (deep link to the tweet, with reply pre-filled where possible)
- Mark irrelevant (sets `user_marked_irrelevant`, optimistically hides from default view)

You also see an admin section at the bottom: "Last scan: 4h ago, 42 results · [Run scan now]". Manual scan button only renders for the operator.

### 2.3 Editing queries

No UI for query editing in v1.6. You edit `scan_config.search_queries` directly in Supabase's SQL editor. Saves a day of UI work. If you find yourself editing queries weekly, build the UI in v1.7.

---

## 3. System architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser   │────▶│   Next.js    │────▶│   PostgreSQL    │
│   (React)   │◀────│   (App Rtr)  │◀────│   (Supabase)    │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
                           ├────▶ Anthropic API (Claude Sonnet)
                           │       └─ scoring + drafting
                           │
                           └────▶ Apify API
                                   └─ apidojo/tweet-scraper

┌──────────────────────────────────────────────┐
│  Vercel Cron — daily at 06:00 UTC,            │
│  hits /api/cron/daily-scan, runs the          │
│  full pipeline, writes signals to DB.         │
└──────────────────────────────────────────────┘
```

No auth service, no users table, no allowlist. The "operator vs. visitor" distinction is a single cookie set by a single-token check.

---

## 4. Data model

```sql
-- The scan configuration lives in a single row. You edit it in SQL.
CREATE TABLE scan_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- enforce single row

  product_name TEXT NOT NULL DEFAULT 'REPLAICED',
  product_url TEXT NOT NULL DEFAULT 'https://replaiced.co',
  product_description TEXT NOT NULL DEFAULT 'A tool that scores how at-risk your job is from AI replacement, suggests skills to learn to stay ahead, and recommends potential career pivots based on your resume.',
  product_keywords TEXT[] NOT NULL DEFAULT ARRAY['AI replacement', 'job displacement', 'career pivot', 'AI-proofing']::TEXT[],

  icp_titles TEXT[] NOT NULL DEFAULT ARRAY['knowledge worker', 'software engineer', 'marketer', 'designer', 'product manager', 'analyst']::TEXT[],

  -- The actual queries the scraper runs. Edit via SQL.
  search_queries TEXT[] NOT NULL,

  -- Operational
  scans_paused BOOLEAN DEFAULT FALSE,
  last_edited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Each scan run
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'completed' | 'failed'
  raw_results_count INTEGER,
  scored_results_count INTEGER,
  apify_run_id TEXT,
  error_message TEXT,
  cost_cents INTEGER,
  triggered_by TEXT  -- 'cron' | 'manual'
);

CREATE INDEX idx_scans_started ON scans(started_at DESC);

-- Each scored signal
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Tweet data
  tweet_id TEXT NOT NULL,
  tweet_url TEXT NOT NULL,
  tweet_text TEXT NOT NULL,
  tweet_posted_at TIMESTAMPTZ NOT NULL,
  tweet_likes INTEGER DEFAULT 0,
  tweet_replies INTEGER DEFAULT 0,
  tweet_retweets INTEGER DEFAULT 0,

  -- Author data
  author_username TEXT NOT NULL,
  author_display_name TEXT,
  author_url TEXT,
  author_bio TEXT,
  author_followers INTEGER,
  author_following INTEGER,
  author_account_age_days INTEGER,
  author_verified BOOLEAN DEFAULT FALSE,

  -- Scoring
  intent_score INTEGER NOT NULL,        -- 0-5
  intent_reason TEXT,
  intent_flavor TEXT,                    -- 'personal' | 'adjacent' | 'distribution' | 'none'
  relevance_score INTEGER NOT NULL,     -- 0-5
  relevance_reason TEXT,
  recency_score INTEGER NOT NULL,       -- 0-5
  recency_reason TEXT,
  total_score INTEGER NOT NULL,         -- 0-100
  tier TEXT NOT NULL,                    -- 'bright' | 'clear' | 'faint' | 'hidden'
  match_explanation TEXT,
  auto_disqualified BOOLEAN DEFAULT FALSE,
  disqualification_reason TEXT,

  -- Drafts
  draft_reply TEXT,
  draft_dm TEXT,

  -- Operator interactions (only the operator can write these)
  user_marked_irrelevant BOOLEAN DEFAULT FALSE,
  user_saved BOOLEAN DEFAULT FALSE,
  feedback_text TEXT
);

CREATE INDEX idx_signals_score ON signals(total_score DESC, created_at DESC);
CREATE INDEX idx_signals_tier ON signals(tier, total_score DESC);
CREATE UNIQUE INDEX idx_signals_dedup ON signals(tweet_id);  -- never show the same tweet twice
```

### 4.1 No row-level security needed

There are no users to scope to. Public reads, operator-cookie-gated writes. The Next.js server actions enforce the cookie check before any mutation.

### 4.2 Seeding scan_config on first deploy

After running migrations, insert the single row:

```sql
INSERT INTO scan_config (id, search_queries) VALUES (1, ARRAY[
  '("will AI replace my" OR "worried AI will" OR "scared AI will" OR "afraid of being replaced") (job OR career OR role OR work) -is:retweet -filter:replies lang:en min_faves:1 -"hot take" -"prediction"',
  '("how do I AI-proof" OR "future-proof my career" OR "AI proof my") -is:retweet -filter:replies lang:en min_faves:1',
  '("thinking about a career change" OR "considering a pivot" OR "need to switch careers") (AI OR automation OR "job market") -is:retweet -filter:replies lang:en min_faves:1',
  '("laid off" OR "got laid off" OR "lost my job") (AI OR automation OR "replaced by") -is:retweet -filter:replies lang:en min_faves:1',
  '("am I cooked" OR "is my job safe" OR "is my career safe") (AI OR ChatGPT OR Claude OR automation) -is:retweet -filter:replies lang:en min_faves:1'
  -- add more queries here per the rubric file
]);
```

The hand-graded rubric in `intent-scoring-rubric.md` recommends 12-15 queries for daily volume of 25-40 visible signals. The seed query list is the starting set; expand by editing in SQL.

---

## 5. Core flows

### 5.1 The scan (cron + manual)

Triggered by either Vercel Cron at 06:00 UTC (`triggered_by = 'cron'`) or by the operator clicking "Run scan now" (`triggered_by = 'manual'`).

```
SCAN JOB
  ├─ Insert row in `scans` (status='running')
  ├─ Read scan_config.search_queries
  ├─ Append `since:` filter (last 7 days) to each query
  ├─ Call Apify actor `apidojo/tweet-scraper` (actor ID: 61RPP7dywgiy0JPD0)
  │   ├─ maxItems: 300
  │   └─ Sync call (90s timeout typical)
  ├─ Filter out any tweets returned by Apify missing a `tweet_id` (ghost tweets)
  ├─ Dedup against `signals` table using `tweet_id`
  ├─ Process new tweets in parallel batches of 10:
  │   ├─ Send to LLM scorer (5.2)
  │   ├─ If total_score >= 40 (bright/clear/faint tiers): Generate reply + DM drafts (LLM, 5.3)
  │   └─ Persist the batch of 10 to the `signals` table immediately (real-time incremental insertion to prevent batch timeouts/crashes)
  ├─ Update `scans` row: completed_at, scored_results_count, cost_cents
  └─ [ON FAILURE]: Catch any exceptions, update `scans` row status='failed' and set `error_message`, then re-throw
```

The scan is synchronous and may take 60-90 seconds. For the manual button: show a "Scanning…" loading state on the dashboard, auto-refresh when complete. For the cron job: just write to DB; the next page load picks it up.

*Note on windows: The `since:` filter is the SCRAPE window (7 days — how far back Apify looks per scan). This is distinctly different from the DISPLAY window (14 days — what the dashboard aggregates as defined in section 6.0). Do not conflate them.*

### 5.2 LLM scoring call

Uses Claude Sonnet (model string: current Sonnet at build time, e.g. `claude-sonnet-4-5-20250929`). Full prompt template lives in `intent-scoring-rubric.md`. Use structured output mode (JSON).

The hand-graded precision (May 2026, n=50): **72% strict / 83% lenient**.

Critical implementation note: **the current date must be injected into the prompt in code**, not inferred by the LLM. LLMs hallucinate dates past their training cutoff. The `tweetAgeLabel` ("4.2 hours ago (today)") must also be computed in JavaScript before sending. See `intent-scoring-rubric.md` for the exact code.

### 5.3 Reply and DM drafting

For every signal in bright/clear/faint tiers (score ≥40), call the LLM again with the REPLAICED-specific drafting prompt from `intent-scoring-rubric.md`. Generate both `draft_reply` and `draft_dm`.

REPLAICED tonal note: lead with empathy, normalize the anxiety, only mention the product in the second half. A pitchy reply on a layoff tweet damages the brand. The drafting prompt enforces this.

Hidden-tier (score 0-39) tweets do NOT get drafts. Saves ~30% of LLM spend.

### 5.4 The "mark irrelevant" interaction

This is an operator-only action. When clicked, the UI should use optimistic UI to immediately hide the card from view (it disappears on click without waiting for a reload). In the background, it sets `user_marked_irrelevant = true`.

*Note: There is no "Save" action in v1.7. It was cut because it didn't lead anywhere useful in the workflow. The `user_saved` column remains in the schema but is unused and can be dropped in a future cleanup.*

---

## 6. The dashboard UI

*Note: Visual specifics (colors, typography, layout, motion) are strictly defined by the `design-reference.html` file in the workspace root. The reference file is the ultimate source of truth.*

### 6.0 Dashboard structure and behavior

- **Display window**: The dashboard shows a rolling 14-day window — all signals from the last 14 days across all scans, deduplicated by `tweet_id`, grouped into tiers. This is distinct from the per-scan scrape window.
- **Header**: The "moonbeam." wordmark, immediately followed by a product-context line "Finding signal in the noise for: REPLAICED" (REPLAICED hyperlinked to https://replaiced.co), then a summary count.
- **Sticky tier-nav (scroll-spy)**: The tier legend serves as a sticky navigation bar pinned to the top of the viewport on scroll. It uses a frosted-glass background. Each item in the legend is a smooth-scrolling jump-link to its respective tier section. An IntersectionObserver (scroll-spy) live-updates the active legend item based on which tier section is currently in view. Tier sections use `scroll-margin-top` so their headings clear the pinned nav.
- **Sort**: Signals are always ordered by `total_score` descending within each tier. There is no sort control in the UI. (Note: an earlier v1.7 draft included a sort toggle which has since been removed to simplify the interface).

### 6.1 Color tokens

```css
:root {
  --ink: #08090C;
  --ink-2: #0C0D11;
  --surface: #11131A;
  --surface-2: #181B24;
  --surface-3: #1F232E;
  --border: rgba(255, 255, 255, 0.06);
  --border-strong: rgba(255, 255, 255, 0.10);
  --border-bright: rgba(201, 185, 138, 0.18);
  --text: #E8E6E0;
  --text-secondary: #9A9892;
  --text-tertiary: #6B6960;
  --text-faint: #4A4A45;
  --beam: #D4C28A;
  --beam-bright: #E8D9A3;
  --beam-dim: rgba(212, 194, 138, 0.12);
  
  --serif: 'Instrument Serif', Georgia, serif;
  --sans: 'Inter', system-ui, -apple-system, sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, monospace;
}
```

### 6.2 Component treatments

- **Radial Glow**: `body::before` radial gradient from `rgba(212, 194, 138, 0.06)` fading to transparent at the top center.
- **Noise Texture**: `body::after` `feTurbulence` fractal noise SVG at 0.025 opacity for depth.
- **Bright Cards**: Uses an elliptical radial gradient layered with a linear gradient, plus a 3-layer `box-shadow` for elevation, and `.beam` color tokens.
- **Faint Cards**: Opacity reduced to `0.78` and a `lower-priority-tag` rendered inline.
- **Wordmark**: `moonbeam<span class="dot">.</span>` in lowercase italic serif, where `.dot` is gold.
- **Crescent Score**: An SVG where the path changes depending on the tier, filled with `--beam` or `--text-secondary`.
- **Match Callout**: Uses a `--beam` left border and `--beam-dim` background.
- **Bright Pulse Animation**: A continuous `brightPulse` animation on Bright cards (5s cycle, ease-in-out, infinite) where the box-shadow glow swells and recedes. Multiple Bright cards must be staggered out of phase. The pulse pauses on hover, and the animation must be wrapped in `prefers-reduced-motion`.
- **Footer**: Text is "Built by Andre Llewellyn" (hyperlinked to https://www.linkedin.com/in/andre-llewellyn-b69a294/) on the left, and "Powering REPLAICED outreach" on the right.

*(For detailed structural mappings, see `design-reference.html`)*

### 6.7 Visitor mode UI behavior

When the `moonbeam_admin` cookie is NOT set (i.e., a visitor):

- All cards render identically to operator view.
- Copy buttons and Open-in-X work for everyone (pure client-side, ungated).
- "Mark irrelevant" is the only gated action. Visitors clicking it get the toast: **"Sign in to use. This is a public demo."**
- The admin footer ("Last scan: 4h ago · [Run scan now]") does not render
- A small footer line: "Live demo — built by [@yourhandle] for REPLAICED. Source on GitHub."

When the cookie IS set:

- Action buttons are functional
- Admin footer renders
- "Run scan now" button is visible

The cookie check happens server-side in the page component. The button click handler also re-checks the cookie via a server action before mutating, so a visitor manually crafting requests can't bypass the gate.

### 6.8 Empty states

**First load before any scan:** big serif "No prospects yet." Subdued copy: "The first scan runs at 06:00 UTC. Check back tomorrow."

**Scan completed but 0 results:** big serif "Quiet day." Subdued copy: "We searched but found nothing matching today. Tomorrow we try again."

### 6.9 Motion

- Page transitions: opacity fade (200ms)
- Card stagger on initial load: 60ms delay between cards within a tier
- Hover: subtle brightness lift on buttons (no transform)
- Crescent fill: 400ms ease-out
- "Show low-fit" expansion: 300ms slide-down

### 6.10 Things to deliberately NOT do

- No skeleton loaders that animate. Use a calm "Scanning…" with a slow text-fade.
- No notification badges, red dots, or "X new" counters
- No infinite scroll (pagination only if >100 visible signals)
- No charts or analytics
- No dark/light mode toggle (always dark)
- No emoji in the UI

---

## 7. API surface (Next.js server actions)

```typescript
// Public (no auth required)
async function getDashboardData(): Promise<DashboardData>
//   Returns scored signals from the last 14 days grouped by tier, 
//   and a flag indicating whether the requester has the admin cookie.

// Admin-only (cookie-gated; throws 401 if cookie missing)
async function triggerManualScan(): Promise<{ scanId: string }>
async function markIrrelevant(signalId: string): Promise<void>

// Note: Copy and Open-in-X are purely client-side actions and do not use server actions.
```

### 7.1 Cookie check helper

```typescript
// lib/auth.ts
import { cookies } from 'next/headers';

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('moonbeam_admin')?.value === process.env.SUPER_USER_TOKEN;
}

// lib/auth-set-cookie.ts (route handler at /api/admin/unlock)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (token !== process.env.SUPER_USER_TOKEN) {
    return new Response('Forbidden', { status: 403 });
  }
  const response = Response.redirect(new URL('/', req.url), 302);
  response.headers.set('Set-Cookie',
    `moonbeam_admin=${process.env.SUPER_USER_TOKEN}; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000; Path=/`
  );
  return response;
}
```

You unlock by visiting `https://moonbeam.yoursite.com/api/admin/unlock?token=YOUR_SECRET` once. After that the cookie persists for 30 days.

### 7.2 Cron endpoint

```typescript
// app/api/cron/daily-scan/route.ts
import { runScan } from '@/lib/scan';

export async function GET(req: Request) {
  // Vercel Cron auth header
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const scanId = await runScan('cron');
    return Response.json({ scanId, status: 'ok' });
  } catch (err) {
    return Response.json({ status: 'failed', error: err.message }, { status: 500 });
  }
}
```

`vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/daily-scan",
    "schedule": "0 6 * * *"
  }]
}
```

If the scan is paused (`scan_config.scans_paused = true`), the cron should still run but bail early with a logged "paused" status. Useful for travel weeks.

---

## 8. Cost projections

### Target: ~$95/month

| Item | Estimated monthly cost |
|------|------------------------|
| Apify Starter | $49 (covers ~120K tweets, well within v1.6 daily volume) |
| Claude Sonnet — scoring (~9,000 tweets/mo at 300/day, dedup factor ~30%) | ~$30 |
| Claude Sonnet — drafting (~3,000 drafts/mo at $0.005 each) | ~$15 |
| Vercel Hobby | $0 |
| Supabase free tier | $0 |
| Domain | ~$1 amortized |
| **Total** | **~$95/mo** |

### Cost guardrails

- `scans` table tracks `cost_cents`. If monthly total exceeds $150, the cron route logs a warning and pauses.
- Drafting only runs for score ≥40. Hidden tier doesn't get drafts.
- If you go on vacation, set `scan_config.scans_paused = true` via SQL.

### To reduce cost

- Drop maxItems to 100-150 → cuts scoring ~50%, but you'll see fewer prospects.
- Drop drafting from Faint tier → cuts drafting ~30%.
- Swap Apify Starter for pay-as-you-go → could hit ~$30/mo total.

---

## 9. The 2-day weekend build plan

Same overall shape as v1.5 but shorter because of single-tenant simplification.

### Pre-weekend (any evening that week, ~30 min)

Confirm the test harness still passes. Run:
```bash
cd ~/moonbeam-test-harness
npm run test:replaiced
```
Surface rate should be 25-40%, precision-via-grader should be reasonable. If results look weird, tune the rubric in `intent-scoring-rubric.md` and re-run before starting the weekend build. The rubric is the engine; everything else is plumbing.

### Saturday (~10 hours)

**Hours 1-2: Foundation**
- Next.js 14 + Tailwind + Supabase project
- Drizzle setup, run schema migrations from section 4
- Seed `scan_config` with the starter queries (section 4.2)
- One-page UI scaffold at `/` showing "Hello"

**Hours 3-4: Scan pipeline**
- Install `apify-client` and `@anthropic-ai/sdk`
- Server function `runScan(triggeredBy)`: reads scan_config, calls Apify, stores raw tweets to a temp scratch
- Manual test: hit a server action that calls runScan, confirm tweets land in DB

**Hours 5-6: Scoring + drafting**
- Port the scoring prompt from `intent-scoring-rubric.md`. Date-injection in code.
- Port the drafting prompt (REPLAICED variant)
- Wire scoring after scrape, drafting after scoring (only for tier ≥faint)
- Verify: signals table has 30-40 rows after one scan, with valid tiers

**Hours 7-8: Dashboard rendering**
- Page component reads from signals table, groups by tier
- Render bright/clear/faint sections with the per-card structure from section 6.6
- Crescent SVG component
- Hidden tier renders as collapsed list at bottom

**Hours 9-10: Operator unlock + admin UI**
- `/api/admin/unlock` route handler (sets cookie)
- Page server component reads cookie, passes `isAdmin` flag to client
- Action buttons render but: visitor click → toast, admin click → real action
- Admin footer with "Last scan" + "Run scan now" button (visible only if isAdmin)

**End of Saturday checkpoint:** local dev is fully working. You can scan, see prospects, copy drafts. Tweets are in the DB.

### Sunday (~10 hours)

**Hours 1-3: Polish pass**
- Color tokens, typography, layout per section 6
- Moonbeam gradient
- Tier section headers in serif
- Spacing, borders, hover states
- Mobile-responsive (single column always; just adjust padding)

**Hours 4-5: Toasts and copy interactions**
- Toast component (bottom-center, fade-in fade-out, 3s)
- "Sign in to use. This is a public demo." toast for visitor clicks
- "Copied to clipboard" toast for admin clicks
- Open-in-X deep links

**Hour 6: Cron + deploy**
- `/api/cron/daily-scan` route + `vercel.json`
- Set CRON_SECRET, SUPER_USER_TOKEN, APIFY_TOKEN, ANTHROPIC_API_KEY env vars on Vercel
- Deploy
- Visit `?token=YOUR_SECRET` to unlock admin
- Trigger a manual scan to seed the prod DB

**Hour 7: Landing footer + about**
- Small "About" link in footer that opens a modal or tooltip explaining: what this is, why it exists, how it works (link to GitHub). 2-3 sentences.
- Visible byline: "Built by @yourhandle. Source on GitHub."

**Hours 8-9: Demo video + content prep**
- Screen recording of the live URL: empty state → scan kicks in → prospects render → admin clicks copy → toast → paste in X compose box
- 60-90s, no voiceover required
- Draft the LinkedIn post (see section 11)

**Hour 10: Launch**
- Publish the LinkedIn / Twitter post with the live URL and the GitHub link
- Make GitHub repo public

### Week after launch — use it daily

This is the only real validation. Open the dashboard every morning, copy 1-2 drafts, send. If the prospects feel right, the rubric works. If they don't, tune in `intent-scoring-rubric.md` and re-deploy.

---

## 10. Validation checkpoints

**Pre-launch:**
1. Test harness pass — surface rate 25-40%, precision-via-grader 65%+
2. Live deploy works — cron has fired at least once, signals appear
3. Visitor mode works — open in incognito, action buttons toast
4. Operator mode works — token unlocks edit, scan button visible

**Post-launch, week 1:**
- Daily yield (number of signals at score ≥60): target 8-15 per day for REPLAICED
- Your subjective satisfaction: of 10 signals you read, are 6+ ones you'd actually message?
- If yes: ship the LinkedIn post and call it done. If no: tune rubric, re-deploy.

---

## 11. The LinkedIn launch (this is a deliverable)

### 11.1 Hook

A specific, verifiable claim. Example:
> "I built a Twitter intent-monitoring tool in one weekend with Claude Code. It scrapes ~300 tweets daily, scores them through a hand-tuned rubric, and drafts personalized replies. Live demo, source code, and the full prompt are linked. Costs ~$95/month to run."

Avoid vague AI hype. Be specific about scope, time, cost.

### 11.2 What to include

- **Demo embed:** 60-90s screen recording. Open the live URL. Show the empty-state, the scan loading, the prospects rendering, copying a draft, pasting in X.
- **The proof — show the work:** the scoring rubric, a real signal + draft pair, the cost math, the link to GitHub.
- **The dashboard URL itself.** Anyone can click and see today's prospects. This is the asset.
- **What you learned:** 2-3 specific things. "Hand-grading 50 tweets was higher-leverage than 3 rounds of prompt tuning." "Cron-driven scanning at 06:00 UTC means I wake up to 30 prospects ranked by intent."

### 11.3 What NOT to include

- "Game-changer" / "transform" / hype language
- Comparisons to billion-dollar tools
- Hiding the messy middle. The audience wants to see iteration.

### 11.4 Demo video script (rough, 75s)

- 0:00 — Wordmark, "Moonbeam — find signals in the noise"
- 0:05 — Cursor lands on the live URL. Dashboard fades in. Today's prospects, 42 found.
- 0:15 — Camera scrolls down past Bright section. 5 cards visible.
- 0:20 — Click into one. Tweet text + score + match explanation visible.
- 0:30 — Click "Copy reply." Toast: "Copied to clipboard."
- 0:35 — Cut to X compose box, reply pasted in.
- 0:45 — Cut back to Moonbeam, scroll past Clear and Faint sections.
- 0:55 — Scroll to bottom, click "▸ Show 10 low-fit signals."
- 1:05 — End card: "Live URL + source on GitHub. Built in one weekend."

---

## 12. Companion files

- `intent-scoring-rubric.md` — Authoritative scoring + drafting prompts, hand-graded calibration history
- `moonbeam-test-harness/` — Standalone Node test harness for periodic rubric re-tuning
- `scraper-1` through `scraper-7` JSONs — Reference query patterns for other verticals (kept for future reference, not used in v1.6)

---

## 13. Future versions (deliberately not in v1.6)

- **v1.7** — UI for editing scan_config (currently SQL-only)
- **v1.8** — Multi-product support (re-introduce the inference flow, multi-tenant schema)
- **v1.9** — Email digest with the day's top 3 prospects
- **v2.0** — Native posting to X (after ToS clarity + auth flow)

### Stability pass (before launch)
- Add error capture for drafting failures: write a draft_error field to signals when an LLM draft call fails so we can see what went wrong. Currently 5 of 106 high-tier signals from the first production run had no draft and no error captured.
- Add retry logic for transient LLM and network failures during scoring or drafting (e.g., one retry with backoff for HTTP 5xx, rate limits, network timeouts).
- Add an admin action ("Rerun drafting for failed signals") to retry drafting on signals that have draft_error set or that should have a draft but don't.
- The runScan failure handler added in Phase 3 only catches top-level scan crashes — it doesn't capture per-tweet errors during scoring or drafting. Extend it.
- **Vercel Limits**: The runScan('manual') call and the daily cron scan are synchronous and take 60-90 seconds. To support this on Vercel Pro, set `export const maxDuration = 300;` on the scan route/action and cron route.
