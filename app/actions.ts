'use server';


import { isAdmin } from '@/lib/auth';
import { db } from '@/db';
import { signals } from '@/db/schema';
import { eq, isNotNull, or, inArray, isNull, and } from 'drizzle-orm';
import { runScan } from '@/lib/scan';
import { draftReply } from '@/lib/drafting';

export async function triggerManualScan() {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }
  
  const scanId = await runScan('manual');
  return { scanId };
}

export async function markIrrelevant(signalId: string) {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }
  
  await db.update(signals)
    .set({ userMarkedIrrelevant: true })
    .where(eq(signals.id, signalId));
}



export async function retryFailedDrafts() {
  if (!(await isAdmin())) {
    throw new Error('Unauthorized');
  }

  const config = await db.query.scanConfig.findFirst();
  if (!config) throw new Error('No config');

  const failedSignals = await db.select().from(signals).where(
    or(
      isNotNull(signals.draftError),
      and(
        inArray(signals.tier, ['bright', 'clear', 'faint']),
        isNull(signals.draftReply)
      )
    )
  );

  let successCount = 0;
  for (const signal of failedSignals) {
    if (!signal.matchExplanation) continue;
    try {
      const tweet = {
        author_username: signal.authorUsername,
        tweet_text: signal.tweetText,
        author_bio: signal.authorBio || '',
      };
      const draft = await draftReply(tweet, config, signal.matchExplanation);
      
      await db.update(signals).set({
        draftReply: draft?.reply || null,
        draftDm: draft?.dm || null,
        draftError: null
      }).where(eq(signals.id, signal.id));
      
      successCount++;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err: any) {
      await db.update(signals).set({
        draftError: err?.message || String(err)
      }).where(eq(signals.id, signal.id));
    }
  }
  
  return { attempted: failedSignals.length, success: successCount };
}
