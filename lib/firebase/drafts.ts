import { Draft, Lead, LearningExample, LeadNiche } from '../types';
import { getAdminDb } from './admin';
import { getLeads, updateLeadStatus } from './leads';
import { generatePersonalizedDraft } from '../agents/personalize';
import { DEFAULT_EMAIL_SIGNATURE, COMPLIANCE_OPT_OUT, ensureDefaultSignature } from '../templates/signature';

// In-memory demo drafts attached to globalThis for consistent state across Next.js API routes
const globalForDrafts = globalThis as unknown as {
  __mockDrafts?: Draft[];
  __mockLearningExamples?: LearningExample[];
};

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const DEMO_DRAFTS: Draft[] = [
  {
    id: 'draft-1',
    leadId: 'lead-1',
    type: 'initial',
    subject: 'Automating member bookings & check-ins for Apex Fitness Club',
    body: `Hi Aarav,\n\nI was looking into premier fitness and training clubs in Mumbai and came across Apex Fitness Club.\n\nAs a software developer specializing in digital member management, I noticed how clubs often spend 15+ hours weekly answering manual slot bookings and tracking membership renewals over WhatsApp.\n\nI recently deployed an automated class booking portal and digital QR check-in flow that freed up 3 hours daily for front-desk staff while lifting class attendance by 28%.\n\nAre you open to a brief 10-minute introductory call this Thursday to explore if this would be helpful for Apex?\n\n${DEFAULT_EMAIL_SIGNATURE}\n\n${COMPLIANCE_OPT_OUT}`,
    aiProvider: 'gemini',
    model: 'gemini-1.5-flash',
    status: 'pending',
    confidence: 0.96,
    reasoning: 'Tailored specifically to fitness club front-desk automation pain points in Mumbai.',
    wordCount: 112,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'draft-2',
    leadId: 'lead-5',
    type: 'initial',
    subject: 'Next.js engineering velocity & API integrations for Zenith AI',
    body: `Hi Vikram,\n\nI checked out Zenith AI recently and was impressed by your fast document processing engine.\n\nI'm a full-stack engineer specializing in Next.js 14, high-throughput Node.js microservices, and in-product chat interfaces. I partner with technical founders to knock out customer-requested integrations (like custom webhook exports and billing portals) without taking core engineers off deep model research.\n\nWould you have 10 minutes open this Friday for a quick introductory chat to explore if extra engineering bandwidth would be helpful for your upcoming sprint?\n\n${DEFAULT_EMAIL_SIGNATURE}\n\n${COMPLIANCE_OPT_OUT}`,
    aiProvider: 'openai',
    model: 'gpt-4o-mini',
    status: 'pending',
    confidence: 0.94,
    reasoning: 'Focused on developer bandwidth and high-throughput API architecture.',
    wordCount: 104,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

const DEMO_LEARNING_EXAMPLES: LearningExample[] = [
  {
    id: 'learn-1',
    niche: 'club',
    type: 'initial',
    businessName: 'IronGym Mumbai',
    originalSubject: 'Gym software for IronGym',
    originalBody: 'Hi, do you need software for gym memberships? We make apps for gyms.',
    approvedSubject: 'Streamlining member check-ins and renewals for IronGym',
    approvedBody: `Hi Rohit,\n\nI came across IronGym and loved your community-first approach to functional fitness.\n\nI build lightweight member check-in portals and automated renewal reminders for fitness facilities. For a similar gym in Bandra, this cut membership lapse by 25% without requiring complex software setups.\n\nWould you be open to a quick 10-minute chat this week?\n\n${DEFAULT_EMAIL_SIGNATURE}\n\n${COMPLIANCE_OPT_OUT}`,
    wasEdited: true,
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
];

let mockDrafts: Draft[] = isDemoMode ? (globalForDrafts.__mockDrafts || DEMO_DRAFTS) : (globalForDrafts.__mockDrafts || []);
let mockLearningExamples: LearningExample[] = isDemoMode ? (globalForDrafts.__mockLearningExamples || DEMO_LEARNING_EXAMPLES) : (globalForDrafts.__mockLearningExamples || []);

globalForDrafts.__mockDrafts = mockDrafts;
globalForDrafts.__mockLearningExamples = mockLearningExamples;

function cleanDoc<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export async function getDrafts(filter?: {
  status?: string;
  niche?: string;
  search?: string;
}): Promise<Draft[]> {
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const db = getAdminDb();
  let drafts: Draft[] = [];

  if (db) {
    try {
      const snap = await db.collection('drafts').get();
      drafts = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Draft));
    } catch (err) {
      console.warn('[Drafts] Firestore read failed, falling back to mock drafts:', err);
      drafts = isDemo ? [...(globalForDrafts.__mockDrafts || mockDrafts)] : [...(globalForDrafts.__mockDrafts || [])];
    }
  } else {
    drafts = isDemo ? [...(globalForDrafts.__mockDrafts || mockDrafts)] : [...(globalForDrafts.__mockDrafts || [])];
  }

  // Populate Lead information for each draft
  const { leads } = await getLeads();
  const leadsMap = new Map<string, Lead>();
  leads.forEach((l) => leadsMap.set(l.id, l));

  drafts = drafts.map((d) => ({
    ...d,
    body: ensureDefaultSignature(d.body),
    editedBody: d.editedBody ? ensureDefaultSignature(d.editedBody) : undefined,
    lead: leadsMap.get(d.leadId),
  }));

  // Apply in-memory filters
  if (filter?.status && filter.status !== 'all') {
    drafts = drafts.filter((d) => d.status === filter.status);
  }

  if (filter?.niche && filter.niche !== 'all') {
    drafts = drafts.filter((d) => d.lead?.niche === filter.niche);
  }

  if (filter?.search) {
    const q = filter.search.toLowerCase();
    drafts = drafts.filter(
      (d) =>
        d.subject.toLowerCase().includes(q) ||
        d.body.toLowerCase().includes(q) ||
        d.lead?.name.toLowerCase().includes(q) ||
        d.lead?.businessName.toLowerCase().includes(q) ||
        d.lead?.email.toLowerCase().includes(q)
    );
  }

  return drafts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getDraftById(id: string): Promise<Draft | null> {
  const all = await getDrafts();
  return all.find((d) => d.id === id) || null;
}

export async function createDraft(data: Omit<Draft, 'id' | 'createdAt'>): Promise<Draft> {
  const db = getAdminDb();
  const sanitizedBody = ensureDefaultSignature(data.body);
  const newDraft: Draft = {
    ...data,
    body: sanitizedBody,
    id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: new Date().toISOString(),
    wordCount: sanitizedBody.split(/\s+/).filter(Boolean).length,
  };

  if (db) {
    try {
      await db.collection('drafts').doc(newDraft.id).set(cleanDoc(newDraft));
    } catch (err) {
      console.warn('[Drafts] Firestore write failed, using mock store:', err);
    }
  }

  mockDrafts.unshift(newDraft);
  globalForDrafts.__mockDrafts = mockDrafts;
  await updateLeadStatus(newDraft.leadId, 'drafted');
  return newDraft;
}

export async function approveDraft(
  draftId: string,
  options?: {
    editedSubject?: string;
    editedBody?: string;
  }
): Promise<Draft> {
  const draft = await getDraftById(draftId);
  if (!draft) {
    throw new Error(`Draft with ID ${draftId} not found`);
  }

  const wasEdited = Boolean(
    (options?.editedSubject && options.editedSubject !== draft.subject) ||
    (options?.editedBody && options.editedBody !== draft.body)
  );

  const updatedDraft: Draft = {
    ...draft,
    status: 'approved',
    editedSubject: options?.editedSubject || draft.editedSubject,
    editedBody: options?.editedBody || draft.editedBody,
    updatedAt: new Date().toISOString(),
  };

  const db = getAdminDb();
  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      await db.collection('drafts').doc(draftId).update({
        status: 'approved',
        editedSubject: updatedDraft.editedSubject || null,
        editedBody: updatedDraft.editedBody || null,
        updatedAt: updatedDraft.updatedAt,
      });
    } catch (err) {
      console.warn('[Drafts] Firestore update failed:', err);
    }
  }

  // Update in mock store
  const idx = mockDrafts.findIndex((d) => d.id === draftId);
  if (idx !== -1) {
    mockDrafts[idx] = updatedDraft;
  }

  // Record in Learning Examples for few-shot prompt injection
  const learningExample: LearningExample = {
    id: `learn-${Date.now()}`,
    niche: draft.lead?.niche || 'other',
    type: draft.type,
    businessName: draft.lead?.businessName,
    leadName: draft.lead?.name,
    originalSubject: draft.subject,
    originalBody: draft.body,
    approvedSubject: options?.editedSubject || draft.subject,
    approvedBody: options?.editedBody || draft.body,
    wasEdited,
    createdAt: new Date().toISOString(),
  };

  mockLearningExamples.unshift(learningExample);

  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      await db.collection('learning_examples').doc(learningExample.id).set(learningExample);
    } catch (err) {
      console.warn('[Drafts] Could not save learning example:', err);
    }
  }

  return updatedDraft;
}

