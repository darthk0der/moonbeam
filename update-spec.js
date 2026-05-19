const fs = require('fs');
let spec = fs.readFileSync('SPEC.md', 'utf8');

// 1. Version header
spec = spec.replace(
  '**Version:** 1.6 (REPLAICED-only single-tenant; public read-only dashboard)\n**Audience:** Claude Code, BMAD method\n**Last updated:** 2026-05-08',
  '**Version:** 1.7 (14-day display window; tier legend, sort toggle, bright pulse; Save cut)\n**Audience:** Claude Code, BMAD method\n**Last updated:** 2026-05-17'
);

// 2. Add section 6.0
spec = spec.replace(
  '### 6.1 Color tokens',
  `### 6.0 Dashboard structure and behavior

- **Display window**: The dashboard shows a rolling 14-day window — all signals from the last 14 days across all scans, deduplicated by \`tweet_id\`, grouped into tiers. This is distinct from the per-scan scrape window.
- **Header**: The "moonbeam." wordmark, immediately followed by a product-context line "Finding signal in the noise for: REPLAICED" (REPLAICED hyperlinked to https://replaiced.co), then a summary count.
- **Tier legend**: Rendered near the top in the control bar: Bright (80-100, strongest intent), Clear (60-79, solid signal), Faint (40-59, weaker, worth a look), Hidden (0-39, low-fit, collapsed) — each with an indicator dot, name, range, and a one-line description.
- **Sort toggle**: Two options in the control bar: Strength (sort by \`total_score\` desc) and Recent (sort by \`tweet_posted_at\` desc). Sorts STRICTLY WITHIN tiers only — it never flattens the tier grouping. Default is Strength.

### 6.1 Color tokens`
);

// 3. Section 5.1 note
spec = spec.replace(
  "The scan is synchronous and may take 60-90 seconds. For the manual button: show a \"Scanning…\" loading state on the dashboard, auto-refresh when complete. For the cron job: just write to DB; the next page load picks it up.",
  "The scan is synchronous and may take 60-90 seconds. For the manual button: show a \"Scanning…\" loading state on the dashboard, auto-refresh when complete. For the cron job: just write to DB; the next page load picks it up.\n\n*Note on windows: The `since:` filter is the SCRAPE window (7 days — how far back Apify looks per scan). This is distinctly different from the DISPLAY window (14 days — what the dashboard aggregates as defined in section 6.0). Do not conflate them.*"
);

// 4. Section 5.4 rewrite
spec = spec.replace(
  `### 5.4 The "mark irrelevant" interaction

When the operator marks a signal as irrelevant:
1. Set \`user_marked_irrelevant = true\`
2. Hide the row from default dashboard view (still queryable, e.g. for a future "view all" admin page)

No keyword learning loop in v1.6. Add it later if you find yourself marking the same author or pattern repeatedly.`,
  `### 5.4 The "mark irrelevant" interaction

This is an operator-only action. When clicked, the UI should use optimistic UI to immediately hide the card from view (it disappears on click without waiting for a reload). In the background, it sets \`user_marked_irrelevant = true\`.

*Note: There is no "Save" action in v1.7. It was cut because it didn't lead anywhere useful in the workflow. The \`user_saved\` column remains in the schema but is unused and can be dropped in a future cleanup.*`
);

// 5. Section 6.2 additions
spec = spec.replace(
  '- **Match Callout**: Uses a `--beam` left border and `--beam-dim` background.',
  `- **Match Callout**: Uses a \`--beam\` left border and \`--beam-dim\` background.
- **Bright Pulse Animation**: A continuous \`brightPulse\` animation on Bright cards (5s cycle, ease-in-out, infinite) where the box-shadow glow swells and recedes. Multiple Bright cards must be staggered out of phase. The pulse pauses on hover, and the animation must be wrapped in \`prefers-reduced-motion\`.
- **Footer**: Text is "Built by Andre Llewellyn" (hyperlinked to https://www.linkedin.com/in/andre-llewellyn-b69a294/) on the left, and "Powering REPLAICED outreach" on the right.`
);

// 6. Section 6.7 update
spec = spec.replace(
  `- All cards render identically to operator view
- Action buttons (Copy, Save, Mark irrelevant) all render and are clickable
- Clicking any action button triggers a toast: **"Sign in to use. This is a public demo."**
- The "Open in X" button still works for visitors (just a deep link, no server action)`,
  `- All cards render identically to operator view.
- Copy buttons and Open-in-X work for everyone (pure client-side, ungated).
- "Mark irrelevant" is the only gated action. Visitors clicking it get the toast: **"Sign in to use. This is a public demo."**`
);

// 7. Section 2.1 Visitors flow
spec = spec.replace(
  `                    [moonbeam logo]

                    Today's prospects
                       42 found

  ─────────  BRIGHT SIGNALS  ─────────                        (5)
  [cards with full draft content — copy buttons clickable]`,
  `                    [moonbeam logo]
                    Finding signal in the noise for: REPLAICED

                    Recent prospects · last 14 days
                       142 found

                    [Legend: Bright | Clear | Faint | Hidden]    [Sort: Strength | Recent]

  ─────────  BRIGHT SIGNALS  ─────────                        (15)
  [cards with full draft content — copy buttons and Open-in-X clickable]`
);
spec = spec.replace(
  `When a visitor clicks any action button (Copy reply, Copy DM, Save, Mark irrelevant, Open in X), they see a toast`,
  `When a visitor clicks a gated action button (Mark irrelevant), they see a toast`
);

// 8. Section 2.2 Operator flow
spec = spec.replace(
  `- Copy reply (puts the drafted reply in clipboard, shows confirmation toast)
- Copy DM (same, for DM)
- Open in X (deep link to the tweet, with reply pre-filled where possible)
- Save (toggles \`user_saved\` flag — saved signals get a small icon)
- Mark irrelevant (sets \`user_marked_irrelevant\`, hides from default view)`,
  `- Copy reply (puts the drafted reply in clipboard, shows confirmation toast)
- Copy DM (same, for DM)
- Open in X (deep link to the tweet, with reply pre-filled where possible)
- Mark irrelevant (sets \`user_marked_irrelevant\`, optimistically hides from default view)`
);

// 9. Section 7 API
spec = spec.replace(
  `async function getDashboardData(): Promise<DashboardData>
//   Returns scored signals grouped by tier, the last scan summary,
//   and a flag indicating whether the requester has the admin cookie.

// Admin-only (cookie-gated; throws 401 if cookie missing)
async function triggerManualScan(): Promise<{ scanId: string }>
async function copyAndAcknowledge(signalId: string, kind: 'reply' | 'dm'): Promise<void>
//   Logs the copy event for analytics; returns the text to clip-side.
//   For visitors, the copy buttons short-circuit before this is called.
async function saveSignal(signalId: string): Promise<void>
async function markIrrelevant(signalId: string): Promise<void>`,
  `async function getDashboardData(sort: 'strength' | 'recent'): Promise<DashboardData>
//   Returns scored signals from the last 14 days grouped by tier, 
//   and a flag indicating whether the requester has the admin cookie.

// Admin-only (cookie-gated; throws 401 if cookie missing)
async function triggerManualScan(): Promise<{ scanId: string }>
async function markIrrelevant(signalId: string): Promise<void>

// Note: Copy and Open-in-X are purely client-side actions and do not use server actions.`
);

fs.writeFileSync('SPEC.md', spec);
console.log('SPEC.md updated');
