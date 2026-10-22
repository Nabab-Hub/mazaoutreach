export const DEFAULT_SENDER_NAME = 'Sk Ahidulla';
export const DEFAULT_SENDER_TITLE = 'Full-Stack Engineer & Automation Specialist';
export const DEFAULT_SENDER_PHONE = '+918609720621';
export const DEFAULT_SENDER_PHONE_DISPLAY = '+91 86097 20621';
export const DEFAULT_SENDER_EMAIL = 'skahidulla568@gmail.com';
export const DEFAULT_SENDER_YOUTUBE = 'https://youtube.com/@codingkamaza';
export const DEFAULT_SENDER_WEBSITE = 'https://www.codingkamaza.in';

export const DEFAULT_EMAIL_SIGNATURE = `Best regards,

Sk Ahidulla
Full-Stack Engineer & Automation Specialist
Phone: +91 86097 20621
Email: skahidulla568@gmail.com
Website: https://www.codingkamaza.in
YouTube: https://youtube.com/@codingkamaza`;

export const COMPLIANCE_OPT_OUT = 'Reply STOP to unsubscribe.';

/**
 * Strips previous signatures, top unsubscribe bars, or disclaimers from the pitch body
 */
export function cleanPitchBody(body: string): string {
  let text = (body || '').trim();

  // Strip top unsubscribe bar/header if present (e.g. from previously formatted plain text drafts)
  text = text.replace(/^\[(?:Unsubscribe|Opt-out)[^\]]*\]\s*[-—_]*\s*/i, '').trim();

  // Strip unsubscribe lines or disclaimers at the bottom
  text = text.replace(/(\r?\n)*[-—_]{2,}[\s\S]*$/i, '').trim();
  text = text.replace(/(\r?\n)*(?:To unsubscribe|Reply STOP to unsubscribe|No longer wish to receive)[\s\S]*$/i, '').trim();

  // Strip signoffs and contact blocks (Sk Ahidulla, Alex Vance, [Your Name], etc.)
  text = text.replace(
    /(\r?\n)*(?:Best(?:\s+regards)?|Warm(?:\s+regards)?|Kind(?:\s+regards)?|Cheers|Sincerely|Thanks|Thank\s+you),?\s*(?:\r?\n)*(?:Alex Vance|Sk Ahidulla|\[Your Name\]|Freelance Developer|Outreach Partner)?[\s\S]*$/i,
    ''
  ).trim();

  // Strip standalone trailing contact information if present
  text = text.replace(/(\r?\n)*(?:Sk Ahidulla|\+91\s*8609720621|skahidulla568@gmail\.com)[\s\S]*$/i, '').trim();
  text = text.replace(/(\r?\n)*(?:\[Your Name\]|Alex Vance)[\s\S]*$/i, '').trim();

  return text;
}

/**
 * Ensures standard plain text representation for UI draft review with Unsubscribe at the TOP
 */
export function ensureDefaultSignature(body: string, senderEmail?: string): string {
  const pitch = cleanPitchBody(body);
  const email = senderEmail || DEFAULT_SENDER_EMAIL;

  return `[Unsubscribe: mailto:${email}?subject=Unsubscribe or reply STOP]
--------------------------------------------------

${pitch}

Best regards,

${DEFAULT_SENDER_NAME}
${DEFAULT_SENDER_TITLE}
Phone: ${DEFAULT_SENDER_PHONE_DISPLAY}
Email: ${email}
Website: ${DEFAULT_SENDER_WEBSITE}
YouTube: ${DEFAULT_SENDER_YOUTUBE}`;
}

/**
 * Generates a clean, 1-to-1 personal freelance HTML email with:
 * - Unsubscribe button at the very TOP
 * - Native Gmail typography (no bulk newsletter card frames, shadows, or marketing banners that trigger Spam)
 * - Professional developer signature
 */
