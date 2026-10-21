import { aiRouter } from '../ai/router';
import { getNicheTemplate } from '../templates/niche-templates';
import { Lead, PersonalizeInput, PersonalizeResult } from '../types';

export const SYSTEM_PERSONALIZE_PROMPT = `You write short, friendly, honest cold emails for a freelance developer. 
Services: websites, mobile apps, SaaS, backend APIs, chatbots, custom ML automations. 
Given the lead details, company description, and niche pitch angle, write a 90-150 word email with a relevant subject line, one or two specific practical ideas tailored directly to what this company does, and a single call to action for a short 10-minute introductory call. 
Do not invent facts, prices or claims. Match the tone examples.
Every generated email MUST end with the compliance line:
Reply STOP to unsubscribe.

Return strictly valid JSON with no markdown formatting:
{
  "subject": "...",
  "body": "...",
  "reasoning": "...",
  "confidence": 0.95
}`;

export async function generatePersonalizedDraft(input: PersonalizeInput): Promise<PersonalizeResult> {
  const { lead, fewShotExamples = [], customInstruction } = input;
  const template = input.nicheTemplate || getNicheTemplate(lead.niche);

  // Construct prompt context
  let userPrompt = `### Lead Information:
- Name: ${lead.name || 'Business Owner'}
- Business Name: ${lead.businessName || 'Business'}
- Email: ${lead.email}
- Niche: ${template.displayName} (${lead.niche})
- Company Description / What They Do: ${lead.companyDescription || 'Not specified'}
- City/Location: ${lead.city || 'Not specified'}
- Website: ${lead.website || 'Not specified'}
- Notes/Context: ${lead.notes || 'None provided'}
`;

  if (lead.customFields && Object.keys(lead.customFields).length > 0) {
    userPrompt += `- Additional Custom Fields: ${JSON.stringify(lead.customFields)}\n`;
  }

  userPrompt += `\n### Niche Pitch Angle:
${template.pitchAngle}

### Recommended Services to Highlight:
${template.servicesToHighlight.map((s) => `- ${s}`).join('\n')}

### Target Tone:
${template.tone}

### Example High-Performing Email:
${template.exampleEmail}
`;

  if (template.bannedPhrases && template.bannedPhrases.length > 0) {
    userPrompt += `\n### BANNED PHRASES (DO NOT USE ANY OF THESE):
${template.bannedPhrases.map((b) => `- "${b}"`).join('\n')}
`;
  }

  // Inject few-shot learning examples from previously approved drafts
  if (fewShotExamples.length > 0) {
    userPrompt += `\n### Past Approved Decisions For This Niche (Few-Shot Reference):
`;
    fewShotExamples.slice(0, 3).forEach((ex, idx) => {
      userPrompt += `Example #${idx + 1} (${ex.businessName || 'Client'}):
Subject: ${ex.approvedSubject}
Body:
${ex.approvedBody}
---
`;
    });
  }

  if (customInstruction && customInstruction.trim().length > 0) {
    userPrompt += `\n### REVISION / USER REGENERATION INSTRUCTION:
${customInstruction.trim()}
Please adapt the draft to strictly satisfy this user instruction while preserving the core rules.
`;
  }

  userPrompt += `\nPlease generate the personalized outreach email in JSON format.`;

  // Call AI Router
  const response = await aiRouter.generateForTask('personalize', {
    system: SYSTEM_PERSONALIZE_PROMPT,
    prompt: userPrompt,
    json: true,
  });

  // Parse JSON output safely
  let parsed: any;
  try {
    const cleaned = response.text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.warn('[PersonalizeAgent] JSON parse failed, attempting regex extraction:', err);
    const subjectMatch = response.text.match(/"subject":\s*"([^"]+)"/);
    const bodyMatch = response.text.match(/"body":\s*"([^"]+)"/);
    parsed = {
      subject: subjectMatch ? subjectMatch[1] : `Question regarding ${lead.businessName}`,
      body: bodyMatch ? bodyMatch[1].replace(/\\n/g, '\n') : response.text,
      confidence: 0.85,
      reasoning: 'Fallback extracted from response text',
    };
  }

  let finalBody = (parsed.body || '').trim();

  // Ensure compliance opt-out line
  if (!finalBody.toLowerCase().includes('stop to unsubscribe')) {
    finalBody += '\n\nReply STOP to unsubscribe.';
  }

  const wordCount = finalBody.split(/\s+/).filter(Boolean).length;

  return {
    subject: parsed.subject || `Quick question regarding ${lead.businessName}`,
    body: finalBody,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.92,
    reasoning: parsed.reasoning || `Personalized for ${template.displayName} angle`,
    wordCount,
    provider: response.provider,
    model: response.model,
  };
}

export async function batchPersonalizeLeads(
  leads: Lead[],
  options?: {
    customInstruction?: string;
    fewShotExamples?: Record<string, any[]>;
  }
): Promise<Array<{ lead: Lead; result?: PersonalizeResult; error?: string }>> {
  const results: Array<{ lead: Lead; result?: PersonalizeResult; error?: string }> = [];

  for (const lead of leads) {
    try {
      const examples = options?.fewShotExamples?.[lead.niche] || [];
      const result = await generatePersonalizedDraft({
        lead,
        fewShotExamples: examples,
        customInstruction: options?.customInstruction,
      });
      results.push({ lead, result });
    } catch (err: any) {
      console.error(`[PersonalizeBatch] Failed for lead ${lead.id} (${lead.email}):`, err);
      results.push({ lead, error: err.message || 'Generation failed' });
    }
  }

  return results;
}
