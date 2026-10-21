import { NextRequest, NextResponse } from 'next/server';
import { fetchAllLeads, updateLeadStatus, deleteLead, deleteMultipleLeads, fetchBatches } from '@/lib/firebase/leads';
import { LeadNiche, LeadStatus } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as LeadStatus | null;
    const niche = searchParams.get('niche') as LeadNiche | null;
    const batchId = searchParams.get('batchId') || undefined;
    const search = searchParams.get('search') || undefined;
    const withBatches = searchParams.get('withBatches') === 'true';

    const leads = await fetchAllLeads({
      status: status || undefined,
      niche: niche || undefined,
      batchId,
      search,
    });

    let batches: any[] = [];
    if (withBatches) {
      batches = await fetchBatches();
    }

    return NextResponse.json({
      success: true,
      total: leads.length,
      leads,
      batches,
    });
  } catch (error: any) {
    console.error('Leads GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing lead id or status' }, { status: 400 });
    }

    const success = await updateLeadStatus(id, status as LeadStatus);
    if (!success) {
      return NextResponse.json({ error: 'Lead not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error: any) {
    console.error('Leads PATCH Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update lead' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    let idsToDelete: string[] = [];

    if (id) {
      idsToDelete = [id];
    } else if (idsParam) {
      idsToDelete = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      try {
        const body = await req.json();
        if (body.ids && Array.isArray(body.ids)) {
          idsToDelete = body.ids;
        } else if (body.id) {
          idsToDelete = [body.id];
        }
      } catch {
        // No body
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Missing lead id or ids' }, { status: 400 });
    }

    if (idsToDelete.length === 1) {
      const success = await deleteLead(idsToDelete[0]);
      if (!success) {
        return NextResponse.json({ error: 'Lead not found or delete failed' }, { status: 404 });
      }
      return NextResponse.json({ success: true, count: 1, deletedIds: idsToDelete });
    }

    const count = await deleteMultipleLeads(idsToDelete);
    return NextResponse.json({ success: true, count, deletedIds: idsToDelete });
  } catch (error: any) {
    console.error('Leads DELETE Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete leads' },
      { status: 500 }
    );
  }
}
