import { Lead } from '../types';

export const AGENTIC_AI_URL =
  process.env.AGENTIC_AI_URL || process.env.PYTHON_AGENT_URL || 'http://127.0.0.1:8000';

export interface AgenticOutreachResponse {
  success: boolean;
  research?: {
    company_summary: string;
    target_audience: string;
    potential_tech_pain_points: string[];
    recommended_angle: string;
  };
  draft?: {
    subject: string;
    body: string;
    reasoning: string;
    confidence: number;
    word_count: number;
    spam_score: number;
    spam_warnings: string[];
  };
  approval_status?: 'pending' | 'approved' | 'rejected' | 'edited';
  send_status?: 'queued' | 'sent' | 'failed' | 'skipped';
  final_email_html?: string;
  final_email_plain?: string;
  logs?: string[];
}

export interface AgenticReplyResponse {
  success: boolean;
  classification?: {
    classification: 'interested' | 'question' | 'meeting_booked' | 'not_interested' | 'unsubscribe' | 'out_of_office' | 'other';
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
    key_question_or_intent: string;
    urgency: 'high' | 'medium' | 'low';
    reasoning: string;
  };
  action_plan?: {
    action_type: 'send_calendar' | 'answer_question' | 'suppress_and_close' | 'snooze' | 'manual_review';
    reply_subject: string;
    reply_body: string;
    send_immediately: boolean;
    telegram_alert_sent: boolean;
  };
  sent_result?: any;
  telegram_alert?: {
    success: boolean;
    message_id?: number;
    error?: string;
    skipped?: boolean;
  };
  logs?: string[];
}

export interface AgenticFollowupResponse {
  success: boolean;
  draft?: {
    subject: string;
    body: string;
    reasoning: string;
    confidence: number;
    word_count: number;
    spam_score: number;
  };
  logs?: string[];
}

/**
 * Checks if the Agentic AI FastAPI microservice is online and healthy.
 */
export async function checkAgenticAiHealth(timeoutMs = 1500): Promise<{
  available: boolean;
  url: string;
  data?: any;
  error?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${AGENTIC_AI_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      return { available: true, url: AGENTIC_AI_URL, data };
    }
    return { available: false, url: AGENTIC_AI_URL, error: `HTTP ${res.status}` };
  } catch (err: any) {
    clearTimeout(timer);
    return { available: false, url: AGENTIC_AI_URL, error: err.message || 'Connection refused' };
  }
}

/**
 * Calls the Agentic AI LangGraph Cold Outreach Pipeline (Research + Copywriter + Spam Filter).
 */
export async function callAgenticOutreach(lead: Lead, timeoutMs = 45000): Promise<AgenticOutreachResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload = {
      id: lead.id,
      name: lead.name || '',
      business_name: lead.businessName || 'Business',
      email: lead.email,
      niche: lead.niche || 'b2b',
      company_description: lead.companyDescription || '',
      website: lead.website || '',
      city: lead.city || '',
      notes: lead.notes || '',
    };

    const res = await fetch(`${AGENTIC_AI_URL}/api/v1/outreach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[AgenticAI Client] Outreach endpoint returned ${res.status}:`, text);
      return null;
    }

    const data: AgenticOutreachResponse = await res.json();
    return data;
  } catch (err: any) {
    clearTimeout(timer);
    console.warn(`[AgenticAI Client] Call to ${AGENTIC_AI_URL}/api/v1/outreach failed:`, err.message);
    return null;
  }
}

/**
 * Calls the Agentic AI LangGraph Inbound Reply Pipeline (Classifier + Telegram Alert + Action Plan).
 */
export async function callAgenticReply(opts: {
  fromEmail: string;
  subject: string;
  body: string;
  previousOutreach?: string;
  leadId?: string;
}, timeoutMs = 45000): Promise<AgenticReplyResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload = {
      id: `rep_${Date.now()}`,
      lead_id: opts.leadId || '',
      from_email: opts.fromEmail,
      subject: opts.subject,
      body: opts.body,
      previous_outreach: opts.previousOutreach || '',
    };

    const res = await fetch(`${AGENTIC_AI_URL}/api/v1/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[AgenticAI Client] Reply endpoint returned ${res.status}:`, text);
      return null;
    }

    const data: AgenticReplyResponse = await res.json();
    return data;
  } catch (err: any) {
    clearTimeout(timer);
    console.warn(`[AgenticAI Client] Call to ${AGENTIC_AI_URL}/api/v1/reply failed:`, err.message);
    return null;
  }
}

/**
 * Calls the Agentic AI LangGraph Follow-Up Pipeline.
 */
export async function callAgenticFollowup(opts: {
  lead: Lead;
  draft?: { subject: string; body: string };
  followupNumber: number;
}, timeoutMs = 45000): Promise<AgenticFollowupResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload = {
      lead: {
        id: opts.lead.id,
        name: opts.lead.name || '',
        business_name: opts.lead.businessName || 'Business',
        email: opts.lead.email,
        niche: opts.lead.niche || 'b2b',
        company_description: opts.lead.companyDescription || '',
        website: opts.lead.website || '',
        city: opts.lead.city || '',
        notes: opts.lead.notes || '',
      },
      draft: opts.draft || null,
      followup_number: opts.followupNumber,
    };

    const res = await fetch(`${AGENTIC_AI_URL}/api/v1/followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text();
      console.warn(`[AgenticAI Client] Followup endpoint returned ${res.status}:`, text);
      return null;
    }

    const data: AgenticFollowupResponse = await res.json();
    return data;
  } catch (err: any) {
    clearTimeout(timer);
    console.warn(`[AgenticAI Client] Call to ${AGENTIC_AI_URL}/api/v1/followup failed:`, err.message);
    return null;
  }
}

