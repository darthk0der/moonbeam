const fs = require('fs');

let actions = fs.readFileSync('app/actions.ts', 'utf8');

if (!actions.includes('export const maxDuration')) {
  actions = "export const maxDuration = 300;\n\n" + actions;
} else {
  actions = actions.replace(/export const maxDuration = \d+;/, 'export const maxDuration = 300;');
}

const retryAction = `
import { isNotNull, or, inArray, isNull, and } from 'drizzle-orm';
import { draftReply } from '@/lib/drafting';

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
    } catch (err: any) {
      await db.update(signals).set({
        draftError: err?.message || String(err)
      }).where(eq(signals.id, signal.id));
    }
  }
  
  return { attempted: failedSignals.length, success: successCount };
}
`;

if (!actions.includes('retryFailedDrafts')) {
  // we also need to append the imports if they aren't there, but it's easier to just add them at the top.
  actions = actions.replace("import { eq } from 'drizzle-orm';", "import { eq, isNotNull, or, inArray, isNull, and } from 'drizzle-orm';");
  actions = actions.replace("import { runScan } from '@/lib/scan';", "import { runScan } from '@/lib/scan';\nimport { draftReply } from '@/lib/drafting';");
  
  // Actually, the raw string above has imports inside it. Let me strip them from the action body and inject cleanly.
  let cleanAction = retryAction.replace(/import .*\n/g, '');
  actions += "\n" + cleanAction;
}

fs.writeFileSync('app/actions.ts', actions);
console.log('actions.ts updated');
