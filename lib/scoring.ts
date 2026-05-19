import { withRetry } from './retry';
import Anthropic from '@anthropic-ai/sdk';

export function getTweetAgeLabel(tweetPostedAt?: string | null): string {
  let tweetAgeLabel = 'unknown age';
  if (tweetPostedAt) {
    const posted = new Date(tweetPostedAt);
    if (!isNaN(posted.getTime())) {
      const tweetAgeHours = (Date.now() - posted.getTime()) / (1000 * 60 * 60);
      if (tweetAgeHours < 6) tweetAgeLabel = `${tweetAgeHours.toFixed(1)} hours ago (very fresh)`;
      else if (tweetAgeHours < 24) tweetAgeLabel = `${tweetAgeHours.toFixed(1)} hours ago (today)`;
      else if (tweetAgeHours < 72) tweetAgeLabel = `${(tweetAgeHours / 24).toFixed(1)} days ago (recent)`;
      else if (tweetAgeHours < 168) tweetAgeLabel = `${(tweetAgeHours / 24).toFixed(1)} days ago`;
      else tweetAgeLabel = `${(tweetAgeHours / 24).toFixed(0)} days ago (older)`;
    }
  }
  return tweetAgeLabel;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function scoreTweet(tweet: any, config: any) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const nowReadable = new Date().toUTCString();
  const tweetAgeLabel = getTweetAgeLabel(tweet.tweet_posted_at);

  const systemPrompt = `You are scoring a tweet for intent signal relative to a product.

CONTEXT — TODAY IS ${nowReadable}. ALL DATES IN THIS PROMPT ARE REAL — DO NOT TREAT FUTURE-LOOKING TIMESTAMPS AS ERRORS.

PRODUCT: ${config.productDescription || ''}
PRODUCT NAME: ${config.productName || ''}
ICP: People with these job titles: ${config.icpTitles || ''}.

TWEET:
Author: @${tweet.author_username || ''}
Display name: ${tweet.author_display_name || ''}
Bio: ${tweet.author_bio || ''}
Followers: ${tweet.author_followers || 0}, Following: ${tweet.author_following || 0}
Account age: ${tweet.author_account_age_days || 0} days
Verified: ${tweet.author_verified ? 'true' : 'false'}
Posted: ${tweet.tweet_posted_at || ''}  (this tweet was posted ${tweetAgeLabel})
Engagement: ${tweet.tweet_likes || 0} likes, ${tweet.tweet_replies || 0} replies, ${tweet.tweet_retweets || 0} retweets
Tweet text: "${tweet.tweet_text || ''}"

============================================================
SCORING ALGORITHM — FOLLOW THESE STEPS IN ORDER
============================================================

STEP 1: CHECK FOR SATIRE / GENRE-FICTION
Some tweets are jokes formatted to look like real situations. If the tweet matches a recognizable joke template, treat the layoff/displacement claim as fictional regardless of the literal words.

Strong satire indicators (any one means likely fiction):
  - Follows a known meme template (e.g. "Guy in a Jane Street vest sits down next to me. 'Quick one, optimize this drink order...'", "ChatGPT but for X", "I asked ChatGPT to..." narrative formats)
  - Bio is fandom-only or pure shitposter/humor identity ("shitposter first", "world's most favored sloth", entirely fan-account references) AND the tweet makes a serious-seeming claim
  - Tweet ends with a punchline or absurdist twist
  - Low follower count (<500) with extraordinary claim and bio that doesn't corroborate it

If satire/fiction detected: intent_score = 0, intent_flavor = "none".

STEP 2: CHECK FOR HARD-DISQUALIFYING ANTI-PATTERN
This pattern ALWAYS disqualifies regardless of other signals:

  - Author's primary identity is selling AI-proofing / AI-transformation / AI-consulting services. Bio includes phrases like "I help X become AI-native", "AI consultant", "AI coach", or the tweet is selling a service related to AI displacement. They're competition, not buyers.

If hard-disqualifying anti-pattern: intent_score = 0-1, intent_flavor = "none".

STEP 3: ASSESS WHETHER ANY POSITIVE INTENT FLAVOR APPLIES
Three valid intent flavors:

  (A) PERSONAL ANXIETY — author is personally worried, just got laid off, looking to pivot. First-person language with specifics (role, company, timeline) and bio corroboration.

  (B) ADJACENT ANXIETY — close-network member (spouse, partner, parent, sibling, close friend, or colleagues at same company) is the displaced one. THIS COUNTS EVEN IF THE AUTHOR IS ALSO A BUILDER OR FOUNDER. Personal stake is real regardless of profession.

  (C) DISTRIBUTION POTENTIAL — author has real reach AND is engaging on this exact topic.
      "Real reach" requires AT LEAST ONE of:
        (i) Follower count ≥ 10,000
        (ii) Verified status with follower count ≥ 5,000
        (iii) Public figure / political figure / journalist with confirmed identity in bio
      A few hundred or a few thousand followers is NOT distribution potential.

STEP 4: APPLY SOFT ANTI-PATTERNS (override flavors UNLESS the flavor is genuinely earned)
A "soft" anti-pattern: the person looks like they fit at a glance, but the underlying intent isn't real. These cap intent at 1 UNLESS personal/adjacent stake is clearly genuine OR the distribution-potential threshold from Step 3.C is genuinely met.

Soft anti-patterns:
  - Author is BUILDING / SHIPPING an AI product (bio: "shipping AI X", "building Y", "founder of [AI thing]") AND the tweet uses AI-displacement framing without personal/network stake. Audience-building. Cap at 1.
  - Successful, established professional ($X earned in bio, "top 1%", "1M earned") using ironic humor about AI ("am i cooked lol") with no real underlying event. Cap at 2.
  - Past-tense engagement with competitor product ("I checked my replaceability score on AIVM"). Already engaged elsewhere. Cap at 1.
  - News commentary with no personal angle AND author has no real reach (Step 3.C threshold not met). Cap at 1.

These caps DO NOT apply when:
  - Personal anxiety (3.A) is genuinely present
  - Adjacent anxiety (3.B) is genuinely present (e.g., "my wife was laid off"). Builders with personal stake still qualify.
  - Distribution potential (3.C) genuinely meets the follower threshold.

POST-HAND-GRADING ADJUSTMENT (added v1.5):
For thoughtful knowledge-worker engagement — someone in marketing, dev, finance, etc. commenting substantively on AI displacement without personal panic but WITH context, opinion, or insight — score intent at 2-3, not 1. The default soft-cap is too aggressive on this pattern. Examples that should score 2-3 (not 1): a Web3 marketer reflecting on Coinbase layoffs and what comes next; a tech journalist reporting on Freshworks layoffs to their audience; a marketing lead asking pointed questions about what AI-driven layoffs mean for the industry. These people aren't personally panicking but they're plausibly REPLAICED's audience-of-future-prospects.

============================================================
SCORE THE THREE DIMENSIONS
============================================================

1. INTENT (50% weight): based on the algorithm above
   5 = Strongest. Just laid off (real and corroborated), spouse just laid off, OR major influencer (50K+) actively driving conversation on this topic.
   4 = Active solution-seeking, mid-tier influencer (10-50K) engaging on-topic, or close-network displacement.
   3 = Stated personal anxiety/pain about AI replacement, OR thoughtful knowledge-worker engagement with the topic.
   2 = Curious / aspirational ("wonder if my job is safe"), OR commentary by a knowledge worker without panic.
   1 = Tangential mention without personal angle, OR soft anti-pattern fired without exception.
   0 = Satire/fiction detected, hard anti-pattern fired, sarcasm/joke without underlying stake, bot/spam.

2. RELEVANCE (30% weight): How well does this person match the ICP?
   5 = Bio explicitly matches ICP AND tweet is about right use case
   4 = Bio matches ICP OR tweet content strongly demonstrates ICP fit
   3 = Plausible ICP — no contradictory signals, some positive signals
   2 = Tangential — could be ICP but more likely adjacent
   1 = Wrong ICP — student, hobbyist, competitor employee, journalist
   0 = Bot, anonymous, brand account, or auto-disqualified

   AUTO-DISQUALIFY (set RELEVANCE to 0 AND auto_disqualified = true):
   - Account age < 30 days
   - Following:follower ratio > 20:1
   - Username contains randomized digits (e.g. user_8847291)
   - Bio contains "DM for promo", "crypto signals", "OnlyFans"
   - Brand/company account (not an individual)

3. RECENCY (20% weight): based on the AGE LABEL above. Don't interpret raw timestamp — use age label.
   5 = "very fresh" (<6 hours) AND tweet has any replies
   4 = "very fresh" without replies, OR "today" (6-24 hours) with engagement
   3 = "today" without engagement, OR "recent" (1-3 days)
   2 = 3-7 days old
   1 = 7-30 days old
   0 = >30 days old
   Boost +1 if tweet has 5+ replies (cap at 5).
   NOTE: Low engagement on a recent tweet is NOT a strong negative — we're finding individual prospects, not riding viral moments.

============================================================
OUTPUT
============================================================

The MATCH_EXPLANATION is what the user sees in their dashboard. Make it specific and actionable.
GOOD: "Software engineer at a Series B startup who tweeted about being scared their team will be next after watching the Coinbase layoffs."
BAD: "User shows concern about AI displacement."

Return ONLY a JSON object, no preamble, no markdown fences:
{
  "intent_score": <0-5>,
  "intent_reason": "<one sentence — name which step of the algorithm applied>",
  "intent_flavor": "personal" | "adjacent" | "distribution" | "none",
  "relevance_score": <0-5>,
  "relevance_reason": "<one sentence>",
  "recency_score": <0-5>,
  "recency_reason": "<one sentence>",
  "auto_disqualified": <true|false>,
  "disqualification_reason": "<if disqualified, why; otherwise empty string>",
  "match_explanation": "<one sentence — specific, mentioning details from bio and tweet>"
}`;

  const response = await withRetry(() => anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: 'Please score the tweet based on the provided instructions. Return ONLY valid JSON.',
      },
    ],
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any = {};
  const content = response.content[0].type === 'text' ? response.content[0].text : '';
  try {
    const rawJsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
    parsed = JSON.parse(rawJsonStr);
  } catch (e) {
    console.error('Failed to parse scoring JSON', content);
    throw e;
  }
  
  const total_score = (parsed.intent_score * 10) + (parsed.relevance_score * 6) + (parsed.recency_score * 4);
  let tier = 'hidden';
  if (total_score >= 80) tier = 'bright';
  else if (total_score >= 60) tier = 'clear';
  else if (total_score >= 40) tier = 'faint';

  return {
    ...parsed,
    total_score,
    tier
  };
}
