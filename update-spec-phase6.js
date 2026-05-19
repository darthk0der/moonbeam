const fs = require('fs');
let spec = fs.readFileSync('SPEC.md', 'utf8');

// 1. Section 1: "Vercel Hobby" -> "Vercel Pro"
spec = spec.replace('Vercel Hobby', 'Vercel Pro');
spec = spec.replace('Vercel (Hobby)', 'Vercel (Pro)'); // just in case

// 2. Section 8: Cost Projections
spec = spec.replace('- **Hosting:** $0/mo (Vercel Hobby)', '- **Hosting:** $20/mo (Vercel Pro)');
spec = spec.replace('**Total ceiling:** ~$95/month', '**Total ceiling:** ~$115/month');

// 3. Replace Section 9
const sec9TargetRegex = /## 9\. Build plan and status[\s\S]*?(?=## 10|$)/;
const sec9Replace = `## 9. Build plan and status

The original v1.6 spec described a 2-day weekend build in 8 hour-blocks. The actual build ran across multiple sessions and the phases evolved. This section reflects reality as of v1.8.

### Completed

- **Phase 1 — Foundation.** Next.js 14, Tailwind, Supabase, Drizzle schema, env scaffold, base UI.
- **Phase 2 — Scan pipeline.** Apify integration, runScan, tweet normalization, scratch JSON.
- **Phase 3 — Scoring + drafting.** Scoring and drafting modules per intent-scoring-rubric.md, wired into runScan, incremental DB inserts, cost tracking, top-level scan failure handling.
- **Phase 4 — Dashboard rendering.** Tiered dashboard reading from the signals table.
- **Phase 4.5 — Visual fidelity.** Full design port from design-reference.html: tokens, card treatments, crescents, gradient, motion.
- **Phase 5 — Operator unlock + admin UI.** Cookie-gated admin via /api/admin/unlock, isAdmin helper, server actions, toast system, admin footer with manual scan.
- **Phase 5.5 — Sticky tier-nav.** Sticky scroll-spy navigation, sort toggle removed.

### Remaining

- **Phase 6 — Stability pass + production-readiness (this phase).** The stability-pass items from section 13, the production scan-timeout fix, and a mobile-responsive check. Detail in section 13 and in the Phase 6 task.
- **Phase 7 — Deploy.** The /api/cron/daily-scan route and vercel.json cron schedule; set the four env vars (CRON_SECRET, SUPER_USER_TOKEN, APIFY_TOKEN, ANTHROPIC_API_KEY) on Vercel; deploy; the footer "About" explainer link; trigger a manual scan to seed the production DB.
- **Launch.** Demo video, LinkedIn post, make the GitHub repo public.

### After launch

Use it daily. Open the dashboard each morning, copy drafts, send. If the prospects feel right, the rubric works; if not, tune intent-scoring-rubric.md and redeploy.

`;
spec = spec.replace(sec9TargetRegex, sec9Replace);

// 4. Section 13: Append timeout bullet to "Stability pass (before launch)"
// Need to find the existing bullet that was added in a previous phase, or just add it at the end of that section
const sec13Regex = /(### Stability pass \(before launch\)[\s\S]*?)(?=### |\n## |$)/;
const timeoutBullet = `\n- The runScan('manual') call and the daily cron scan are synchronous and take 60-90 seconds. To support this on Vercel Pro, set \`export const maxDuration = 300;\` on the scan route/action and cron route.`;

// Replace the previous Vercel Hobby note I added in Phase 5 with the new one
spec = spec.replace(
  /- \*\*Note on Vercel Limits\*\*: `runScan\('manual'\)` is a 60-90s synchronous call. Vercel Hobby has a 60s function timeout limit which will kill the manual scan in production. Address this during the deploy phase \(e.g. use `maxDuration` export or implement async scanning with client polling\)./,
  "- **Vercel Limits**: The runScan('manual') call and the daily cron scan are synchronous and take 60-90 seconds. To support this on Vercel Pro, set `export const maxDuration = 300;` on the scan route/action and cron route."
);

fs.writeFileSync('SPEC.md', spec);
console.log('SPEC.md updated successfully');
