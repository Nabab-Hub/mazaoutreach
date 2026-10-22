export const DEFAULT_SENDER_NAME = 'Sk Ahidulla';
export const DEFAULT_SENDER_PHONE = '+918609720621';
export const DEFAULT_SENDER_EMAIL = 'skahidulla568@gmail.com';
export const DEFAULT_SENDER_YOUTUBE = 'https://youtube.com/@codingkamaza';
export const DEFAULT_SENDER_WEBSITE = 'https://www.codingkamaza.in';

export const DEFAULT_EMAIL_SIGNATURE = `Best regards,
Sk Ahidulla
+918609720621
skahidulla568@gmail.com
[Youtube](https://youtube.com/@codingkamaza)
[Website](https://www.codingkamaza.in)`;

export const COMPLIANCE_OPT_OUT = 'Reply STOP to unsubscribe.';

/**
 * Ensures the email body ends with Sk Ahidulla's official signature and opt-out compliance
 */
export function ensureDefaultSignature(body: string): string {
  let text = (body || '').trim();

  // Strip existing unsubscribe line first
  text = text.replace(/(\r?\n)*Reply STOP to unsubscribe\.?\s*$/i, '').trim();

  // If already contains the full contact block, just ensure compliance line
  if (text.includes('skahidulla568@gmail.com') && text.includes('+918609720621')) {
    return `${text}\n\n${COMPLIANCE_OPT_OUT}`;
  }

  // Strip older placeholder signoffs (e.g. Best regards, Alex Vance, Sincerely, [Your Name], etc.)
  text = text.replace(
    /(\r?\n)*(?:Best(?:\s+regards)?|Warm(?:\s+regards)?|Kind(?:\s+regards)?|Cheers|Sincerely|Thanks|Thank\s+you),?\s*(?:\r?\n)*(?:Alex Vance|Sk Ahidulla|\[Your Name\]|Freelance Developer|Outreach Partner)?[\s\S]*$/i,
    ''
  ).trim();

  // Also strip standalone [Your Name] or Alex Vance if at the very end
  text = text.replace(/(\r?\n)*(?:\[Your Name\]|Alex Vance)[\s\S]*$/i, '').trim();

  return `${text}\n\n${DEFAULT_EMAIL_SIGNATURE}\n\n${COMPLIANCE_OPT_OUT}`;
}
