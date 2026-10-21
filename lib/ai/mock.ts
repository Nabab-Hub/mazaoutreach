import { AIProvider, AIProviderOptions } from './provider';

export class MockAIProvider implements AIProvider {
  name = 'mock' as const;

  isAvailable(): boolean {
    return true;
  }

  async generate(opts: AIProviderOptions): Promise<string> {
    // If json mode is requested, detect task type and return realistic JSON payload
    if (opts.json) {
      if (opts.prompt.includes('Classify the reply') || opts.system.includes('Classify the reply')) {
        const text = opts.prompt.toLowerCase();
        if (text.includes('stop') || text.includes('unsubscribe') || text.includes('remove me')) {
          return JSON.stringify({
            classification: 'unsubscribe',
            sentiment: 'neutral',
            summary: 'Prospect requested to be removed from the outreach list.',
            needsHuman: false,
            suggestedAction: 'stop',
          });
        }
        if (text.includes('not interested') || text.includes('no thanks') || text.includes('pass for now') || text.includes('already have')) {
          return JSON.stringify({
            classification: 'not_interested',
            sentiment: 'negative',
            summary: 'Prospect declined and indicated they are not currently interested.',
            needsHuman: false,
            suggestedAction: 'stop',
          });
        }
        if (text.includes('price') || text.includes('how much') || text.includes('cost') || text.includes('quote') || text.includes('rate card')) {
          return JSON.stringify({
            classification: 'question',
            sentiment: 'neutral',
            summary: 'Prospect asked about pricing rates and delivery timeframe.',
            needsHuman: true,
            suggestedAction: 'send_reply',
          });
        }

        return JSON.stringify({
          classification: 'interested',
          sentiment: 'positive',
          summary: 'Prospect showed interest and asked about availability for a brief call next week.',
          needsHuman: false,
          suggestedAction: 'Send calendar scheduling link',
        });
      }

      // Check if this is reply drafting
      if (opts.system.includes('reply to a prospect') || opts.prompt.includes('### Prospect Reply:')) {
        const nameMatch = opts.prompt.match(/- Name:\s*([^\n\r]+)/i);
        const bizMatch = opts.prompt.match(/- Business:\s*([^\n\r]+)/i);
        const linkMatch = opts.prompt.match(/### Booking Link:\s*([^\n\r]+)/i);
        const catMatch = opts.prompt.match(/- Category:\s*([^\n\r]+)/i);

        const name = nameMatch ? nameMatch[1].trim() : 'there';
        const firstName = name.split(' ')[0] || 'there';
        const business = bizMatch ? bizMatch[1].trim() : 'your business';
        const calendarLink = linkMatch ? linkMatch[1].trim() : 'https://cal.com/alexvance/10min';
        const category = (catMatch ? catMatch[1].trim() : 'interested').toLowerCase();

        if (category === 'not_interested') {
          return JSON.stringify({
            subject: 'Re: Follow up',
            body: `Hi ${firstName},\n\nThank you for letting me know! Wishing you and ${business} continued success.\n\nBest regards,\nAlex Vance\n\nReply STOP to unsubscribe.`,
          });
        }

        return JSON.stringify({
          subject: 'Re: Follow up',
          body: `Hi ${firstName},\n\nThanks for getting back to me! I would be delighted to connect and explore how we can tailor this for ${business}.\n\nFeel free to pick any 10-15 minute slot that suits your schedule using my calendar link below:\n${calendarLink}\n\nLooking forward to speaking!\n\nBest regards,\nAlex Vance\n\nReply STOP to unsubscribe.`,
        });
      }

      // Check if this is niche inference / lead enrichment
      if (opts.system.includes('validation and enrichment agent') || opts.prompt.includes('Inspect this lead:')) {
        const text = opts.prompt.toLowerCase();
        let niche = 'other';
        let notes = 'Software workflow automation and digital integrations.';

        if (text.includes('cricket') || text.includes('fitness') || text.includes('gym') || text.includes('club') || text.includes('academy')) {
          niche = 'club';
          notes = 'Member registration portal, recurring payment collection & digital QR check-in flow.';
        } else if (text.includes('youtube') || text.includes('creator') || text.includes('podcast') || text.includes('art') || text.includes('substack')) {
          niche = 'creator';
          notes = 'Personal brand platform, private community hub & member digital course portal.';
        } else if (text.includes('clinic') || text.includes('dental') || text.includes('doctor') || text.includes('skincare') || text.includes('derma')) {
          niche = 'clinic';
          notes = 'Automated appointment scheduling & WhatsApp confirmation reminders to reduce missed visits.';
        } else if (text.includes('sweet') || text.includes('shop') || text.includes('bakery') || text.includes('store') || text.includes('boutique')) {
          niche = 'shop';
          notes = 'Online ordering storefront, WhatsApp catalog orders & local delivery routing.';
        }

        const bizMatch = opts.prompt.match(/Business Name:\s*([^\n\r]+)/i);
        const nameMatch = opts.prompt.match(/Name:\s*([^\n\r]+)/i);

        let biz = bizMatch ? bizMatch[1].trim() : '';
        if (!biz || biz.toLowerCase() === 'missing' || biz.toLowerCase() === 'none') {
          biz = 'Prospective Business';
        }

        return JSON.stringify({
          niche,
          businessName: biz,
          name: nameMatch ? nameMatch[1].trim() : 'Business Owner',
          notes,
        });
      }

      // Check if this is personalization
      const nameMatch = opts.prompt.match(/Name:\s*([^\n\r]+)/i);
      const bizMatch = opts.prompt.match(/Business Name:\s*([^\n\r]+)/i);
      const nicheMatch = opts.prompt.match(/Niche:\s*([^\n\r]+)/i);
      const roleMatch = opts.prompt.match(/Role:\s*([^\n\r]+)/i);

      const name = nameMatch ? nameMatch[1].trim() : 'there';
      const firstName = name.split(' ')[0] || 'there';
      const business = bizMatch ? bizMatch[1].trim() : 'your business';
      const niche = (nicheMatch ? nicheMatch[1].trim() : '').toLowerCase();

      let subject = `Quick question regarding ${business}`;
      let specificIdea = `streamline your client onboarding and automate daily operational workflows`;

      if (niche.includes('real_estate') || niche.includes('estate') || niche.includes('property')) {
        subject = `Idea for ${business}: Automated property inquiry follow-ups`;
        specificIdea = `implement an instant WhatsApp inquiry responder and interactive property portfolio viewer for prospective buyers`;
      } else if (niche.includes('health') || niche.includes('clinic')) {
        subject = `Patient booking portal & reminder workflow for ${business}`;
        specificIdea = `deploy an automated patient scheduling interface with automated WhatsApp/SMS reminders to reduce no-shows`;
      } else if (niche.includes('saas') || niche.includes('tech')) {
        subject = `Scaling engineering & API integrations at ${business}`;
        specificIdea = `accelerate your product roadmap by building custom microservice APIs and modern Next.js client portals`;
      } else if (niche.includes('shop') || niche.includes('commerce')) {
        subject = `Boosting repeat checkout conversion for ${business}`;
        specificIdea = `set up custom checkout upsells and automated cart recovery automations`;
      } else if (niche.includes('club') || niche.includes('fitness')) {
        subject = `Digital member booking & check-in system for ${business}`;
        specificIdea = `launch a smooth mobile-responsive class reservation and recurring membership renewal workflow`;
      }

      const body = `Hi ${firstName},

I came across ${business} recently while researching prominent operators in your space. 

As a freelance software engineer specializing in high-performance web applications and workflow automations, I noticed an opportunity to ${specificIdea}.

In similar implementations, this helped save 10+ hours of manual administration weekly while improving customer conversion rates without bloating overhead.

Are you open to a brief 10-minute introductory call this Thursday or Friday to explore if this would be valuable for ${business}?

Best regards,
Outreach Partner

Reply STOP to unsubscribe.`;

      const wordCount = body.trim().split(/\s+/).length;

      return JSON.stringify({
        subject,
        body,
        confidence: 0.94,
        reasoning: `Tailored specific operational value proposition for ${business} based on ${niche || 'B2B'} domain patterns. Maintained 90-150 word length and single soft CTA.`,
        wordCount,
      });
    }

    return 'Mock AI generation completed successfully.';
  }
}
