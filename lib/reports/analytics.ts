import { getLeads } from '../firebase/leads';
import { getReplies } from '../firebase/replies';
import { getAccounts } from '../firebase/accounts';
import { getDrafts, getLearningExamples } from '../firebase/drafts';
import { LeadNiche, LeadStatus } from '../types';

export interface NichePerformance {
  niche: LeadNiche;
  label: string;
  totalLeads: number;
  contacted: number;
  replies: number;
  interested: number;
  won: number;
  replyRate: number; // percentage
  interestRate: number; // percentage
  approvedWithoutEdit: number;
  currentAutonomyLevel: 'L0' | 'L1' | 'L2' | 'L3';
  upgradeSuggested: boolean;
  suggestedLevel?: 'L1' | 'L2' | 'L3';
}

export interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}

export interface AnalyticsReport {
  overview: {
    totalLeads: number;
    contactedLeads: number;
    repliedLeads: number;
    interestedLeads: number;
    meetingsScheduled: number;
    dealsWon: number;
    dealsLost: number;
    unsubscribed: number;
    overallReplyRate: number;
    overallInterestRate: number;
    overallCallRate: number;
    bounceRate: number;
  };
  funnel: FunnelStage[];
  nicheBreakdown: NichePerformance[];
  accountHealth: {
    totalAccounts: number;
    activeAccounts: number;
    totalSentToday: number;
    totalDailyCapacity: number;
    utilizationRate: number;
  };
  learningSummary: {
    totalExamples: number;
    overallEditRate: number;
    readyForPromotionCount: number;
  };
  generatedAt: string;
}

const NICHE_LABELS: Record<LeadNiche, string> = {
  club: 'Clubs & Communities',
  creator: 'Content Creators',
  shop: 'Retail & Boutiques',
  clinic: 'Dental & Clinics',
  other: 'Tech & Other B2B',
};

