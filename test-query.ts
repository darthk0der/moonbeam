import { db } from './db';
import { scans, signals } from './db/schema';
import { desc, eq } from 'drizzle-orm';

async function main() {
  const recentScans = await db.select().from(scans).orderBy(desc(scans.startedAt)).limit(5);
  console.log("Recent scans:");
  console.log(recentScans.map(s => ({ 
    id: s.id, 
    status: s.status, 
    rawResultsCount: s.rawResultsCount, 
    scoredResultsCount: s.scoredResultsCount, 
    startedAt: s.startedAt,
    errorMessage: s.errorMessage
  })));

  if (recentScans.length > 0) {
    const latestScan = recentScans[0];
    const latestSignals = await db.select().from(signals).where(eq(signals.scanId, latestScan.id));
    console.log(`Signals from latest scan (${latestScan.id}): ${latestSignals.length}`);
    if (latestSignals.length > 0) {
       console.log("Signal tiers:", latestSignals.map(s => s.tier));
       console.log("Disqualified:", latestSignals.filter(s => s.autoDisqualified).length);
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
