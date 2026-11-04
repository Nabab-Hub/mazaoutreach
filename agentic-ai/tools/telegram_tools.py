import html
import requests
from typing import Optional, Dict, Any
from langchain_core.tools import tool
try:
    import config
except ImportError:
    from agentic_ai import config


@tool
def send_telegram_alert(message: str, parse_mode: str = "HTML") -> Dict[str, Any]:
    """
    Sends an urgent real-time alert to the owner's Telegram chat.
    Used when a high-value prospect replies as 'interested' or asks a custom technical question.
    """
    bot_token = config.TELEGRAM_BOT_TOKEN
    chat_id = config.TELEGRAM_CHAT_ID

    if not bot_token or not chat_id:
        return {
            "success": False,
            "error": "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured.",
            "skipped": True,
        }

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True,
    }

    try:
        response = requests.post(url, json=payload, timeout=10)
        data = response.json()
        if data.get("ok"):
            return {"success": True, "message_id": data["result"]["message_id"]}
        else:
            return {"success": False, "error": data.get("description", "Unknown Telegram API error")}
    except Exception as e:
        return {"success": False, "error": str(e)}


def format_reply_alert(lead_name: str, company: str, email: str, category: str, reply_text: str) -> str:
    """Helper to format a sleek Telegram notification message with HTML safety escaping."""
    badge = "🔥 <b>HOT LEAD REPLY</b>" if category == "interested" else "📩 <b>NEW PROSPECT REPLY</b>"
    escaped_lead_name = html.escape(str(lead_name or "Prospect"))
    escaped_company = html.escape(str(company or "Target Business"))
    escaped_email = html.escape(str(email or ""))
    escaped_category = html.escape(str(category or "other").upper())
    escaped_reply = html.escape(str(reply_text or "")[:350])

    return (
        f"{badge}\n\n"
        f"<b>From:</b> {escaped_lead_name} ({escaped_company})\n"
        f"<b>Email:</b> <code>{escaped_email}</code>\n"
        f"<b>Category:</b> <code>{escaped_category}</code>\n\n"
        f"<b>Message:</b>\n"
        f"<i>\"{escaped_reply}{'...' if len(str(reply_text or '')) > 350 else ''}\"</i>\n\n"
        f"⚡ <i>Agentic AI Response has been drafted and action dispatched.</i>"
    )
