import { Lead, LeadNiche } from '../types';
import { aiRouter } from '../ai/router';
import { inferNiche } from '../csv/parse';

export interface EnrichmentResult {
  enrichedLead: Omit<Lead, 'id' | 'createdAt' | 'status' | 'followUpCount'>;
  wasEnriched: boolean;
  enrichedFields: string[];
  summary: string;
}

export const SYSTEM_ENRICHMENT_PROMPT = `You are a data validation and enrichment agent for B2B outreach.
Your task is to inspect a lead row from a CSV and safely fill missing fields that CAN be inferred.
Allowed Niches:
- "club": sports club, gym, fitness center, community, association
- "creator": YouTuber, podcaster, influencer, educator, author
- "shop": boutique, retail store, restaurant, cafe, ecommerce
- "clinic": dental clinic, dermatology, medical practice, therapist
- "other": software company, consulting, B2B services, agency

Rules:
1. PREDICT NICHE: Infer the most accurate niche among [club, creator, shop, clinic, other] from the business name, website, and context.
2. CONTEXT NOTES: If notes are missing, formulate one realistic operational pain point or tech opportunity (e.g., "Needs automated booking and renewal reminders").
3. BUSINESS NAME: If business name is missing, infer a clean name from the email domain or website.
4. STRICT SAFETY: NEVER invent or hallucinate contact details (email, phone number, private address). Keep existing email intact.

Return strictly JSON:
{
  "niche": "club | creator | shop | clinic | other",
  "businessName": "clean company name",
  "name": "contact name or 'Business Owner'",
  "notes": "one-line operational context"
}`;

/**
 * Inspects lead rows from a CSV, predicting missing niches and auto-filling safe operational fields
 */
export async function inspectAndEnrichLead(
  lead: Omit<Lead, 'id' | 'createdAt' | 'status' | 'followUpCount'>
): Promise<EnrichmentResult> {
  const enrichedFields: string[] = [];
  const modified = { ...lead };

  // 1. Check if niche needs AI prediction
  const needsNichePrediction = !lead.niche || lead.niche === 'other';

  // 2. Check if notes / pain points are missing
  const needsNotes = !lead.notes || lead.notes.trim().length === 0;

  // 3. Check if business name is missing or generic
  const needsBusinessName =
    !lead.businessName ||
    lead.businessName.toLowerCase() === 'business owner' ||
    lead.businessName.toLowerCase() === 'company';

  // If nothing requires enrichment, return early
  if (!needsNichePrediction && !needsNotes && !needsBusinessName) {
    return {
      enrichedLead: lead,
      wasEnriched: false,
      enrichedFields: [],
      summary: 'Row complete, no fields required enrichment.',
    };
  }

  try {
    const prompt = `Inspect this lead:
- Email: ${lead.email}
- Name: ${lead.name}
- Business Name: ${lead.businessName || 'Missing'}
- Website: ${lead.website || 'None'}
- Current Niche: ${lead.niche || 'Unknown'}
- Company Description: ${lead.companyDescription || 'None'}
- Current Notes: ${lead.notes || 'None'}

Predict niche and provide operational context notes without inventing private contact details.`;

    const res = await aiRouter.generateForTask('niche_inference', {
      system: SYSTEM_ENRICHMENT_PROMPT,
      prompt,
      json: true,
    });

    const cleaned = res.text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    const parsed = JSON.parse(cleaned);

    // Apply predicted niche
    if (needsNichePrediction && parsed.niche && ['club', 'creator', 'shop', 'clinic', 'other'].includes(parsed.niche)) {
      modified.niche = parsed.niche as LeadNiche;
      enrichedFields.push('niche');
    } else if (needsNichePrediction) {
      modified.niche = inferNiche(`${lead.businessName || ''} ${lead.website || ''} ${lead.email}`);
      if (modified.niche !== 'other') {
        enrichedFields.push('niche');
      }
    }

    // Apply auto-generated operational notes
    if (needsNotes && parsed.notes) {
      modified.notes = parsed.notes;
      enrichedFields.push('notes');
    }

    // Apply cleaned business name if it was missing
    if (needsBusinessName && parsed.businessName) {
      modified.businessName = parsed.businessName;
      enrichedFields.push('businessName');
    }

  } catch (err) {
    // Fallback heuristic inference if AI fails
    if (needsNichePrediction) {
      const fallbackNiche = inferNiche(`${lead.businessName || ''} ${lead.website || ''} ${lead.email}`);
      if (fallbackNiche !== 'other') {
        modified.niche = fallbackNiche;
        enrichedFields.push('niche');
      }
    }

    if (needsNotes) {
      if (modified.niche === 'clinic') {
        modified.notes = 'Automated appointment scheduling & patient reminder workflow.';
        enrichedFields.push('notes');
      } else if (modified.niche === 'club') {
        modified.notes = 'Member registration portal, recurring fee tracking & digital check-in.';
        enrichedFields.push('notes');
      } else if (modified.niche === 'creator') {
        modified.notes = 'Custom owned community portal & member course access platform.';
        enrichedFields.push('notes');
      } else if (modified.niche === 'shop') {
        modified.notes = 'Digital catalog storefront & automated checkout reminders.';
        enrichedFields.push('notes');
      }
    }
  }

  const wasEnriched = enrichedFields.length > 0;
  const summary = wasEnriched
    ? `AI Auto-Filled: ${enrichedFields.join(', ')}`
    : 'No changes';

  if (wasEnriched) {
    modified.aiEnriched = true;
    modified.enrichedFields = enrichedFields;
    modified.enrichmentSummary = summary;
  }

  return {
    enrichedLead: modified,
    wasEnriched,
    enrichedFields,
    summary,
  };
}

/**
 * Batch processes an array of parsed leads with AI validation and auto-enrichment
 */
export async function enrichLeadsBatch(
  leads: Array<Omit<Lead, 'id' | 'createdAt' | 'status' | 'followUpCount'>>
): Promise<{
  enrichedLeads: Array<Omit<Lead, 'id' | 'createdAt' | 'status' | 'followUpCount'>>;
  enrichedCount: number;
  enrichmentDetails: Array<{ row: number; email: string; fields: string[]; summary: string }>;
}> {
  const enrichedLeads: Array<Omit<Lead, 'id' | 'createdAt' | 'status' | 'followUpCount'>> = [];
  const enrichmentDetails: Array<{ row: number; email: string; fields: string[]; summary: string }> = [];
  let enrichedCount = 0;

  for (let i = 0; i < leads.length; i++) {
    const original = leads[i];
    const res = await inspectAndEnrichLead(original);

    enrichedLeads.push(res.enrichedLead);
    if (res.wasEnriched) {
      enrichedCount++;
      enrichmentDetails.push({
        row: i + 1,
        email: original.email,
        fields: res.enrichedFields,
        summary: res.summary,
      });
    }
  }

  return {
    enrichedLeads,
    enrichedCount,
    enrichmentDetails,
  };
}