export async function rejectDraft(draftId: string, reason?: string): Promise<Draft> {
  const draft = await getDraftById(draftId);
  if (!draft) {
    throw new Error(`Draft with ID ${draftId} not found`);
  }

  const updated: Draft = {
    ...draft,
    status: 'rejected',
    feedback: reason,
    updatedAt: new Date().toISOString(),
  };

  const db = getAdminDb();
  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      await db.collection('drafts').doc(draftId).update({
        status: 'rejected',
        feedback: reason || null,
        updatedAt: updated.updatedAt,
      });
    } catch (err) {
      console.warn('[Drafts] Firestore reject update failed:', err);
    }
  }

  const idx = mockDrafts.findIndex((d) => d.id === draftId);
  if (idx !== -1) {
    mockDrafts[idx] = updated;
  }

  return updated;
}

export async function regenerateDraft(draftId: string, customInstruction: string): Promise<Draft> {
  const db = getAdminDb();
  let draft = await getDraftById(draftId);

  // If not found in cache, check Firestore directly
  if (!draft && db) {
    try {
      const docSnap = await db.collection('drafts').doc(draftId).get();
      if (docSnap.exists) {
        draft = { id: docSnap.id, ...docSnap.data() } as Draft;
      }
    } catch (err) {
      console.warn('[Drafts] Direct draft fetch failed:', err);
    }
  }

  if (!draft) {
    throw new Error(`Draft with ID ${draftId} not found`);
  }

  let lead = draft.lead;
  if (!lead && db && draft.leadId) {
    try {
      const leadDoc = await db.collection('leads').doc(draft.leadId).get();
      if (leadDoc.exists) {
        lead = { id: leadDoc.id, ...leadDoc.data() } as Lead;
      }
    } catch (err) {
      console.warn('[Drafts] Direct lead fetch failed:', err);
    }
  }

  if (!lead) {
    lead = {
      id: draft.leadId || 'lead-fallback',
      name: 'Business Owner',
      businessName: draft.subject.replace(/^(Re:\s*|Quick question regarding\s*)/i, '').trim() || 'Client Business',
      email: 'client@example.com',
      niche: 'other',
      status: 'new',
      followUpCount: 0,
      createdAt: new Date().toISOString(),
    };
  }

  // Fetch few-shot learning examples for this niche
  const examples = await getLearningExamples(lead.niche);

  // Generate new draft with custom instruction
  const res = await generatePersonalizedDraft({
    lead,
    fewShotExamples: examples,
    customInstruction,
  });

  const updated: Draft = {
    ...draft,
    lead,
    subject: res.subject,
    body: res.body,
    editedSubject: undefined,
    editedBody: undefined,
    confidence: res.confidence,
    reasoning: res.reasoning,
    wordCount: res.wordCount,
    aiProvider: res.provider,
    model: res.model,
    status: 'pending',
    feedback: customInstruction,
    updatedAt: new Date().toISOString(),
  };

  if (db) {
    try {
      await db.collection('drafts').doc(draftId).update({
        subject: updated.subject,
        body: updated.body,
        editedSubject: null,
        editedBody: null,
        confidence: updated.confidence,
        reasoning: updated.reasoning,
        wordCount: updated.wordCount,
        aiProvider: updated.aiProvider,
        model: updated.model,
        status: 'pending',
        feedback: customInstruction,
        updatedAt: updated.updatedAt,
      });
    } catch (err) {
      console.warn('[Drafts] Firestore regenerate update failed:', err);
    }
  }

  const idx = mockDrafts.findIndex((d) => d.id === draftId);
  if (idx !== -1) {
    mockDrafts[idx] = updated;
  }

  return updated;
}

export async function bulkApproveDrafts(draftIds: string[]): Promise<number> {
  let count = 0;
  for (const id of draftIds) {
    try {
      await approveDraft(id);
      count++;
    } catch (err) {
      console.error(`[Drafts] Bulk approve failed for ${id}:`, err);
    }
  }
  return count;
}

export async function getLearningExamples(niche?: LeadNiche): Promise<LearningExample[]> {
  const db = getAdminDb();
  let examples: LearningExample[] = [];

  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      let queryRef: FirebaseFirestore.Query = db.collection('learning_examples');
      if (niche) {
        queryRef = queryRef.where('niche', '==', niche);
      }
      const snap = await queryRef.orderBy('createdAt', 'desc').limit(5).get();
      examples = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as LearningExample));
    } catch (err) {
      examples = isDemoMode ? [...mockLearningExamples] : [];
    }
  } else {
    examples = isDemoMode ? [...mockLearningExamples] : [];
  }

  if (niche) {
    examples = examples.filter((e) => e.niche === niche);
  }

  return examples;
}
