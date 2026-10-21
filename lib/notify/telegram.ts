export interface TelegramAlertOpts {
  leadName: string;
  businessName: string;
  niche: string;
  classification: string;
  summary: string;
  replySnippet: string;
  needsHuman: boolean;
  dashboardUrl?: string;
}

export async function sendTelegramAlert(opts: TelegramAlertOpts): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const dashboardUrl = opts.dashboardUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const icon = opts.classification === 'interested' ? '🔥' : '⚠️';
  const tag = opts.needsHuman ? '🚨 [REQUIRES HUMAN ATTENTION]' : '🎯 [NEW INTERESTED PROSPECT]';

  const messageText = `${icon} <b>${tag}</b>

<b>Lead:</b> ${opts.leadName} (${opts.businessName})
<b>Niche:</b> ${opts.niche}
<b>Category:</b> ${opts.classification.toUpperCase()}

<b>Summary:</b>
<i>"${opts.summary}"</i>

<b>Prospect Message:</b>
<blockquote>${opts.replySnippet.slice(0, 200)}...</blockquote>

👉 <a href="${dashboardUrl}/pipeline">Open Pipeline Dashboard</a>`;

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
