import { aiRouter } from '../ai/router';
import { ClassificationResult, Lead, ReplyClassificationType } from '../types';

export const SYSTEM_CLASSIFY_PROMPT = `Classify the reply into one of: interested, question, not_interested, unsubscribe, out_of_office, other.
Return strictly valid JSON with no markdown formatting:
{
  "classification": "interested | question | not_interested | unsubscribe | out_of_office | other",
  "sentiment": "positive | neutral | negative",
  "summary": "one concise sentence summarizing prospect reply",
  "needsHuman": false,
  "suggestedAction": "send_reply | schedule_meeting | stop | wait",
  "confidence": 0.95
}

Note: Flag needsHuman = true if the lead asks about custom pricing, fixed quotes, contracts, deadlines, legal matters, or expresses dissatisfaction.`;

export async function classifyInboundReply(opts: {
  replySubject: string;
  replyBody: string;
  lead?: Lead;
  previousOutreach?: string;
}): Promise<ClassificationResult> {
  const { replySubject, replyBody, lead, previousOutreach } = opts;

  // Build evaluation prompt
  let prompt = `### Prospect Reply:
- Subject: ${replySubject}
- Body:
"""
${replyBody}
"""
`;

  if (lead) {
    prompt += `\n### Lead Context:
- Name: ${lead.name}
- Business: ${lead.businessName}
- Niche: ${lead.niche}
`;
  }

  if (previousOutreach) {
    prompt += `\n### Initial Outreach Sent:
"""
${previousOutreach}
"""
`;
  }

  prompt += `\nClassify this reply according to the schema.`;

  try {
    const res = await aiRouter.generateForTask('classify', {
      system: SYSTEM_CLASSIFY_PROMPT,
      prompt,
      json: true,
    });

    const cleaned = res.text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    const validCategories: ReplyClassificationType[] = [
      'interested',
      'question',
      'not_interested',
      'unsubscribe',
      'out_of_office',
      'other',
    ];

    const classification: ReplyClassificationType = validCategories.includes(parsed.classification)
      ? parsed.classification
      : 'other';

    return {
      classification,
      sentiment: parsed.sentiment || (classification === 'interested' ? 'positive' : 'neutral'),
      summary: parsed.summary || 'Prospect replied to outreach thread.',
      needsHuman: Boolean(parsed.needsHuman),
      suggestedAction:
        parsed.suggestedAction ||
        (classification === 'interested'
          ? 'schedule_meeting'
          : classification === 'not_interested' || classification === 'unsubscribe'
          ? 'stop'
          : 'send_reply'),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.92,
    };
  } catch (err: any) {
    console.warn('[ClassifyAgent] AI parsing failed, using rule-based heuristic classification:', err);

    // Robust rule-based fallback
    const lower = (replySubject + ' ' + replyBody).toLowerCase();

    if (
      lower.includes('unsubscribe') ||
      lower.includes('stop') ||
      lower.includes('remove me') ||
      lower.includes('do not contact')
    ) {
      return {
        classification: 'unsubscribe',
        sentiment: 'negative',
        summary: 'Lead requested to be unsubscribed from outreach.',
        needsHuman: false,
        suggestedAction: 'stop',
        confidence: 0.99,
      };
    }

    if (
      lower.includes('out of office') ||
      lower.includes('autoreply') ||
      lower.includes('auto-reply') ||
      lower.includes('away from my desk') ||
      lower.includes('annual leave')
    ) {
      return {
        classification: 'out_of_office',
        sentiment: 'neutral',
        summary: 'Automated out-of-office vacation autoresponder.',
        needsHuman: false,
        suggestedAction: 'wait',
        confidence: 0.98,
      };
    }

    if (
      lower.includes('not interested') ||
      lower.includes('pass') ||
      lower.includes('no thanks') ||
      lower.includes('not looking') ||
      lower.includes('covered')
    ) {
      return {
        classification: 'not_interested',
        sentiment: 'neutral',
        summary: 'Lead politely declined outreach opportunity.',
        needsHuman: false,
        suggestedAction: 'stop',
        confidence: 0.95,
      };
    }

    if (
      lower.includes('interested') ||
      lower.includes('call') ||
      lower.includes('meet') ||
      lower.includes('sounds good') ||
      lower.includes('tuesday') ||
      lower.includes('thursday') ||
      lower.includes('schedule') ||
      lower.includes('send more')
    ) {
      const hasPricing = lower.includes('price') || lower.includes('cost') || lower.includes('rate') || lower.includes('quote');
      return {
        classification: 'interested',
        sentiment: 'positive',
        summary: 'Lead expressed interest in connecting for a discussion.',
        needsHuman: hasPricing,
        suggestedAction: 'schedule_meeting',
        confidence: 0.92,
      };
    }

    return {
      classification: 'question',
      sentiment: 'neutral',
      summary: 'Lead asked for clarification or technical details.',
      needsHuman: lower.includes('pricing') || lower.includes('contract'),
      suggestedAction: 'send_reply',
      confidence: 0.85,
    };
  }
}
