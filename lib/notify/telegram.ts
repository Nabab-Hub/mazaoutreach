export interface TelegramAlertOpts {
  leadName: string;
  businessName: string;
  niche: string;
  classification: string;
  summary: string;
  replySnippet: string;
  needsHuman: boolean;
  autoReplied?: boolean;
  dashboardUrl?: string;
}

export async function sendTelegramAlert(opts: TelegramAlertOpts): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const dashboardUrl = opts.dashboardUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  let icon = '💬';
  let tag = '💬 [NEW PROSPECT REPLY]';

  if (opts.classification === 'interested') {
    icon = '🔥';
    tag = '🎯 [HOT PROSPECT - INTERESTED!]';
  } else if (opts.classification === 'question') {
    icon = '❓';
    tag = '❓ [PROSPECT QUESTION]';
  } else if (opts.classification === 'not_interested') {
    icon = 'ℹ️';
    tag = 'ℹ️ [PROSPECT DECLINED / NOT INTERESTED]';
  } else if (opts.classification === 'unsubscribe') {
    icon = '🛑';
    tag = '🛑 [OPT-OUT / UNSUBSCRIBE]';
  }

  if (opts.needsHuman) {
    tag = `🚨 [HUMAN ATTENTION NEEDED] • ${tag}`;
  }

  const autoReplyStatus = opts.autoReplied
    ? '✅ <b>Auto-Reply:</b> Sent immediately to prospect in thread with calendar link.'
    : '⏳ <b>Auto-Reply:</b> Prepared in Approval Queue for 1-click send.';

  const messageText = `${icon} <b>${tag}</b>

<b>Lead:</b> ${opts.leadName} (${opts.businessName})
<b>Niche:</b> ${opts.niche || 'B2B'}
<b>Category:</b> ${opts.classification.toUpperCase()}

<b>Summary:</b>
<i>"${opts.summary}"</i>

<b>Prospect Message:</b>
<blockquote>${(opts.replySnippet || '').slice(0, 300)}</blockquote>

${autoReplyStatus}

👉 <a href="${dashboardUrl}/pipeline">Pipeline Dashboard</a> • <a href="${dashboardUrl}/approvals">Approval Queue</a>`;

  if (!token || !chatId || token.includes('your_') || chatId.includes('your_')) {
    console.log(`[TelegramAlert (Simulation)]\n${messageText.replace(/<[^>]+>/g, '')}`);
    return true;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`[TelegramAlert] Failed to send Telegram message [${res.status}]: ${err}`);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn('[TelegramAlert] Network error sending Telegram message:', err.message);
    return false;
  }
}
