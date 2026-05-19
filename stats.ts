import { db } from './db';
import { scans, signals } from './db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const latestScan = await db.query.scans.findFirst({
    orderBy: [desc(scans.startedAt)],
  });
  
  if (!latestScan) return;
  
  const results = await db.select({
    tier: signals.tier,
    count: sql<number>`count(*)`
  })
  .from(signals)
  .where(eq(signals.scanId, latestScan.id))
  .groupBy(signals.tier);
  
  console.log("Stats for scan:", latestScan.id);
  console.log("Raw Scraped:", latestScan.rawResultsCount);
  console.log("Processed:", latestScan.scoredResultsCount);
  console.log("Cost ($):", latestScan.costCents ? (latestScan.costCents / 100).toFixed(2) : "0.00");
  
  results.forEach(r => console.log(`Tier ${r.tier}: ${r.count}`));
  process.exit(0);
}

main();
