import { db } from '../db';
import { scans, signals } from '../db/schema';
import { desc, eq, and, gt, ne } from 'drizzle-orm';
import { TierSection } from '../components/TierSection';
import { isAdmin } from '@/lib/auth';
import { AdminFooter } from '@/components/AdminFooter';
import { StickyNav } from '../components/StickyNav';

export const maxDuration = 300;

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
  
  let lastScanText = '';
  if (admin) {
    const latestScans = await db.select()
      .from(scans)
      .where(eq(scans.status, 'completed'))
      .orderBy(desc(scans.startedAt))
      .limit(1);
    if (latestScans.length > 0) {
      const ms = new Date().getTime() - new Date(latestScans[0].startedAt).getTime();
      const hours = Math.round(ms / (1000 * 60 * 60));
      lastScanText = `${hours}h ago`;
    }
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

      {admin ? (
        <AdminFooter lastScanText={lastScanText} />
      ) : (
        <footer style={{ textAlign: 'center', marginTop: '60px', paddingBottom: '40px', color: 'var(--text-tertiary)' }}>
          <p style={{ fontStyle: 'italic', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
            Moonbeam is a live prospecting tool that scrapes Twitter daily for people expressing anxiety about AI job replacement. It scores their intent and drafts personalized replies for REPLAICED. Built with Claude Code in one weekend. <a href="https://github.com/AndrellL/moonbeam" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Source on GitHub</a>.
          </p>
        </footer>
      )}
    </main>
  );
}
