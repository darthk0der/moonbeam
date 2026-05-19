# Moonbeam Intent Scoring Rubric

**Version:** 1.5 (post-hand-grading, May 2026)
**Hand-graded precision:** 72% strict / 83% lenient (n=50, REPLAICED)

This file is the authoritative source for Moonbeam's scoring and drafting prompts. The production app uses these prompts verbatim.

---

## Architecture

Each scraped tweet is scored on three dimensions, summed to a 0-100 total:

| Dimension | Weight | Range |
|-----------|--------|-------|
| Intent | 50% | 0-5 → 0-50 |
| Relevance | 30% | 0-5 → 0-30 |
| Recency | 20% | 0-5 → 0-20 |

Total maps to one of four UI tiers:

| Tier | Score | Display |
|------|-------|---------|
| Bright | 80-100 | Top of feed, full visual emphasis |
| Clear | 60-79 | Standard cards |
| Faint | 40-59 | Smaller, dimmed, "lower priority" label |
| Hidden | 0-39 | Collapsed at bottom, expandable |

Auto-disqualified tweets (bots, brand accounts) don't appear in any tier.

---

## The scoring prompt (production-ready)

The prompt is constructed in code so the current date can be injected (LLMs hallucinate dates past their training cutoff). The `tweetAgeLabel` is computed in JavaScript before sending — never trust the LLM with raw timestamp arithmetic.

```
You are scoring a tweet for intent signal relative to a product.

CONTEXT — TODAY IS {nowReadable}. ALL DATES IN THIS PROMPT ARE REAL — DO NOT TREAT FUTURE-LOOKING TIMESTAMPS AS ERRORS.

PRODUCT: {product_description}
PRODUCT NAME: {product_name}
ICP: People with these job titles: {icp_titles}.

TWEET:
Author: @{username}
Display name: {display_name}
Bio: {author_bio}
Followers: {followers}, Following: {following}
Account age: {account_age_days} days
Verified: {is_verified}
Posted: {posted_at}  (this tweet was posted {tweetAgeLabel})
Engagement: {likes} likes, {replies} replies, {retweets} retweets
Tweet text: "{tweet_text}"

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
}
```

---

## How to compute the tweet age label

This must happen in JavaScript before the prompt is constructed. LLMs cannot reliably reason about dates past their training cutoff.

```javascript
const nowReadable = new Date().toUTCString();
let tweetAgeLabel = 'unknown age';
if (tweet.tweet_posted_at) {
  const posted = new Date(tweet.tweet_posted_at);
  if (!isNaN(posted)) {
    const tweetAgeHours = (Date.now() - posted.getTime()) / (1000 * 60 * 60);
    if (tweetAgeHours < 6) tweetAgeLabel = `${tweetAgeHours.toFixed(1)} hours ago (very fresh)`;
    else if (tweetAgeHours < 24) tweetAgeLabel = `${tweetAgeHours.toFixed(1)} hours ago (today)`;
    else if (tweetAgeHours < 72) tweetAgeLabel = `${(tweetAgeHours / 24).toFixed(1)} days ago (recent)`;
    else if (tweetAgeHours < 168) tweetAgeLabel = `${(tweetAgeHours / 24).toFixed(1)} days ago`;
    else tweetAgeLabel = `${(tweetAgeHours / 24).toFixed(0)} days ago (older)`;
  }
}
```

---

## Drafting prompts

Drafting runs only for tweets in Bright, Clear, or Faint tiers (score ≥40). Suppressed tweets don't get drafts.

### Standard drafting prompt (B2B verticals 1-5)

