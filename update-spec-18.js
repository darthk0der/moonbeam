const fs = require('fs');
let spec = fs.readFileSync('SPEC.md', 'utf8');

// 1. Version header
spec = spec.replace(
  '**Version:** 1.7 (14-day display window; tier legend, sort toggle, bright pulse; Save cut)\n**Audience:** Claude Code, BMAD method\n**Last updated:** 2026-05-17',
  '**Version:** 1.8 (Sticky tier-nav with scroll-spy; sort toggle removed)\n**Audience:** Claude Code, BMAD method\n**Last updated:** 2026-05-19'
);

// 2. Section 6.0
const sec6Target = `- **Tier legend**: Rendered near the top in the control bar: Bright (80-100, strongest intent), Clear (60-79, solid signal), Faint (40-59, weaker, worth a look), Hidden (0-39, low-fit, collapsed) — each with an indicator dot, name, range, and a one-line description.
- **Sort toggle**: Two options in the control bar: Strength (sort by \`total_score\` desc) and Recent (sort by \`tweet_posted_at\` desc). Sorts STRICTLY WITHIN tiers only — it never flattens the tier grouping. Default is Strength.`;

const sec6Replace = `- **Sticky tier-nav (scroll-spy)**: The tier legend serves as a sticky navigation bar pinned to the top of the viewport on scroll. It uses a frosted-glass background. Each item in the legend is a smooth-scrolling jump-link to its respective tier section. An IntersectionObserver (scroll-spy) live-updates the active legend item based on which tier section is currently in view. Tier sections use \`scroll-margin-top\` so their headings clear the pinned nav.
- **Sort**: Signals are always ordered by \`total_score\` descending within each tier. There is no sort control in the UI. (Note: an earlier v1.7 draft included a sort toggle which has since been removed to simplify the interface).`;

spec = spec.replace(sec6Target, sec6Replace);

// 3. Section 2.1 Mockup
spec = spec.replace(
  '[Legend: Bright | Clear | Faint | Hidden]    [Sort: Strength | Recent]',
  '[Sticky Nav Legend: Bright | Clear | Faint | Hidden]'
);

// 4. Section 7 API
spec = spec.replace(
  `async function getDashboardData(sort: 'strength' | 'recent'): Promise<DashboardData>`,
  `async function getDashboardData(): Promise<DashboardData>`
);

fs.writeFileSync('SPEC.md', spec);
console.log('SPEC.md updated to v1.8');
