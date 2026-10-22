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
 * Strips previous signatures, disclaimer blocks, or messy nested tags from the pitch body
 */
export function cleanPitchBody(body: string): string {
  let text = (body || '').trim();

  // Strip unsubscribe lines or disclaimers
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
 * Ensures standard plain text representation for UI draft review
 */
export function ensureDefaultSignature(body: string): string {
  const pitch = cleanPitchBody(body);
  return `${pitch}\n\n${DEFAULT_EMAIL_SIGNATURE}\n\n${COMPLIANCE_OPT_OUT}`;
}

/**
 * Generates an aesthetic, high-converting HTML email with responsive typography,
 * modern professional signature card, and a dedicated Unsubscribe button.
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

      // Convert any clean links
      clean = clean.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" style="color: #2563eb; font-weight: 500; text-decoration: underline;">$1</a>'
      );

      // Preserve single line breaks within paragraphs
      const lines = clean.replace(/\r?\n/g, '<br/>');
      return `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.65; color: #1e293b;">${lines}</p>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Engineering Collaboration</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="background-color: #f8fafc; padding: 24px 12px;">
    <table cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <tr>
        <td style="padding: 32px 28px 28px 28px;">
          <!-- Pitch Body -->
          <div style="color: #1e293b;">
            ${pitchHtml}
          </div>

          <!-- Signoff -->
          <div style="margin-top: 24px; font-size: 15px; color: #1e293b;">
            Best regards,
          </div>

          <!-- Professional Freelancer Signature Card -->
          <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 14px; padding-top: 18px; border-top: 2px solid #e2e8f0; width: 100%;">
            <tr>
              <td>
                <div style="font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: -0.2px;">
                  ${DEFAULT_SENDER_NAME}
                </div>
                <div style="font-size: 13px; color: #64748b; font-weight: 500; margin-top: 2px; margin-bottom: 12px;">
                  ${DEFAULT_SENDER_TITLE}
                </div>
                
                <!-- Contact items -->
                <div style="font-size: 13px; color: #334155; margin-bottom: 14px; line-height: 1.8;">
                  <span style="display: inline-block; margin-right: 16px;">
                    📞 <a href="tel:${DEFAULT_SENDER_PHONE}" style="color: #334155; text-decoration: none; font-weight: 500;">${DEFAULT_SENDER_PHONE_DISPLAY}</a>
                  </span>
                  <span style="display: inline-block;">
                    ✉️ <a href="mailto:${DEFAULT_SENDER_EMAIL}" style="color: #2563eb; text-decoration: none; font-weight: 500;">${DEFAULT_SENDER_EMAIL}</a>
                  </span>
                </div>

                <!-- Credibility Buttons: Website & YouTube -->
                <div style="margin-top: 4px;">
                  <a href="${DEFAULT_SENDER_WEBSITE}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; margin-right: 8px; margin-bottom: 6px;">
                    🌐 Website &amp; Portfolio
                  </a>
                  <a href="${DEFAULT_SENDER_YOUTUBE}" target="_blank" style="display: inline-block; background-color: #ef4444; color: #ffffff !important; padding: 7px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; margin-bottom: 6px;">
                    ▶️ Coding Ka Maza (YouTube)
                  </a>
                </div>
              </td>
            </tr>
          </table>

          <!-- Dedicated Unsubscribe Footer with Button -->
          <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 36px; padding-top: 16px; border-top: 1px dashed #cbd5e1; width: 100%;">
            <tr>
              <td style="font-size: 11px; color: #94a3b8; line-height: 1.6;">
                <div style="margin-bottom: 8px;">
                  You received this email regarding prospective software development and engineering automations.
                </div>
                <div>
                  No longer interested? 
                  <a href="mailto:${accountEmail}?subject=Unsubscribe%20Request&body=Please%20unsubscribe%20me%20from%20future%20emails" style="display: inline-block; background-color: #f1f5f9; color: #475569; padding: 3px 9px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 11px; border: 1px solid #cbd5e1; margin-left: 4px; margin-right: 4px;">
                    🛑 Unsubscribe
                  </a>
                  or simply reply with <strong>STOP</strong>.
                </div>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Generates an aesthetic, readable plain text version with clear spacing
 */
export function renderEmailPlainText(body: string, senderEmail?: string): string {
  const pitch = cleanPitchBody(body);
  const accountEmail = senderEmail || DEFAULT_SENDER_EMAIL;

  return `${pitch}

Best regards,

${DEFAULT_SENDER_NAME}
${DEFAULT_SENDER_TITLE}
Phone: ${DEFAULT_SENDER_PHONE_DISPLAY}
Email: ${DEFAULT_SENDER_EMAIL}
Website: ${DEFAULT_SENDER_WEBSITE}
YouTube: ${DEFAULT_SENDER_YOUTUBE}

--------------------------------------------------
To unsubscribe, click mailto:${accountEmail}?subject=Unsubscribe or reply STOP.`;
}
