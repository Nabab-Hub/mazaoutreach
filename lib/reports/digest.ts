import { generateAnalyticsReport } from './analytics';
import { getReplies } from '../firebase/replies';
import { getDrafts } from '../firebase/drafts';
import { sendTelegramAlert } from '../notify/telegram';
import { sendGmailMessage } from '../gmail/send';

export interface DigestDispatchResult {
  sentTelegram: boolean;
  sentEmail: boolean;
  summaryText: string;
  generatedAt: string;
}

/**
 * Builds and dispatches the 8 PM Daily Outreach Digest
 */
export async function dispatchDailyDigest(): Promise<DigestDispatchResult> {
  const [report, replies, drafts] = await Promise.all([
    generateAnalyticsReport(),
    getReplies(),
    getDrafts({ status: 'pending' }),
  ]);

  const interestedReplies = replies.filter((r) => r.classification === 'interested');
  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Construct Markdown & HTML summaries
  const lines: string[] = [
    `📊 <b>Daily Outreach Digest — ${todayDateStr}</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📤 <b>Sends Today:</b> ${report.accountHealth.totalSentToday} / ${report.accountHealth.totalDailyCapacity} capacity (${report.accountHealth.utilizationRate}%)`,
    `💬 <b>Total Inbound Replies:</b> ${report.overview.repliedLeads} (${report.overview.overallReplyRate}% reply rate)`,
    `🔥 <b>Hot Interested Leads:</b> ${report.overview.interestedLeads} (${report.overview.overallInterestRate}%)`,
    `⏳ <b>Pending in Approval Queue:</b> ${drafts.length} drafts`,
    `🛡️ <b>Account Health:</b> ${report.accountHealth.activeAccounts}/${report.accountHealth.totalAccounts} accounts active (Bounce rate: ${report.overview.bounceRate}%)`,
    ``,
    `🎯 <b>Top Interested Prospects:</b>`,
  ];

  if (interestedReplies.length === 0) {
    lines.push(`<i>No new replies marked interested today.</i>`);
  } else {
    interestedReplies.slice(0, 4).forEach((r) => {
      const biz = r.lead?.businessName || r.fromEmail;
      lines.push(`• <b>${biz}</b>: "${r.summary || r.snippet.slice(0, 80)}"`);
    });
  }

  if (report.learningSummary.readyForPromotionCount > 0) {
    lines.push(``);
    lines.push(`⭐ <b>Autonomy Promotion Ready:</b> ${report.learningSummary.readyForPromotionCount} niche(s) have reached 20+ unedited approvals.`);
  }

  lines.push(``);
  lines.push(`👉 <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reports">Open Analytics Dashboard</a>`);

  const summaryHtml = lines.join('\n');
  const summaryPlainText = lines
    .join('\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&');

  // 1. Send via Telegram Bot
  let sentTelegram = false;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (token && chatId && !token.includes('your_') && !chatId.includes('your_')) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: summaryHtml,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
      sentTelegram = res.ok;
    } catch (e) {
      console.warn('[DailyDigest] Telegram send failed:', e);
    }
  } else {
    console.log(`[DailyDigest Simulation (Telegram)]\n${summaryPlainText}`);
    sentTelegram = true;
  }

  // 2. Send via Email to Owner
  let sentEmail = false;
  const ownerEmail = process.env.OWNER_EMAIL;

  if (ownerEmail && !ownerEmail.includes('your_')) {
    try {
      const sent = await sendGmailMessage({
        to: ownerEmail,
        subject: `📊 Daily Outreach Digest: ${report.overview.interestedLeads} Interested Leads | ${todayDateStr}`,
        body: summaryPlainText,
        skipDelay: true,
      });
      sentEmail = sent.status === 'sent';
    } catch (e) {
      console.warn('[DailyDigest] Owner email send failed:', e);
    }
  } else {
    console.log(`[DailyDigest Simulation (Email)]\nOwner: ${ownerEmail || 'alex@alexvance.dev'}\n${summaryPlainText}`);
    sentEmail = true;
  }

  return {
    sentTelegram,
    sentEmail,
    summaryText: summaryPlainText,
    generatedAt: new Date().toISOString(),
  };
}
