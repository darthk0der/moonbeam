import { db } from './db';
import { scanConfig } from './db/schema';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  await db.insert(scanConfig).values({
    id: 1,
    searchQueries: [
      '("will AI replace my" OR "worried AI will" OR "scared AI will" OR "afraid of being replaced") (job OR career OR role OR work) -is:retweet -filter:replies lang:en min_faves:1 -"hot take" -"prediction"',
      '("how do I AI-proof" OR "future-proof my career" OR "AI proof my") -is:retweet -filter:replies lang:en min_faves:1',
      '("thinking about a career change" OR "considering a pivot" OR "need to switch careers") (AI OR automation OR "job market") -is:retweet -filter:replies lang:en min_faves:1',
      '("laid off" OR "got laid off" OR "lost my job") (AI OR automation OR "replaced by") -is:retweet -filter:replies lang:en min_faves:1',
      '("am I cooked" OR "is my job safe" OR "is my career safe") (AI OR ChatGPT OR Claude OR automation) -is:retweet -filter:replies lang:en min_faves:1'
    ]
  }).onConflictDoNothing();
  console.log("Seeded successfully");
  process.exit(0);
}

main();
