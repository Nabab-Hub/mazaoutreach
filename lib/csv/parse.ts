import Papa from 'papaparse';
import { Lead, LeadNiche } from '../types';

export interface RawCsvRow {
  [key: string]: string | undefined;
}

export interface CsvValidationIssue {
  row: number;
  email?: string;
  reason: string;
}

export interface CsvParseResult {
  validLeads: Array<Omit<Lead, 'id' | 'createdAt' | 'status' | 'followUpCount'>>;
  duplicates: Array<{ row: number; email: string; reason: string }>;
  invalidRows: CsvValidationIssue[];
  totalRows: number;
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const clean = normalizeEmail(email);
  return EMAIL_REGEX.test(clean);
}

export function inferNiche(text: string): LeadNiche {
  const lower = text.toLowerCase();
  if (lower.includes('club') || lower.includes('community') || lower.includes('society') || lower.includes('association') || lower.includes('fitness') || lower.includes('gym')) {
    return 'club';
  }
  if (lower.includes('creator') || lower.includes('influencer') || lower.includes('youtube') || lower.includes('podcast') || lower.includes('author') || lower.includes('artist')) {
    return 'creator';
  }
  if (lower.includes('shop') || lower.includes('store') || lower.includes('retail') || lower.includes('boutique') || lower.includes('cafe') || lower.includes('restaurant') || lower.includes('bakery')) {
    return 'shop';
  }
  if (lower.includes('clinic') || lower.includes('dental') || lower.includes('dr.') || lower.includes('doctor') || lower.includes('health') || lower.includes('hospital') || lower.includes('therapy')) {
    return 'clinic';
  }
  return 'other';
}

function findHeaderKey(row: RawCsvRow, candidates: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const matched = keys.find(k => k.trim().toLowerCase() === candidate.toLowerCase());
    if (matched) return matched;
  }
  return undefined;
}

export function parseAndValidateCsv(
  csvContent: string,
  existingEmails: Set<string> = new Set(),
  suppressedEmails: Set<string> = new Set()
): CsvParseResult {
  const parsed = Papa.parse<RawCsvRow>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });

  const validLeads: Array<Omit<Lead, 'id' | 'createdAt' | 'status' | 'followUpCount'>> = [];
  const duplicates: Array<{ row: number; email: string; reason: string }> = [];
  const invalidRows: CsvValidationIssue[] = [];
  const seenInCurrentCsv = new Set<string>();

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for 0-index, +1 for header row

    const nameKey = findHeaderKey(row, ['name', 'full name', 'fullname', 'contact', 'contact name', 'lead name', 'owner']);
    const emailKey = findHeaderKey(row, ['email', 'email address', 'e-mail', 'mail', 'contact email']);
    const businessKey = findHeaderKey(row, ['business', 'business name', 'company', 'company name', 'organization', 'shop name', 'clinic name']);
    const nicheKey = findHeaderKey(row, ['niche', 'category', 'type', 'industry', 'profession']);
    const cityKey = findHeaderKey(row, ['city', 'location', 'town', 'state', 'region']);
    const websiteKey = findHeaderKey(row, ['website', 'site', 'url', 'web', 'link']);
    const companyDescriptionKey = findHeaderKey(row, [
      'company_description',
      'company description',
      'companydescription',
      'company_profile',
      'company profile',
      'business_description',
      'business description',
      'about_company',
      'about company',
      'about',
      'overview',
      'description',
      'summary',
    ]);
    const notesKey = findHeaderKey(row, ['notes', 'note', 'comments', 'details', 'remarks']);

    const rawEmail = emailKey ? row[emailKey]?.trim() : undefined;
    const rawName = nameKey ? row[nameKey]?.trim() : undefined;

    // Email validation
    if (!rawEmail) {
      invalidRows.push({
        row: rowNumber,
        reason: 'Missing email address in row',
      });
      return;
    }

    if (!isValidEmail(rawEmail)) {
      invalidRows.push({
        row: rowNumber,
        email: rawEmail,
        reason: 'Invalid email syntax or domain format',
      });
      return;
    }

    const email = normalizeEmail(rawEmail);

    // Suppression list check
    if (suppressedEmails.has(email)) {
      duplicates.push({
        row: rowNumber,
        email,
        reason: 'Email is in the suppression / do-not-contact list (opted-out)',
      });
      return;
    }

    // In-file duplicate check
    if (seenInCurrentCsv.has(email)) {
      duplicates.push({
        row: rowNumber,
        email,
        reason: 'Duplicate email detected within this CSV file',
      });
      return;
    }

    // Existing database check
    if (existingEmails.has(email)) {
      duplicates.push({
        row: rowNumber,
        email,
        reason: 'Email already exists in the leads database',
      });
      return;
    }

    seenInCurrentCsv.add(email);

    // Business Name fallback
    const businessName = (businessKey && row[businessKey]?.trim()) || rawName || 'Business Owner';
    const name = rawName || businessName.split(' ')[0] || 'There';
    const companyDescription = companyDescriptionKey ? row[companyDescriptionKey]?.trim() : undefined;

    // Niche extraction or inference
    let niche: LeadNiche = 'other';
    const rawNiche = (nicheKey && row[nicheKey]?.trim().toLowerCase()) || '';
    if (['club', 'creator', 'shop', 'clinic', 'other'].includes(rawNiche)) {
      niche = rawNiche as LeadNiche;
    } else {
      // Infer niche based on business name, company description, website, and notes
      const inferenceText = `${businessName} ${companyDescription || ''} ${row[websiteKey || ''] || ''} ${row[notesKey || ''] || ''}`;
      niche = inferNiche(inferenceText);
    }

    // Collect additional custom fields
    const standardKeys = new Set([nameKey, emailKey, businessKey, nicheKey, companyDescriptionKey, cityKey, websiteKey, notesKey].filter(Boolean));
    const customFields: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!standardKeys.has(k) && v !== undefined && v.trim() !== '') {
        customFields[k] = v.trim();
      }
    }

    validLeads.push({
      name,
      email,
      businessName,
      niche,
      companyDescription,
      city: cityKey ? row[cityKey]?.trim() : undefined,
      website: websiteKey ? row[websiteKey]?.trim() : undefined,
      notes: notesKey ? row[notesKey]?.trim() : undefined,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  });

  return {
    validLeads,
    duplicates,
    invalidRows,
    totalRows: parsed.data.length,
  };
}
