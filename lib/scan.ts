import { ApifyClient } from 'apify-client';
import { db } from '../db';
import { scans, signals } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { scoreTweet } from './scoring';
import { draftReply } from './drafting';

const ACTOR_ID = '61RPP7dywgiy0JPD0'; // apidojo/tweet-scraper

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeTweet(rawTweet: any) {
  const authorCreatedAt = rawTweet.author?.createdAt;
  let accountAgeDays = null;
  if (authorCreatedAt) {
    const created = new Date(authorCreatedAt);
    const now = new Date();
    accountAgeDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    tweet_id: rawTweet.id || rawTweet.tweetId,
    tweet_url: rawTweet.url || `https://twitter.com/${rawTweet.author?.userName}/status/${rawTweet.id}`,
    tweet_text: rawTweet.text || rawTweet.fullText || '',
    tweet_posted_at: rawTweet.createdAt,
    tweet_likes: rawTweet.likeCount || 0,
    tweet_replies: rawTweet.replyCount || 0,
    tweet_retweets: rawTweet.retweetCount || 0,

    author_username: rawTweet.author?.userName || rawTweet.author?.screen_name,
    author_display_name: rawTweet.author?.name,
    author_url: `https://twitter.com/${rawTweet.author?.userName}`,
    author_bio: rawTweet.author?.description || '',
    author_followers: rawTweet.author?.followers || 0,
    author_following: rawTweet.author?.following || 0,
    author_account_age_days: accountAgeDays,
    author_verified: rawTweet.author?.isVerified || rawTweet.author?.isBlueVerified || false,
  };
}

// Chunking helper
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

