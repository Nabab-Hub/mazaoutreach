export type LeadStatus =
  | 'new'
  | 'drafted'
  | 'contacted'
  | 'replied'
  | 'interested'
  | 'meeting'
  | 'won'
  | 'lost'
  | 'unsubscribed';

export type LeadNiche =
  | 'club'
  | 'creator'
  | 'shop'
  | 'clinic'
  | 'real_estate'
  | 'saas'
  | 'agency'
  | 'other';

export interface Lead {
  id: string;
  name: string;
  email: string;
  businessName: string;
  niche: LeadNiche;
  companyDescription?: string;
  city?: string;
  website?: string;
  notes?: string;
  customFields?: Record<string, string | number | boolean>;
  status: LeadStatus;
  assignedGmailId?: string;
  lastContactedAt?: string | null;
  followUpCount: number;
  nextFollowUpAt?: string | null;
  batchId?: string;
  createdAt: string;
  updatedAt?: string;
  aiEnriched?: boolean;
  enrichedFields?: string[];
  enrichmentSummary?: string;
}

export interface ImportBatch {
  id: string;
  filename: string;
  totalRows: number;
  imported: number;
  duplicates: number;
  invalid: number;
  createdAt: string;
  errorDetails?: Array<{
    row: number;
    email?: string;
    reason: string;
  }>;
}

export interface SuppressionEntry {
  email: string;
  reason: 'user_requested' | 'hard_bounce' | 'complaint' | 'manual';
  addedAt: string;
  leadId?: string;
}

export interface EmailAccount {
  id: string;
  gmailAddress: string;
  displayName?: string;
  encryptedRefreshToken: string;
  dailyLimit: number;
  sentToday: number;
  status: 'active' | 'paused' | 'error';
  warmupLevel: number;
  lastUsedAt?: string;
  errorCount?: number;
  lastErrorMessage?: string;
  createdAt: string;
}

export interface SentEmail {
  id: string;
  leadId: string;
  draftId?: string;
  fromAccount: string;
  toEmail: string;
  subject: string;
  body: string;
  messageId: string;
  threadId: string;
  type: 'initial' | 'followup_1' | 'followup_2' | 'reply';
  sentAt: string;
  status: 'sent' | 'delivered' | 'bounced' | 'complaint';
}

export interface SendQueueJob {
  draftId: string;
  leadId: string;
  scheduledFor: string;
  status: 'queued' | 'sending' | 'completed' | 'failed' | 'paused';
  error?: string;
}

export const WARMUP_LEVEL_MAP: Record<number, { name: string; maxDaily: number }> = {
  1: { name: 'Week 1 (Seed Warmup)', maxDaily: 20 },
  2: { name: 'Week 2 (Ramping)', maxDaily: 30 },
  3: { name: 'Week 3 (Established)', maxDaily: 50 },
  4: { name: 'Week 4+ (Full Volume)', maxDaily: 80 },
};

export interface Draft {
  id: string;
  leadId: string;
  type: 'initial' | 'followup_1' | 'followup_2' | 'reply';
  subject: string;
  body: string;
  aiProvider: 'gemini' | 'openai' | 'grok' | 'mock';
  model: string;
  status: 'pending' | 'approved' | 'edited' | 'rejected' | 'sent';
  editedSubject?: string;
  editedBody?: string;
  confidence?: number;
  reasoning?: string;
  feedback?: string;
  wordCount?: number;
  createdAt: string;
  updatedAt?: string;
  lead?: Lead;
}

export interface LearningExample {
  id: string;
  niche: LeadNiche;
  type: 'initial' | 'followup' | 'followup_1' | 'followup_2' | 'reply';
  leadName?: string;
  businessName?: string;
  originalSubject: string;
  originalBody: string;
  approvedSubject: string;
  approvedBody: string;
  wasEdited: boolean;
  notes?: string;
  createdAt: string;
}

export interface NicheTemplate {
  niche: LeadNiche;
  displayName: string;
  pitchAngle: string;
  servicesToHighlight: string[];
  tone: string;
  exampleEmail: string;
  bannedPhrases: string[];
}

export type AITaskType = 'personalize' | 'classify' | 'reply' | 'niche_inference';

export interface TaskModelConfig {
  provider: 'gemini' | 'openai' | 'grok';
  model: string;
}

export interface AIRouterConfig {
  tasks: Record<AITaskType, TaskModelConfig>;
  fallbacks: Array<'gemini' | 'openai' | 'grok'>;
  temperature?: number;
}

export interface PersonalizeInput {
  lead: Lead;
  nicheTemplate?: NicheTemplate;
  fewShotExamples?: LearningExample[];
  customInstruction?: string;
  senderName?: string;
  services?: string[];
}

export interface PersonalizeResult {
  subject: string;
  body: string;
  confidence: number;
  reasoning: string;
  wordCount: number;
  provider: 'gemini' | 'openai' | 'grok' | 'mock';
  model: string;
}

export type ReplyClassificationType =
  | 'interested'
  | 'question'
  | 'not_interested'
  | 'unsubscribe'
  | 'out_of_office'
  | 'other';

export type ReplySentiment = 'positive' | 'neutral' | 'negative';

export type SuggestedAction = 'send_reply' | 'schedule_meeting' | 'stop' | 'wait';

export interface ClassificationResult {
  classification: ReplyClassificationType;
  sentiment: ReplySentiment;
  summary: string;
  needsHuman: boolean;
  suggestedAction: SuggestedAction;
  confidence?: number;
  reasoning?: string;
}

export interface Reply {
  id: string;
  leadId: string;
  fromEmail: string;
  toAccount: string;
  subject: string;
  snippet: string;
  body: string;
  messageId: string;
  threadId: string;
  receivedAt: string;
  classification: ReplyClassificationType;
  sentiment: ReplySentiment;
  summary: string;
  needsHuman: boolean;
  suggestedAction: SuggestedAction;
  draftReplyId?: string;
  lead?: Lead;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'lead_interested' | 'needs_human' | 'followup_sent' | 'system';
  leadId?: string;
  read: boolean;
  createdAt: string;
  link?: string;
}
