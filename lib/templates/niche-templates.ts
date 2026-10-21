import { LeadNiche, NicheTemplate } from '../types';

export const DEFAULT_NICHE_TEMPLATES: Record<LeadNiche, NicheTemplate> = {
  real_estate: {
    niche: 'real_estate',
    displayName: 'Real Estate & Property Agencies',
    pitchAngle: 'Automate buyer/renter inquiry responses, instant WhatsApp property brochures, and interactive MLS listing showcases.',
    servicesToHighlight: [
      'Automated WhatsApp inquiry bot & CRM integration',
      'High-speed property showcase landing pages',
      'Virtual tour & floor plan interactive viewers',
      'Automated email lead nurturing sequences',
    ],
    tone: 'Professional, consultative, efficient, numbers-driven',
    exampleEmail: `Hi David,\n\nI noticed how rapidly Century Realty is expanding its residential portfolio in Austin.\n\nAs a software developer specializing in real estate automations, I recently built an instant inquiry responder that sends property brochures and qualifies buyer budgets via WhatsApp within 30 seconds of an inquiry. For another agency, this lifted viewing bookings by 35% without adding admin overhead.\n\nWould you be open to a 10-minute introductory call this week to see if a similar workflow makes sense for Century Realty?\n\nBest regards,\nAlex Vance\n\nReply STOP to unsubscribe.`,
    bannedPhrases: [
      'revolutionary AI',
      'guaranteed 10x ROI',
      'cheap web design',
      'best in the world',
      'act now before it is too late',
    ],
  },

  clinic: {
    niche: 'clinic',
    displayName: 'Healthcare & Medical Clinics',
    pitchAngle: 'Reduce patient no-shows, streamline digital appointment booking, and modern patient intake portals.',
    servicesToHighlight: [
      'Automated patient appointment scheduling & intake portal',
      'WhatsApp/SMS appointment reminders to curb no-shows',
      'Secure, mobile-responsive clinic website',
      'Automated Google review requests post-consultation',
    ],
    tone: 'Empathetic, reassuring, privacy-conscious, professional',
    exampleEmail: `Hi Dr. Patel,\n\nI was looking into City Dental Care and noticed your patient clinic has such strong patient reviews.\n\nAs a web and automation engineer, I help medical clinics solve the high cost of patient no-shows. By deploying a streamlined 2-click booking portal with automated WhatsApp appointment reminders 24h prior, similar clinics reduced missed appointments by over 40%.\n\nCould we do a quick 10-minute introductory call this Thursday to discuss whether this would benefit your staff and patients?\n\nWarm regards,\nAlex Vance\n\nReply STOP to unsubscribe.`,
    bannedPhrases: [
      'cure all problems',
      'cure patients',
      'guaranteed revenue explosion',
      'cheapest software',
    ],
  },

  saas: {
    niche: 'saas',
    displayName: 'SaaS & Tech Companies',
    pitchAngle: 'Accelerate engineering velocity with full-stack Next.js development, REST/GraphQL APIs, and AI copilot integrations.',
    servicesToHighlight: [
      'Next.js 14 / React modern frontend architecture',
      'Backend APIs & microservices (Node.js/Python)',
      'Stripe / LemonSqueezy billing integrations',
      'In-app AI chat and RAG search assistants',
    ],
    tone: 'Technical, crisp, peer-to-peer, pragmatic',
    exampleEmail: `Hi Marcus,\n\nI was checking out DataPulse's recent v2 release on ProductHunt—the analytics filtering is super slick.\n\nI'm a full-stack engineer specializing in Next.js, high-throughput APIs, and in-product AI assistants. I partner with seed and Series A engineering teams to knock out complex feature backlogs (like custom customer export pipelines and Stripe billing tiers) without distracting core founders.\n\nAre you available for a brief 10-minute sync this week to explore if you need extra engineering hands on upcoming sprints?\n\nCheers,\nAlex Vance\n\nReply STOP to unsubscribe.`,
    bannedPhrases: [
      'rockstar ninja coder',
      '10x developer',
      'guru',
      'cheapest overseas devs',
    ],
  },

  shop: {
    niche: 'shop',
    displayName: 'E-commerce & Retail Brands',
    pitchAngle: 'Boost average order value (AOV), cart abandonment recovery, and custom Shopify / headless commerce features.',
    servicesToHighlight: [
      'Custom Shopify app & theme extensions',
      'Automated cart abandonment & post-purchase flows',
      'Mobile checkout conversion rate optimization',
      'Inventory sync and multi-channel automations',
    ],
    tone: 'Conversion-focused, energetic, practical',
    exampleEmail: `Hi Sarah,\n\nI love what Velvet & Oak has done with your seasonal organic apparel collection.\n\nAs an e-commerce developer, I specialize in checkout conversion and post-purchase retention. I recently built a 1-click upsell and personalized cart reminder system for a direct-to-consumer apparel brand that boosted mobile order value by 18% in under 6 weeks.\n\nWould you have 10 minutes open for a quick introductory chat this Friday to see if this could boost your store revenue ahead of peak season?\n\nBest,\nAlex Vance\n\nReply STOP to unsubscribe.`,
    bannedPhrases: [
      'get rich quick',
      'drop shipping secrets',
      'unlimited sales guarantee',
    ],
  },

  club: {
    niche: 'club',
    displayName: 'Fitness, Sports & Member Clubs',
    pitchAngle: 'Digital member check-ins, automated class scheduling, and seamless recurring subscription payments.',
    servicesToHighlight: [
      'Mobile-friendly class & facility reservation system',
      'Automated membership renewal & card expiry alerts',
      'Digital member QR code check-in kiosk',
      'Trainer booking and package management portal',
    ],
    tone: 'Vibrant, community-oriented, straightforward',
    exampleEmail: `Hi Vikram,\n\nI came across Apex Fitness Club while looking at premier training facilities in Bandra.\n\nI build tailored digital booking and member management portals for fitness clubs. By replacing manual WhatsApp slot bookings with an automated class scheduling portal and automated renewal reminders, clubs like yours typically recover 15+ hours of front-desk time every week.\n\nAre you open to a 10-minute introductory call this week to see how this could work for Apex Fitness?\n\nBest regards,\nAlex Vance\n\nReply STOP to unsubscribe.`,
    bannedPhrases: [
      'get ripped fast',
      'miracle gym software',
      'cheap software',
    ],
  },

  creator: {
    niche: 'creator',
    displayName: 'Content Creators & Media Brands',
    pitchAngle: 'Custom community hubs, digital course/membership platforms, and sponsored brand collaboration portals.',
    servicesToHighlight: [
      'Custom digital merchandise & course storefront',
      'Private subscriber community platform',
      'Automated media kit and sponsorship inquiry pipeline',
      'Newsletter landing pages with high conversion',
    ],
    tone: 'Creative, direct, collaborative, culturally fluent',
    exampleEmail: `Hi Liam,\n\nI really enjoyed your recent breakdown on modern developer workflows—the pacing was spot on.\n\nI'm a full-stack developer who helps creators build custom digital platforms beyond relying solely on third-party algorithms. Whether that is a dedicated member portal, custom paywalled content hub, or an automated sponsor booking intake, I make sure creators own their customer relationships directly.\n\nWould you be open to a 10-minute chat this week to bounce a few ideas around for your channel's web presence?\n\nBest,\nAlex Vance\n\nReply STOP to unsubscribe.`,
    bannedPhrases: [
      'viral hack',
      'go viral overnight',
      'influencer automation hack',
    ],
  },

  agency: {
    niche: 'agency',
    displayName: 'Agencies & Consulting Firms',
    pitchAngle: 'White-label web development, client reporting portals, and internal process automations.',
    servicesToHighlight: [
      'Reliable white-label Next.js & mobile app development',
      'Automated client onboarding & intake dashboard',
      'Custom KPI analytics & report generation portals',
      'Third-party API & CRM workflow integrations',
    ],
    tone: 'Strategic, dependable, partner-oriented',
    exampleEmail: `Hi Rachel,\n\nI've been following Elevate Media's creative campaigns and loved your recent branding work with FinTech clients.\n\nI partner with creative agencies as a technical build partner, providing reliable white-label development for web applications, client dashboards, and custom integrations so your team can pitch and deliver complex tech projects without hiring full-time engineers.\n\nWould you be open to a 10-minute introductory call to see if having a dedicated technical partner on call would be helpful for upcoming client briefs?\n\nWarm regards,\nAlex Vance\n\nReply STOP to unsubscribe.`,
    bannedPhrases: [
      'outsourced labor',
      'cheap subcontracting',
      'rockstar vendor',
    ],
  },

  other: {
    niche: 'other',
    displayName: 'General B2B & Professional Services',
    pitchAngle: 'Modern web applications, custom workflow automations, and intelligent AI chatbots to save operational hours.',
    servicesToHighlight: [
      'Modern web & mobile application development',
      'Custom internal operations dashboards & portals',
      'Workflow automations & CRM integrations',
      'Custom AI chatbots for support and qualification',
    ],
    tone: 'Professional, consultative, clear, pragmatic',
    exampleEmail: `Hi Jordan,\n\nI came across your business while researching innovative companies in your sector.\n\nAs a freelance software engineer, I partner with established teams to build modern web applications, internal dashboards, and workflow automations that eliminate repetitive administrative hours and improve client conversion.\n\nAre you open to a brief 10-minute introductory call this week to explore if any custom technical projects would save your team time this quarter?\n\nBest regards,\nAlex Vance\n\nReply STOP to unsubscribe.`,
    bannedPhrases: [
      'disruptive synergy',
      'guaranteed 10x growth',
      'cheap offshore devs',
    ],
  },
};

// In-memory store initialized with defaults (can be customized via UI or loaded from Firestore)
let dynamicTemplates: Record<LeadNiche, NicheTemplate> = { ...DEFAULT_NICHE_TEMPLATES };

export function getNicheTemplate(niche: LeadNiche): NicheTemplate {
  return dynamicTemplates[niche] || dynamicTemplates.other;
}

export function getAllNicheTemplates(): NicheTemplate[] {
  return Object.values(dynamicTemplates);
}

export function updateNicheTemplate(niche: LeadNiche, updates: Partial<NicheTemplate>): NicheTemplate {
  const current = dynamicTemplates[niche] || DEFAULT_NICHE_TEMPLATES[niche] || DEFAULT_NICHE_TEMPLATES.other;
  dynamicTemplates[niche] = {
    ...current,
    ...updates,
    niche,
  };
  return dynamicTemplates[niche];
}

export function resetNicheTemplates(): void {
  dynamicTemplates = { ...DEFAULT_NICHE_TEMPLATES };
}