export async function runScan(triggeredBy: 'cron' | 'manual') {
  console.log(`Starting scan triggered by: ${triggeredBy}`);
  
  const [scanRecord] = await db.insert(scans).values({
    status: 'running',
    triggeredBy,
    startedAt: new Date(),
  }).returning();

  let costCents = 0;

  try {
    const config = await db.query.scanConfig.findFirst();
    if (!config || !config.searchQueries || config.searchQueries.length === 0) {
      throw new Error('No scan configuration or search queries found');
    }

    if (config.scansPaused) {
      console.log('Scans are paused in config. Bailing early.');
      await db.update(scans).set({
        status: 'completed',
        completedAt: new Date(),
        errorMessage: 'Scans paused',
      }).where(eq(scans.id, scanRecord.id));
      return scanRecord.id;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sinceFilter = ` since:${sevenDaysAgo.toISOString().split('T')[0]}`;
    const queriesWithFreshness = config.searchQueries.map((q: string) => q + sinceFilter);

    // Call Apify
    const apifyClient = new ApifyClient({ token: process.env.APIFY_TOKEN });
    const run = await apifyClient.actor(ACTOR_ID).call({
      searchTerms: queriesWithFreshness,
      sort: 'Latest',
      tweetLanguage: 'en',
      maxItems: 300,
      includeSearchTerms: true,
      onlyVerifiedUsers: false,
      onlyTwitterBlue: false,
      onlyImage: false,
      onlyVideo: false,
      onlyQuote: false,
      minimumFavorites: 1,
    });

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    costCents += Math.max(1, Math.ceil(items.length * 0.04)); // Base apify cost
    
    const normalizedTweets = items.map(normalizeTweet).filter(t => t.tweet_id != null);
    console.log(`Normalized ${normalizedTweets.length} valid tweets from Apify.`);

    // Deduping
    const allTweetIds = normalizedTweets.map(t => t.tweet_id).filter(id => id != null);
    const existingIds = new Set<string>();
    
    if (allTweetIds.length > 0) {
      // Chunk DB query just in case there are too many IDs for an IN clause
      const idChunks = chunkArray(allTweetIds, 100);
      for (const chunk of idChunks) {
        const existing = await db.select({ tweetId: signals.tweetId })
          .from(signals)
          .where(inArray(signals.tweetId, chunk));
        for (const row of existing) {
          existingIds.add(row.tweetId);
        }
      }
    }

    const newTweets = normalizedTweets.filter(t => !existingIds.has(t.tweet_id));
    console.log(`Found ${newTweets.length} new tweets after deduplication.`);

    // Scoring & Drafting setup
    let totalInserted = 0;
    
    const tweetChunks = chunkArray(newTweets, 10);
    
    for (const chunk of tweetChunks) {
      console.log(`Processing batch of ${chunk.length} tweets for scoring...`);
      const scoredResults = await Promise.all(chunk.map(async (t) => {
        try {
          const score = await scoreTweet(t, config);
          return { tweet: t, score };
        } catch (err) {
          console.error(`Failed to score tweet ${t.tweet_id}`, err);
          return null;
        }
      }));

      // Calculate cost: $0.003 per scoring call
      costCents += (chunk.length * 0.3);

      // Draft generation for tier >= faint (score >= 40)
      const toDraft = scoredResults.filter(r => r && r.score && r.score.total_score >= 40);
      
      console.log(`Drafting for ${toDraft.length} tweets...`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const drafts = await Promise.all(toDraft.map(async (res: any) => {
        try {
          const draft = await draftReply(res.tweet, config, res.score.match_explanation);
          return { tweetId: res.tweet.tweet_id, draft, error: null };
        }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err: any) {
          console.error(`Failed to draft for tweet ${res.tweet.tweet_id}`, err);
          return { tweetId: res.tweet.tweet_id, draft: null, error: err?.message || String(err) };
        }
      }));

      // Calculate cost: $0.005 per drafting call
      costCents += (toDraft.length * 0.5);

      const scoredSignalsToInsert = [];
      // Map back drafts
      for (const res of scoredResults) {
        if (!res) continue;
        const matchingDraft = drafts.find(d => d && d.tweetId === res.tweet.tweet_id);
        
        scoredSignalsToInsert.push({
          scanId: scanRecord.id,
          tweetId: res.tweet.tweet_id,
          tweetUrl: res.tweet.tweet_url,
          tweetText: res.tweet.tweet_text,
          tweetPostedAt: res.tweet.tweet_posted_at ? new Date(res.tweet.tweet_posted_at) : new Date(),
          authorUsername: res.tweet.author_username,
          authorDisplayName: res.tweet.author_display_name,
          authorUrl: res.tweet.author_url,
          authorFollowers: res.tweet.author_followers,
          
          intentScore: res.score.intent_score,
          intentReason: res.score.intent_reason,
          intentFlavor: res.score.intent_flavor,
          relevanceScore: res.score.relevance_score,
          relevanceReason: res.score.relevance_reason,
          recencyScore: res.score.recency_score,
          recencyReason: res.score.recency_reason,
          
          totalScore: res.score.total_score,
          tier: res.score.tier,
          
          autoDisqualified: res.score.auto_disqualified,
          disqualificationReason: res.score.disqualification_reason || null,
          matchExplanation: res.score.match_explanation || null,

          draftReply: matchingDraft?.draft?.reply || null,
          draftDm: matchingDraft?.draft?.dm || null,
          draftError: matchingDraft?.error || null,
        });
      }
      
      // DB Insertion (Real-time per batch)
      if (scoredSignalsToInsert.length > 0) {
        console.log(`Inserting batch of ${scoredSignalsToInsert.length} signals into DB...`);
        await db.insert(signals).values(scoredSignalsToInsert);
        totalInserted += scoredSignalsToInsert.length;
      }
    }

    await db.update(scans).set({
      status: 'completed',
      completedAt: new Date(),
      rawResultsCount: items.length,
      scoredResultsCount: totalInserted,
      apifyRunId: run.id,
      costCents: Math.ceil(costCents),
    }).where(eq(scans.id, scanRecord.id));

    return scanRecord.id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (error: any) {
    console.error('Scan failed:', error);
    await db.update(scans).set({
      status: 'failed',
      completedAt: new Date(),
      errorMessage: error.message || 'Unknown error',
    }).where(eq(scans.id, scanRecord.id));
    throw error;
  }
}
