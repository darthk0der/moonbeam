import Anthropic from '@anthropic-ai/sdk';

import { withRetry } from './retry';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function draftReply(tweet: any, config: any, match_explanation: string) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const SENDER_NAME = "Andre";

  const systemPrompt = `PRODUCT: REPLAICED — a tool that scores how at-risk your job is from AI replacement, suggests skills to learn to stay ahead, and recommends potential career pivots based on your resume.

TWEET FROM @${tweet.author_username || ''}: "${tweet.tweet_text || ''}"
AUTHOR CONTEXT: ${tweet.author_bio || ''}
WHY THIS MATCHED: ${match_explanation}

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
   - Include the URL: ${config.productUrl || 'replaiced.co'}
   - End with: "no pressure, totally free to try" or similar
   - Sign with first name only — placeholder ${SENDER_NAME}

Return JSON: { "reply": "...", "dm": "..." }

Examples of TONE for reference:

Bad reply (too salesy):
"AI displacement is real! I built REPLAICED to give you an instant risk score and pivot recommendations. DM me to try it free!"

Good reply (empathetic):
"this fear is so common right now and it doesn't get talked about enough. for what it's worth, the people I see weathering this best are the ones quietly upskilling rather than panic-pivoting. I built a small thing that helps map that out if it's useful — happy to share."

Bad DM (transactional):
"Hey! Saw your tweet about AI replacing your job. REPLAICED scores your replacement risk and suggests skills to learn. Try it: replaiced.co"

Good DM (human):
"saw your tweet — wanted to say it's a totally rational worry and you're not alone in it. I built a small tool called REPLAICED that takes a resume and maps out which skills would most insulate someone in your role, plus pivot directions if you want them. it's free, takes 2 minutes, no signup gate. ${config.productUrl || 'replaiced.co'}. no pressure either way. — ${SENDER_NAME}"`;

  const response = await withRetry(() => anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: 'Please draft the reply and DM based on the instructions. Return ONLY valid JSON.',
      },
    ],
  }));

  const content = response.content[0].type === 'text' ? response.content[0].text : '';
  try {
    const rawJsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
    return JSON.parse(rawJsonStr);
  } catch(e) {
    console.error('Failed to parse drafting JSON', content);
    throw e;
  }
}
