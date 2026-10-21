import { NextRequest, NextResponse } from 'next/server';
import { parseAndValidateCsv } from '@/lib/csv/parse';
import { getExistingLeadEmails, getSuppressedEmails, saveImportedBatch } from '@/lib/firebase/leads';
import { enrichLeadsBatch } from '@/lib/agents/enrich';

export async function POST(req: NextRequest) {
  try {
    let csvContent = '';
    let filename = 'uploaded_leads.csv';
    let autoEnrich = true;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No CSV file provided in form data' }, { status: 400 });
      }
      filename = file.name || filename;
      csvContent = await file.text();
      if (formData.get('autoEnrich') === 'false') {
        autoEnrich = false;
      }
    } else {
      const body = await req.json();
      csvContent = body.csvContent || '';
      if (body.filename) filename = body.filename;
      if (body.autoEnrich === false) autoEnrich = false;
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json({ error: 'CSV content is empty' }, { status: 400 });
    }

    // Fetch existing and suppressed emails for deduplication
    const [existingEmails, suppressedEmails] = await Promise.all([
      getExistingLeadEmails(),
      getSuppressedEmails(),
    ]);

    // Parse and validate CSV
    const result = parseAndValidateCsv(csvContent, existingEmails, suppressedEmails);

    // AI Inspection, Niche Prediction & Safe Auto-Fill
    let finalLeads = result.validLeads;
    let enrichedCount = 0;
    let enrichmentDetails: any[] = [];

    if (autoEnrich && result.validLeads.length > 0) {
      const enrichedResult = await enrichLeadsBatch(result.validLeads);
      finalLeads = enrichedResult.enrichedLeads;
      enrichedCount = enrichedResult.enrichedCount;
      enrichmentDetails = enrichedResult.enrichmentDetails;
    }

    // Prepare batch details
    const batchData = {
      filename,
      totalRows: result.totalRows,
      imported: finalLeads.length,
      duplicates: result.duplicates.length,
      invalid: result.invalidRows.length,
      errorDetails: [
        ...result.invalidRows.map((item) => ({
          row: item.row,
          email: item.email,
          reason: item.reason,
        })),
        ...result.duplicates.map((item) => ({
          row: item.row,
          email: item.email,
          reason: item.reason,
        })),
      ],
    };

    // Save batch and leads
    let saveResult = { batchId: 'batch-preview', importedCount: finalLeads.length };
    if (finalLeads.length > 0) {
      saveResult = await saveImportedBatch(batchData, finalLeads);
    }

    return NextResponse.json({
      success: true,
      batchId: saveResult.batchId,
      filename,
      totalRows: result.totalRows,
      imported: finalLeads.length,
      duplicatesCount: result.duplicates.length,
      invalidCount: result.invalidRows.length,
      enrichedCount,
      enrichmentDetails,
      duplicates: result.duplicates,
      invalidRows: result.invalidRows,
      sampleValid: finalLeads.slice(0, 10),
    });
  } catch (error: any) {
    console.error('CSV Import Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process CSV import' },
      { status: 500 }
    );
  }
}