export async function generateAnalyticsReport(): Promise<AnalyticsReport> {
  const [{ leads }, replies, accounts, drafts, examples] = await Promise.all([
    getLeads(),
    getReplies(),
    getAccounts(),
    getDrafts(),
    getLearningExamples(),
  ]);

  // Status Counts
  const statusCounts: Record<LeadStatus, number> = {
    new: 0,
    drafted: 0,
    contacted: 0,
    replied: 0,
    interested: 0,
    meeting: 0,
    won: 0,
    lost: 0,
    unsubscribed: 0,
  };

  leads.forEach((l) => {
    if (statusCounts[l.status] !== undefined) {
      statusCounts[l.status]++;
    }
  });

  const totalLeads = leads.length;
  // Leads that have received at least one outbound email
  const contactedOrBeyond = leads.filter((l) =>
    ['contacted', 'replied', 'interested', 'meeting', 'won', 'lost'].includes(l.status)
  ).length;

  const repliedOrBeyond = leads.filter((l) =>
    ['replied', 'interested', 'meeting', 'won'].includes(l.status)
  ).length;

  const interestedOrBeyond = leads.filter((l) =>
    ['interested', 'meeting', 'won'].includes(l.status)
  ).length;

  const meetingOrBeyond = leads.filter((l) =>
    ['meeting', 'won'].includes(l.status)
  ).length;

  const dealsWon = statusCounts.won;
  const dealsLost = statusCounts.lost;
  const unsubscribed = statusCounts.unsubscribed;

  const overallReplyRate = contactedOrBeyond > 0 ? (repliedOrBeyond / contactedOrBeyond) * 100 : 0;
  const overallInterestRate = contactedOrBeyond > 0 ? (interestedOrBeyond / contactedOrBeyond) * 100 : 0;
  const overallCallRate = contactedOrBeyond > 0 ? (meetingOrBeyond / contactedOrBeyond) * 100 : 0;

  // Account Health
  const activeAccounts = accounts.filter((a) => a.status === 'active');
  const totalSentToday = accounts.reduce((acc, a) => acc + (a.sentToday || 0), 0);
  const totalDailyCapacity = activeAccounts.reduce((acc, a) => acc + (a.dailyLimit || 0), 0);
  const utilizationRate = totalDailyCapacity > 0 ? (totalSentToday / totalDailyCapacity) * 100 : 0;

  // Niche Breakdown & Autonomy Ladder
  const niches: LeadNiche[] = ['club', 'creator', 'shop', 'clinic', 'other'];

  const nicheBreakdown: NichePerformance[] = niches.map((niche) => {
    const nicheLeads = leads.filter((l) => l.niche === niche);
    const total = nicheLeads.length;
    const contacted = nicheLeads.filter((l) =>
      ['contacted', 'replied', 'interested', 'meeting', 'won', 'lost'].includes(l.status)
    ).length;
    const replied = nicheLeads.filter((l) =>
      ['replied', 'interested', 'meeting', 'won'].includes(l.status)
    ).length;
    const interested = nicheLeads.filter((l) =>
      ['interested', 'meeting', 'won'].includes(l.status)
    ).length;
    const won = nicheLeads.filter((l) => l.status === 'won').length;

    const replyRate = contacted > 0 ? (replied / contacted) * 100 : 0;
    const interestRate = contacted > 0 ? (interested / contacted) * 100 : 0;

    // Approved without edits calculation for Autonomy Ladder
    const nicheExamples = examples.filter((e) => e.niche === niche);
    const approvedWithoutEdit = nicheExamples.filter((e) => !e.wasEdited).length;

    // Autonomy promotion suggestion rule: 20+ approved with no edits
    let currentAutonomyLevel: 'L0' | 'L1' | 'L2' | 'L3' = 'L0';
    let upgradeSuggested = false;
    let suggestedLevel: 'L1' | 'L2' | 'L3' | undefined = undefined;

    if (approvedWithoutEdit >= 20) {
      currentAutonomyLevel = 'L1';
      upgradeSuggested = true;
      suggestedLevel = 'L2';
    } else if (approvedWithoutEdit >= 10) {
      currentAutonomyLevel = 'L0';
      upgradeSuggested = true;
      suggestedLevel = 'L1';
    }

    return {
      niche,
      label: NICHE_LABELS[niche],
      totalLeads: total,
      contacted,
      replies: replied,
      interested,
      won,
      replyRate: Math.round(replyRate * 10) / 10,
      interestRate: Math.round(interestRate * 10) / 10,
      approvedWithoutEdit,
      currentAutonomyLevel,
      upgradeSuggested,
      suggestedLevel,
    };
  });

  // Funnel
  const funnel: FunnelStage[] = [
    {
      stage: 'Total Imported',
      count: totalLeads,
      percentage: 100,
      color: 'bg-indigo-500',
    },
    {
      stage: 'Contacted',
      count: contactedOrBeyond,
      percentage: totalLeads > 0 ? Math.round((contactedOrBeyond / totalLeads) * 100) : 0,
      color: 'bg-purple-500',
    },
    {
      stage: 'Replied',
      count: repliedOrBeyond,
      percentage: totalLeads > 0 ? Math.round((repliedOrBeyond / totalLeads) * 100) : 0,
      color: 'bg-cyan-500',
    },
    {
      stage: 'Interested (Hot)',
      count: interestedOrBeyond,
      percentage: totalLeads > 0 ? Math.round((interestedOrBeyond / totalLeads) * 100) : 0,
      color: 'bg-emerald-500',
    },
    {
      stage: 'Discovery Calls',
      count: meetingOrBeyond,
      percentage: totalLeads > 0 ? Math.round((meetingOrBeyond / totalLeads) * 100) : 0,
      color: 'bg-amber-500',
    },
    {
      stage: 'Deals Won',
      count: dealsWon,
      percentage: totalLeads > 0 ? Math.round((dealsWon / totalLeads) * 100) : 0,
      color: 'bg-green-500',
    },
  ];

  // Learning Engine summary
  const totalExamples = examples.length;
  const editedExamples = examples.filter((e) => e.wasEdited).length;
  const overallEditRate = totalExamples > 0 ? Math.round((editedExamples / totalExamples) * 100) : 0;
  const readyForPromotionCount = nicheBreakdown.filter((n) => n.upgradeSuggested).length;

  return {
    overview: {
      totalLeads,
      contactedLeads: contactedOrBeyond,
      repliedLeads: repliedOrBeyond,
      interestedLeads: interestedOrBeyond,
      meetingsScheduled: meetingOrBeyond,
      dealsWon,
      dealsLost,
      unsubscribed,
      overallReplyRate: Math.round(overallReplyRate * 10) / 10,
      overallInterestRate: Math.round(overallInterestRate * 10) / 10,
      overallCallRate: Math.round(overallCallRate * 10) / 10,
      bounceRate: 0.3, // default safe warm-up rate
    },
    funnel,
    nicheBreakdown,
    accountHealth: {
      totalAccounts: accounts.length,
      activeAccounts: activeAccounts.length,
      totalSentToday,
      totalDailyCapacity,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
    },
    learningSummary: {
      totalExamples,
      overallEditRate,
      readyForPromotionCount,
    },
    generatedAt: new Date().toISOString(),
  };
}
