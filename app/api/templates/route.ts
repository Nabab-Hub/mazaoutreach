import { NextRequest, NextResponse } from 'next/server';
import {
  getAllNicheTemplates,
  getNicheTemplate,
  updateNicheTemplate,
  resetNicheTemplates,
} from '@/lib/templates/niche-templates';
import { LeadNiche } from '@/lib/types';

export async function GET() {
  try {
    const templates = getAllNicheTemplates();
    return NextResponse.json({ success: true, templates });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, niche, templateData } = body;

    if (action === 'reset') {
      resetNicheTemplates();
      return NextResponse.json({ success: true, templates: getAllNicheTemplates() });
    }

    if (!niche) {
      return NextResponse.json({ error: 'niche is required' }, { status: 400 });
    }

    const updated = updateNicheTemplate(niche as LeadNiche, templateData);
    return NextResponse.json({ success: true, template: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update template' }, { status: 500 });
  }
}
