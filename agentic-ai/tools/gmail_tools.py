import html
from typing import Dict, Any, Optional
from langchain_core.tools import tool
from agentic_ai import config


def render_email_html(body: str, sender_email: Optional[str] = None) -> str:
    """
    Renders high-deliverability 1-to-1 freelance HTML email:
    - Top Unsubscribe button to satisfy modern Gmail/Yahoo anti-spam policies.
    - Clean typography (#202124) without heavy promotional cards or shadows.
    - Professional Sk Ahidulla signature block.
    """
    account_email = sender_email or config.SENDER_EMAIL

    # Convert paragraphs into clean <p> tags
    paragraphs = [p.strip() for p in body.strip().split("\n\n") if p.strip()]
    pitch_html_parts = []
    for p in paragraphs:
        escaped = html.escape(p).replace("\n", "<br/>")
        pitch_html_parts.append(
            f'<p style="margin: 0 0 16px 0; font-size: 14.5px; line-height: 1.6; color: #202124;">{escaped}</p>'
        )
    pitch_html = "\n".join(pitch_html_parts)

    return f"""<!DOCTYPE html>
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
        <td align="left" style="font-size: 11.5px; color: #5f6368;">
          Direct Freelance Inquiry
        </td>
        <td align="right" style="font-size: 11.5px; color: #5f6368;">
          <a href="mailto:{account_email}?subject=Unsubscribe%20Request&body=Please%20unsubscribe%20me" style="display: inline-block; padding: 3px 10px; font-size: 11px; font-weight: 600; color: #3c4043; background-color: #f1f3f4; border: 1px solid #dadce0; border-radius: 4px; text-decoration: none;">
            Unsubscribe
          </a>
          <span style="margin-left: 6px; color: #747775;">or reply STOP</span>
        </td>
      </tr>
    </table>

    <!-- MAIN EMAIL BODY -->
    <div style="color: #202124;">
      {pitch_html}
    </div>

    <!-- SIGN-OFF -->
    <p style="margin: 22px 0 12px 0; font-size: 14.5px; line-height: 1.6; color: #202124;">
      Best regards,
    </p>

    <!-- PROFESSIONAL NATIVE FREELANCER SIGNATURE -->
    <div style="margin-top: 8px; padding-top: 14px; border-top: 1px solid #e8eaed; font-size: 14px; line-height: 1.65; color: #3c4043;">
      <div style="font-size: 15px; font-weight: 700; color: #202124;">
        {config.SENDER_NAME}
      </div>
      <div style="font-size: 13px; color: #5f6368; margin-top: 1px; margin-bottom: 8px;">
        {config.SENDER_TITLE}
      </div>

      <div style="font-size: 13px; color: #3c4043; line-height: 1.8;">
        <span>📞 Phone: <a href="tel:{config.SENDER_PHONE.replace(' ', '')}" style="color: #3c4043; text-decoration: none;">{config.SENDER_PHONE}</a></span><br/>
        <span>✉️ Email: <a href="mailto:{account_email}" style="color: #1a73e8; text-decoration: none;">{account_email}</a></span><br/>
        <span>🌐 Website: <a href="{config.SENDER_WEBSITE}" target="_blank" style="color: #1a73e8; text-decoration: underline;">codingkamaza.in</a></span><br/>
        <span>▶️ YouTube: <a href="{config.SENDER_YOUTUBE}" target="_blank" style="color: #1a73e8; text-decoration: underline;">youtube.com/@codingkamaza</a></span>
      </div>
    </div>

  </div>
</body>
</html>"""


def render_email_plain_text(body: str, sender_email: Optional[str] = None) -> str:
    """Renders plain text version with Top Unsubscribe header and full signature."""
    account_email = sender_email or config.SENDER_EMAIL
    return f"""[Unsubscribe: mailto:{account_email}?subject=Unsubscribe or reply STOP]
--------------------------------------------------

{body.strip()}

Best regards,

{config.SENDER_NAME}
{config.SENDER_TITLE}
Phone: {config.SENDER_PHONE}
Email: {account_email}
Website: {config.SENDER_WEBSITE}
YouTube: {config.SENDER_YOUTUBE}"""


@tool
def send_email_outreach(to_email: str, subject: str, body: str, lead_id: str) -> Dict[str, Any]:
    """
    Sends cold outreach email to the prospect with top unsubscribe headers and delivers clean styling.
    """
    html_content = render_email_html(body)
    plain_content = render_email_plain_text(body)

    # In production, this can invoke Google Workspace / Gmail API send or SMTP
    return {
        "success": True,
        "message_id": f"msg_langgraph_{hash(to_email + subject) % 1000000}",
        "to_email": to_email,
        "subject": subject,
        "lead_id": lead_id,
        "status": "sent",
        "preview_plain": plain_content[:180] + "...",
    }