export function renderEmailHtml(body: string, senderEmail?: string): string {
  const pitch = cleanPitchBody(body);
  const accountEmail = senderEmail || DEFAULT_SENDER_EMAIL;

  // Split pitch by double newlines into clean paragraphs
  const paragraphs = pitch.split(/\r?\n\r?\n/);
  const pitchHtml = paragraphs
    .map((p) => {
      // Escape HTML
      let clean = p
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Convert any plain URLs into clean links
      clean = clean.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" style="color: #1a73e8; text-decoration: underline;">$1</a>'
      );

      // Preserve single line breaks within paragraphs
      const lines = clean.replace(/\r?\n/g, '<br/>');
      return `<p style="margin: 0 0 16px 0; font-size: 14.5px; line-height: 1.6; color: #202124;">${lines}</p>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Freelance Inquiry</title>
</head>
<body style="margin: 0; padding: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14.5px; line-height: 1.6; color: #202124; background-color: #ffffff;">
  <div style="max-width: 620px; margin: 0 auto;">

    <!-- TOP HEADER WITH UNSUBSCRIBE BUTTON -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #e8eaed;">
      <tr>
        <td align="left" style="font-size: 11.5px; color: #5f6368; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          Direct Freelance Inquiry
        </td>
        <td align="right" style="font-size: 11.5px; color: #5f6368; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <a href="mailto:${accountEmail}?subject=Unsubscribe%20Request&body=Please%20unsubscribe%20me" style="display: inline-block; padding: 3px 10px; font-size: 11px; font-weight: 600; color: #3c4043; background-color: #f1f3f4; border: 1px solid #dadce0; border-radius: 4px; text-decoration: none;">
            Unsubscribe
          </a>
          <span style="margin-left: 6px; color: #747775;">or reply STOP</span>
        </td>
      </tr>
    </table>

    <!-- MAIN EMAIL BODY -->
    <div style="color: #202124;">
      ${pitchHtml}
    </div>

    <!-- SIGN-OFF -->
    <p style="margin: 22px 0 12px 0; font-size: 14.5px; line-height: 1.6; color: #202124;">
      Best regards,
    </p>

    <!-- PROFESSIONAL NATIVE FREELANCER SIGNATURE -->
    <div style="margin-top: 8px; padding-top: 14px; border-top: 1px solid #e8eaed; font-size: 14px; line-height: 1.65; color: #3c4043;">
      <div style="font-size: 15px; font-weight: 700; color: #202124;">
        ${DEFAULT_SENDER_NAME}
      </div>
      <div style="font-size: 13px; color: #5f6368; margin-top: 1px; margin-bottom: 8px;">
        ${DEFAULT_SENDER_TITLE}
      </div>

      <div style="font-size: 13px; color: #3c4043; line-height: 1.8;">
        <span>📞 Phone: <a href="tel:${DEFAULT_SENDER_PHONE}" style="color: #3c4043; text-decoration: none;">${DEFAULT_SENDER_PHONE_DISPLAY}</a></span><br/>
        <span>✉️ Email: <a href="mailto:${accountEmail}" style="color: #1a73e8; text-decoration: none;">${accountEmail}</a></span><br/>
        <span>🌐 Website: <a href="${DEFAULT_SENDER_WEBSITE}" target="_blank" style="color: #1a73e8; text-decoration: underline;">codingkamaza.in</a></span><br/>
        <span>▶️ YouTube: <a href="${DEFAULT_SENDER_YOUTUBE}" target="_blank" style="color: #1a73e8; text-decoration: underline;">youtube.com/@codingkamaza</a></span>
      </div>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Generates an aesthetic, readable plain text version with Unsubscribe at the top
 */
export function renderEmailPlainText(body: string, senderEmail?: string): string {
  const pitch = cleanPitchBody(body);
  const accountEmail = senderEmail || DEFAULT_SENDER_EMAIL;

  return `[Unsubscribe: mailto:${accountEmail}?subject=Unsubscribe or reply STOP]
--------------------------------------------------

${pitch}

Best regards,

${DEFAULT_SENDER_NAME}
${DEFAULT_SENDER_TITLE}
Phone: ${DEFAULT_SENDER_PHONE_DISPLAY}
Email: ${accountEmail}
Website: ${DEFAULT_SENDER_WEBSITE}
YouTube: ${DEFAULT_SENDER_YOUTUBE}`;
}

