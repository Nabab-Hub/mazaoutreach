import { Lead, ImportBatch, SuppressionEntry, LeadStatus, LeadNiche } from '../types';
import { getAdminDb } from './admin';

const globalForLeads = globalThis as unknown as {
  __mockLeads?: Lead[];
  __mockBatches?: ImportBatch[];
};

// In-memory demo store initialized with realistic sample leads for immediate evaluation
let mockLeads: Lead[] = globalForLeads.__mockLeads || [
  {
    id: 'lead-1',
    name: 'Aarav Sharma',
    email: 'contact@apexfitnessclub.in',
    businessName: 'Apex Fitness & Sports Club',
    niche: 'club',
    city: 'Mumbai',
    website: 'https://apexfitnessclub.in',
    notes: 'Looking to launch automated member signups and a mobile check-in app.',
    status: 'new',
    followUpCount: 0,
    batchId: 'batch-demo-1',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: 'lead-2',
    name: 'Priya Mehta',
    email: 'priya@techwithpriya.com',
    businessName: 'Tech With Priya (YouTube & Substack)',
    niche: 'creator',
    city: 'Bengaluru',
    website: 'https://techwithpriya.com',
    notes: 'Wants to migrate course members from Gumroad to an owned custom platform.',
    status: 'contacted',
    assignedGmailId: 'acct-1',
    lastContactedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    followUpCount: 0,
    batchId: 'batch-demo-1',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
  {
    id: 'lead-3',
    name: 'Dr. Rajesh Patel',
    email: 'care@pateldentalcare.com',
    businessName: 'Patel Multi-Speciality Dental Clinic',
    niche: 'clinic',
    city: 'Ahmedabad',
    website: 'https://pateldentalcare.com',
    notes: 'High missed appointment rate. Needs WhatsApp reminders and quick web booking.',
    status: 'interested',
    assignedGmailId: 'acct-1',
    lastContactedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    followUpCount: 1,
    batchId: 'batch-demo-1',
    createdAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
  },
  {
    id: 'lead-4',
    name: 'Rohit Verma',
    email: 'orders@urbanattire.co',
    businessName: 'Urban Attire Boutique Store',
    niche: 'shop',
    city: 'Delhi',
    website: 'https://urbanattire.co',
    notes: 'Offline boutique seeking Shopify-like custom storefront with local delivery integration.',
    status: 'replied',
    assignedGmailId: 'acct-2',
    lastContactedAt: new Date(Date.now() - 3600000 * 16).toISOString(),
    followUpCount: 0,
    batchId: 'batch-demo-1',
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
  },
  {
    id: 'lead-5',
    name: 'Elena Rostova',
    email: 'support@cloudlogic.ai',
    businessName: 'CloudLogic Automations',
    niche: 'other',
    city: 'Singapore',
    website: 'https://cloudlogic.ai',
    notes: 'B2B enterprise workflow consultancy. Interested in custom AI agents and Slack bots.',
    status: 'meeting',
    assignedGmailId: 'acct-2',
    lastContactedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    followUpCount: 1,
    batchId: 'batch-demo-1',
    createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
];

let mockBatches: ImportBatch[] = [
  {
    id: 'batch-demo-1',
    filename: 'initial_q1_leads_sample.csv',
    totalRows: 5,
    imported: 5,
    duplicates: 0,
    invalid: 0,
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
];
globalForLeads.__mockLeads = mockLeads;
globalForLeads.__mockBatches = mockBatches;

let mockSuppression: SuppressionEntry[] = [
  {
    email: 'do-not-contact@example.com',
    reason: 'manual',
    addedAt: new Date(Date.now() - 3600000 * 24 * 10).toISOString(),
  },
];

export async function getExistingLeadEmails(): Promise<Set<string>> {
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db.collection('leads').select('email').get();
      const set = new Set<string>();
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.email) set.add(data.email.toLowerCase().trim());
      });
      return set;
    } catch (e) {
      console.warn('Error reading leads from Firestore, falling back to mock:', e);
    }
  }
  return new Set(mockLeads.map((l) => l.email.toLowerCase().trim()));
}

export async function getSuppressedEmails(): Promise<Set<string>> {
  const { getSuppressionEntries } = await import('./suppression');
  const entries = await getSuppressionEntries();
  return new Set(entries.map((e) => e.email.toLowerCase().trim()));
}

export async function getLeads(filters?: {
  status?: LeadStatus;
  niche?: LeadNiche;
  batchId?: string;
  search?: string;
}): Promise<{ leads: Lead[]; total: number }> {
  const leads = await fetchAllLeads(filters);
  return { leads, total: leads.length };
}