```
PRODUCT: {product_summary}
PRODUCT URL: {product_url}
TWEET FROM @{username}: "{tweet_text}"
AUTHOR CONTEXT: {author_bio}, {follower_count} followers
WHY THIS MATCHED: {match_explanation}

Draft TWO things in JSON:

1. "reply": A public Twitter reply (max 240 chars). Style guide:
   - Casual, lowercase-friendly, sounds like a peer not a salesperson
   - Lead with addressing what they said, not pitching
   - Mention the product naturally, only if it fits
   - No hashtags
   - No emojis unless the original tweet has them
   - No "Hey there!" / "Hi @username" formal openers — start with substance
   - End with low-pressure language ("happy to share what we learned" > "want a demo?")
   - Better to NOT mention the product than to force-fit it

2. "dm": A direct message (max 600 chars). Style:
   - More substantive than the reply
   - Reference something specific from their tweet
   - One short sentence on what the product is
   - End with a small ask — link to a relevant resource, NOT a calendar booking
   - Sign off with first name only (use placeholder {SENDER_NAME})

Return JSON: { "reply": "...", "dm": "..." }
```

### REPLAICED-specific drafting prompt (empathy-led, no sales energy)

```
PRODUCT: REPLAICED — a tool that scores how at-risk your job is from AI replacement, suggests skills to learn to stay ahead, and recommends potential career pivots based on your resume.

TWEET FROM @{username}: "{tweet_text}"
AUTHOR CONTEXT: {author_bio}
WHY THIS MATCHED: {match_explanation}

The person who posted this tweet is likely scared, anxious, or grieving a sense of professional security. A pitchy or opportunistic reply will read as predatory and damage the brand. Your drafts must lead with empathy and treat the person as a human first, prospect second.

Draft TWO things in JSON:

1. "reply": A public Twitter reply (max 240 chars). Rules:
   - START with empathy or normalization, never with the product
   - Acknowledge that the worry is real and shared by many
   - ONLY mention REPLAICED in the second half, framed as "if it helps" or "I built/found a small tool that"
   - Avoid words: "game-changer", "solution", "transform", "unlock"
   - No exclamation marks
   - No hashtags or emojis
   - If the tweet is about being laid off, do NOT mention the product at all in the public reply — just offer support, then save the product mention for the DM only

2. "dm": A direct message (max 600 chars). Rules:
   - Open with empathy. One sentence, max.
   - Briefly explain what REPLAICED does — focus on the *learning + pivot* angle, not the *risk score* (the risk score can feel alarming)
   - Frame it as "might give you a clearer picture" not "the answer to your problem"
   - Include the URL: {product_url}
   - End with: "no pressure, totally free to try" or similar
   - Sign with first name only — placeholder {SENDER_NAME}

Return JSON: { "reply": "...", "dm": "..." }

Examples of TONE for reference:

Bad reply (too salesy):
"AI displacement is real! I built REPLAICED to give you an instant risk score and pivot recommendations. DM me to try it free!"

Good reply (empathetic):
"this fear is so common right now and it doesn't get talked about enough. for what it's worth, the people I see weathering this best are the ones quietly upskilling rather than panic-pivoting. I built a small thing that helps map that out if it's useful — happy to share."

Bad DM (transactional):
"Hey! Saw your tweet about AI replacing your job. REPLAICED scores your replacement risk and suggests skills to learn. Try it: replaiced.co"

Good DM (human):
"saw your tweet — wanted to say it's a totally rational worry and you're not alone in it. I built a small tool called REPLAICED that takes a resume and maps out which skills would most insulate someone in your role, plus pivot directions if you want them. it's free, takes 2 minutes, no signup gate. {product_url}. no pressure either way. — {SENDER_NAME}"
```

---

## Calibration history

- **Run 1 (initial rubric):** Surface rate 2%. Date bug suppressed nearly all tweets. Mean score 22.
- **Run 2 (added 3-flavor intent):** Surface rate 38%. Overcorrected — 77% disagree rate from adversarial grader. Scorer was rubber-stamping any account with followers as "distribution."
- **Run 3 (algorithm restructured into ordered steps):** Surface rate 29%, AI-grader disagree 48%.
- **Run 4 (hand-graded 50 tweets):** 72% strict precision / 83% lenient. False positives were brand/podcast accounts and abstract policy commentary; false negatives were thoughtful knowledge-worker engagement scoring 40-59.
- **v1.5 adjustment baked in above:** loosen the soft-cap for thoughtful knowledge-worker engagement. The brand/media-account hard rule was deliberately NOT added — too rare to be worth the complexity for a personal-tool prototype.
