import { db } from '../db';
import { scans, signals } from '../db/schema';
import { desc, eq, and, gt, ne } from 'drizzle-orm';
import { TierSection } from '../components/TierSection';
import { isAdmin } from '@/lib/auth';
import { AdminFooter } from '@/components/AdminFooter';
import { StickyNav } from '../components/StickyNav';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export default async function Home() {
  
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const allSignals = await db.select()
    .from(signals)
    .where(
      and(
        gt(signals.createdAt, fourteenDaysAgo),
        eq(signals.autoDisqualified, false),
        ne(signals.userMarkedIrrelevant, true)
      )
    )
    .orderBy(desc(signals.totalScore));

  const admin = await isAdmin();
  
  const latestScans = await db.select()
    .from(scans)
    .where(eq(scans.status, 'completed'))
    .orderBy(desc(scans.startedAt))
    .limit(1);

  let lastScanText = '';
  let globalLastScanText = '';
  
  if (latestScans.length > 0) {
    const scan = latestScans[0];
    const ms = new Date().getTime() - new Date(scan.startedAt).getTime();
    const hours = Math.round(ms / (1000 * 60 * 60));
    lastScanText = `${hours}h ago`;
    
    const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const dateStr = new Date(scan.completedAt || scan.startedAt).toLocaleDateString('en-US', dateOpts);
    const count = scan.scoredResultsCount || 0;
    globalLastScanText = `Last Scan: ${dateStr} (${count} new signals)`;
  }

  const brightSignals = allSignals.filter(s => s.tier === 'bright');
  const clearSignals = allSignals.filter(s => s.tier === 'clear');
  const faintSignals = allSignals.filter(s => s.tier === 'faint');
  const hiddenSignals = allSignals.filter(s => s.tier === 'hidden');
  
  const totalCount = brightSignals.length + clearSignals.length + faintSignals.length;

  return (
    <main>
      <header className="header">
        <h1 className="wordmark">moonbeam<span className="dot">.</span></h1>
        
        <div className="context-line">
          Finding signal in the noise for: <a href="https://replaiced.co" target="_blank" rel="noopener noreferrer">REPLAICED</a>
        </div>

        <p style={{ fontStyle: 'italic', maxWidth: '600px', lineHeight: '1.6', color: 'var(--text-secondary)', marginBottom: '16px', marginTop: '16px' }}>
          Moonbeam is a live prospecting tool that scrapes Twitter daily for people expressing interest or receptivity to a product or service. It automatically scores their intent and drafts personalized replies. Built with Claude Code in one weekend. This demo is showcasing prospects for REPLAICED.
        </p>

        {globalLastScanText && (
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
            {globalLastScanText}
          </div>
        )}

        <div className="summary">
          <div className="summary-count">{totalCount}</div>
          <div className="summary-label">Recent prospects · last 14 days</div>
        </div>
      </header>

      {/* CONTROL BAR: Sticky Nav (legend + scroll-spy) */}
      {totalCount > 0 && <StickyNav />}

      {totalCount === 0 ? (
        <div style={{ marginTop: '80px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: '24px', color: 'var(--text)' }}>No prospects yet.</h2>
          <p style={{ fontFamily: 'var(--sans)', color: 'var(--text-secondary)', marginTop: '16px' }}>We searched but found nothing matching recently. Check back tomorrow.</p>
        </div>
      ) : (
        <>
          <TierSection title="Bright" signals={brightSignals} tier="bright" isAdmin={admin} />
          <TierSection title="Clear" signals={clearSignals} tier="clear" isAdmin={admin} />
          <TierSection title="Faint" signals={faintSignals} tier="faint" isAdmin={admin} />
          <TierSection title="" signals={hiddenSignals} tier="hidden" isAdmin={admin} />
        </>
      )}

      {admin && (
        <AdminFooter lastScanText={lastScanText} />
      )}
    </main>
  );
}
