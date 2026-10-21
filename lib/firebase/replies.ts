import { Reply, SentEmail, Lead } from '../types';
import { getAdminDb } from './admin';
import { getSentEmails } from '../gmail/send';
import { getLeads } from './leads';

const globalForReplies = globalThis as unknown as {
  __mockReplies?: Reply[];
};

let mockReplies: Reply[] = globalForReplies.__mockReplies || [
  {
    id: 'reply-1',
    leadId: 'lead-3',
    fromEmail: 'care@pateldentalcare.com',
    toAccount: 'alex.consulting@gmail.com',
    subject: 'Re: Patient booking portal & reminder workflow for Patel Multi-Speciality Dental Clinic',
    snippet: 'Hi Alex, thank you for reaching out. Yes, we have a major issue with patients missing their appointments on Saturdays. Does your WhatsApp system integrate with Practo?',
    body: 'Hi Alex,\n\nThank you for reaching out. Yes, we have a major issue with patients missing their appointments on Saturdays. Does your WhatsApp system integrate with Practo?\n\nI would be open to discussing this if it works with our existing setup.\n\nBest,\nDr. Rajesh Patel',
    messageId: 'msg_reply_patel_1',
    threadId: 'th_patel_dental_1',
    receivedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    classification: 'interested',
    sentiment: 'positive',
    summary: 'Dr. Patel expressed interest in solving missed Saturday appointments and asked if WhatsApp integrates with Practo.',
    needsHuman: false,
    suggestedAction: 'schedule_meeting',
  },
  {
    id: 'reply-2',
    leadId: 'lead-4',
    fromEmail: 'orders@urbanattire.co',
    toAccount: 'alex.techlead@gmail.com',
    subject: 'Re: Boosting repeat checkout conversion for Urban Attire Boutique Store',
    snippet: 'Hi, we are currently redesigning our catalog. How much do you charge for a custom Shopify storefront with local delivery? We need this done in 3 weeks.',
    body: 'Hi Alex,\n\nWe are currently redesigning our catalog. How much do you charge for a custom Shopify storefront with local delivery? We need this done in 3 weeks.\n\nPlease share your rate card.\n\nRegards,\nRohit Verma',
    messageId: 'msg_reply_rohit_2',
    threadId: 'th_urban_attire_2',
    receivedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    classification: 'question',
    sentiment: 'neutral',
    summary: 'Rohit asked for a fixed rate card and pricing quote for a 3-week Shopify storefront build.',
    needsHuman: true,
    suggestedAction: 'send_reply',
  },
];
globalForReplies.__mockReplies = mockReplies;

export async function getReplies(leadId?: string): Promise<Reply[]> {
  const db = getAdminDb();
  let replies: Reply[] = [];

  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      let queryRef: FirebaseFirestore.Query = db.collection('replies');
      if (leadId) {
        queryRef = queryRef.where('leadId', '==', leadId);
      }
      const snap = await queryRef.orderBy('receivedAt', 'desc').get();
      replies = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Reply));
    } catch (err) {
      console.warn('[Replies] Firestore read failed, using mock store:', err);
      replies = [...(globalForReplies.__mockReplies || mockReplies)];
    }
  } else {
    replies = [...(globalForReplies.__mockReplies || mockReplies)];
  }

  if (leadId) {
    replies = replies.filter((r) => r.leadId === leadId);
  }

  // Populate lead
  const { leads } = await getLeads();
  const leadsMap = new Map<string, Lead>();
  leads.forEach((l) => leadsMap.set(l.id, l));

  return replies.map((r) => ({
    ...r,
    lead: leadsMap.get(r.leadId),
  }));
}

export async function saveReply(reply: Reply): Promise<Reply> {
  const db = getAdminDb();
  if (db && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    try {
      await db.collection('replies').doc(reply.id).set(reply);
    } catch (err) {
      console.warn('[Replies] Firestore write failed:', err);
    }
  }

  mockReplies = globalForReplies.__mockReplies || mockReplies;
  const existingIdx = mockReplies.findIndex((r) => r.id === reply.id);
  if (existingIdx !== -1) {
    mockReplies[existingIdx] = reply;
  } else {
    mockReplies.unshift(reply);
  }
  globalForReplies.__mockReplies = mockReplies;

  return reply;
}

export interface ConversationItem {
  type: 'sent' | 'reply';
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  classification?: string;
  sentiment?: string;
  needsHuman?: boolean;
}

export async function getConversationThread(leadId: string): Promise<ConversationItem[]> {
  const [allSent, allReplies] = await Promise.all([
    getSentEmails(),
    getReplies(leadId),
  ]);

  const leadSent = allSent.filter((s) => s.leadId === leadId);
  const items: ConversationItem[] = [];

  leadSent.forEach((s) => {
    items.push({
      type: 'sent',
      id: s.id,
      from: s.fromAccount,
      to: s.toEmail,
      subject: s.subject,
      body: s.body,
      timestamp: s.sentAt,
    });
  });

  allReplies.forEach((r) => {
    items.push({
      type: 'reply',
      id: r.id,
      from: r.fromEmail,
      to: r.toAccount,
      subject: r.subject,
      body: r.body,
      timestamp: r.receivedAt,
      classification: r.classification,
      sentiment: r.sentiment,
      needsHuman: r.needsHuman,
    });
  });

  // Sort chronologically ascending (oldest to newest)
  return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