export async function fetchAllLeads(filters?: {
  status?: LeadStatus;
  niche?: LeadNiche;
  batchId?: string;
  search?: string;
}): Promise<Lead[]> {
  const db = getAdminDb();
  let leads: Lead[] = [];

  if (db) {
    try {
      let query: FirebaseFirestore.Query = db.collection('leads');
      if (filters?.status) query = query.where('status', '==', filters.status);
      if (filters?.niche) query = query.where('niche', '==', filters.niche);
      if (filters?.batchId) query = query.where('batchId', '==', filters.batchId);

      const snap = await query.orderBy('createdAt', 'desc').get();
      snap.forEach((doc) => {
        leads.push({ id: doc.id, ...doc.data() } as Lead);
      });
    } catch (e) {
      console.warn('Error querying Firestore leads, falling back to memory store:', e);
      leads = [...(globalForLeads.__mockLeads || mockLeads)];
    }
  } else {
    leads = [...(globalForLeads.__mockLeads || mockLeads)];
  }

  // Filter in-memory if needed
  if (filters?.status) {
    leads = leads.filter((l) => l.status === filters.status);
  }
  if (filters?.niche) {
    leads = leads.filter((l) => l.niche === filters.niche);
  }
  if (filters?.batchId) {
    leads = leads.filter((l) => l.batchId === filters.batchId);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase().trim();
    leads = leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.businessName.toLowerCase().includes(q) ||
        (l.city && l.city.toLowerCase().includes(q))
    );
  }

  return leads.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function saveImportedBatch(
  batch: Omit<ImportBatch, 'id' | 'createdAt'>,
  newLeads: Array<Omit<Lead, 'id' | 'createdAt' | 'status' | 'followUpCount'>>
): Promise<{ batchId: string; importedCount: number }> {
  const batchId = `batch-${Date.now()}`;
  const now = new Date().toISOString();

  const fullBatch: ImportBatch = {
    ...batch,
    id: batchId,
    createdAt: now,
  };

  const createdLeads: Lead[] = newLeads.map((l, idx) => ({
    ...l,
    id: `lead-${Date.now()}-${idx}`,
    status: 'new',
    followUpCount: 0,
    batchId,
    createdAt: now,
  }));

  const db = getAdminDb();
  if (db) {
    try {
      const batchOp = db.batch();

      const batchRef = db.collection('batches').doc(batchId);
      batchOp.set(batchRef, fullBatch);

      createdLeads.forEach((lead) => {
        const leadRef = db.collection('leads').doc(lead.id);
        batchOp.set(leadRef, lead);
      });

      await batchOp.commit();
      return { batchId, importedCount: createdLeads.length };
    } catch (e) {
      console.warn('Failed to commit batch to Firestore, saving to memory fallback:', e);
    }
  }

  // Fallback to in-memory store
  mockBatches.unshift(fullBatch);
  mockLeads = [...createdLeads, ...(globalForLeads.__mockLeads || mockLeads)];
  globalForLeads.__mockBatches = mockBatches;
  globalForLeads.__mockLeads = mockLeads;

  return { batchId, importedCount: createdLeads.length };
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<boolean> {
  const db = getAdminDb();
  if (db) {
    try {
      await db.collection('leads').doc(id).update({
        status,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (e) {
      console.warn('Failed to update lead status in Firestore:', e);
    }
  }

  mockLeads = globalForLeads.__mockLeads || mockLeads;
  const idx = mockLeads.findIndex((l) => l.id === id);
  if (idx !== -1) {
    mockLeads[idx] = {
      ...mockLeads[idx],
      status,
      updatedAt: new Date().toISOString(),
    };
    globalForLeads.__mockLeads = mockLeads;
    return true;
  }
  return false;
}

export async function deleteLead(id: string): Promise<boolean> {
  const db = getAdminDb();
  if (db) {
    try {
      await db.collection('leads').doc(id).delete();
      return true;
    } catch (e) {
      console.warn('Failed to delete lead in Firestore:', e);
    }
  }

  mockLeads = globalForLeads.__mockLeads || mockLeads;
  const prevLen = mockLeads.length;
  mockLeads = mockLeads.filter((l) => l.id !== id);
  globalForLeads.__mockLeads = mockLeads;
  return mockLeads.length < prevLen;
}

export async function deleteMultipleLeads(ids: string[]): Promise<number> {
  if (!ids || ids.length === 0) return 0;
  const db = getAdminDb();
  if (db) {
    try {
      const batchOp = db.batch();
      ids.forEach((id) => {
        batchOp.delete(db.collection('leads').doc(id));
      });
      await batchOp.commit();
    } catch (e) {
      console.warn('Failed to batch delete leads in Firestore:', e);
    }
  }

  mockLeads = globalForLeads.__mockLeads || mockLeads;
  const idsSet = new Set(ids);
  const prevLen = mockLeads.length;
  mockLeads = mockLeads.filter((l) => !idsSet.has(l.id));
  globalForLeads.__mockLeads = mockLeads;
  return prevLen - mockLeads.length;
}

export async function fetchBatches(): Promise<ImportBatch[]> {
  const db = getAdminDb();
  if (db) {
    try {
      const snap = await db.collection('batches').orderBy('createdAt', 'desc').get();
      const batches: ImportBatch[] = [];
      snap.forEach((doc) => batches.push({ id: doc.id, ...doc.data() } as ImportBatch));
      return batches;
    } catch (e) {
      console.warn('Error reading batches from Firestore:', e);
    }
  }
  return [...mockBatches];
}
