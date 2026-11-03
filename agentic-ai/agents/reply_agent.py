from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from agentic_ai import config
from agentic_ai.models import get_chat_model
from agentic_ai.state import ReplyActionPlan
from agentic_ai.tools.database_tools import add_to_suppression_list
from agentic_ai.tools.telegram_tools import send_telegram_alert, format_reply_alert

REPLY_STRATEGY_PROMPT = """You write quick, natural, friendly email responses for full-stack engineer Sk Ahidulla.

Guidelines based on prospect classification:
1. 'interested': Thank them warmly, offer 2 available times or share the booking link ({booking_link}) to schedule a 10-minute intro call.
2. 'question': Directly and concisely answer their question based on modern web development / AI automations, then offer a brief chat.
3. 'not_interested': Thank them politely and wish them continued success. No pressure.
4. 'unsubscribe': Confirm they are removed immediately from the outreach list with an apology for the intrusion.

Keep it human, brief, and authentic.
"""

REPLY_PROMPT_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system", REPLY_STRATEGY_PROMPT),
    ("human", """Draft response for:
- Prospect Email: {from_email}
- Contact Name: {contact_name}
- Classification: {classification}
- Key Intent / Question: {key_intent}
- Prospect's Reply Message: {reply_body}
"""),
])


def handle_reply_action_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph node: Formulates the response strategy, triggers Telegram alerts, and updates suppression.
    """
    reply_dict = state.get("reply", {})
    lead_dict = state.get("lead", {})
    classification = state.get("classification", {})
    category = classification.get("classification", "other")
    from_email = reply_dict.get("from_email", "")
    contact_name = lead_dict.get("name") or from_email.split("@")[0].capitalize()

    logs = state.get("logs", [])
    alert_result = {"success": False, "skipped": True}

    # 1. Trigger Telegram Notification if High Urgency (Interested or Question)
    if category in ("interested", "question"):
        alert_msg = format_reply_alert(
            lead_name=contact_name,
            company=lead_dict.get("business_name", "Target Business"),
            email=from_email,
            category=category,
            reply_text=reply_dict.get("body", "")
        )
        alert_result = send_telegram_alert.invoke({"message": alert_msg})
        logs.append(f"[ReplyAgent] Dispatched Telegram alert for hot lead {from_email}")

    # 2. Fast-path handling for Unsubscribe / Not Interested
    if category == "unsubscribe":
        add_to_suppression_list.invoke({"email": from_email, "reason": "user_requested"})
        body_text = f"Hi {contact_name},\n\nYou have been removed from our outreach list. We apologize for any inconvenience.\n\nBest regards,\nSk Ahidulla"
        action_plan = {
            "action_type": "suppress_and_close",
            "reply_subject": f"Re: {reply_dict.get('subject', 'Outreach')}",
            "reply_body": body_text,
            "send_immediately": True,
            "telegram_alert_sent": False,
        }
    elif category == "not_interested":
        body_text = f"Hi {contact_name},\n\nThank you for letting me know! Wishing you and your team continued success.\n\nBest regards,\nSk Ahidulla"
        action_plan = {
            "action_type": "suppress_and_close",
            "reply_subject": f"Re: {reply_dict.get('subject', 'Outreach')}",
            "reply_body": body_text,
            "send_immediately": True,
            "telegram_alert_sent": False,
        }
    elif category == "out_of_office":
        action_plan = {
            "action_type": "snooze",
            "reply_subject": "",
            "reply_body": "",
            "send_immediately": False,
            "telegram_alert_sent": False,
        }
    else:
        # Generate custom AI reply for 'interested' or 'question'
        llm = get_chat_model(temperature=0.3)
        try:
            chain = REPLY_PROMPT_TEMPLATE | llm
            res = chain.invoke({
                "booking_link": config.CALENDAR_BOOKING_LINK,
                "from_email": from_email,
                "contact_name": contact_name,
                "classification": category,
                "key_intent": classification.get("key_question_or_intent", "General inquiry"),
                "reply_body": reply_dict.get("body", ""),
            })
            generated_body = res.content if hasattr(res, "content") else str(res)
        except Exception:
            generated_body = (
                f"Hi {contact_name},\n\n"
                f"Thank you for getting back to me! I would love to connect and show you a couple of practical ideas.\n\n"
                f"Feel free to grab a quick 10-minute slot that fits your schedule here: {config.CALENDAR_BOOKING_LINK}\n\n"
                f"Looking forward to speaking with you!"
            )

        action_plan = {
            "action_type": "send_calendar" if category == "interested" else "answer_question",
            "reply_subject": f"Re: {reply_dict.get('subject', 'Outreach')}",
            "reply_body": generated_body,
            "send_immediately": True,
            "telegram_alert_sent": alert_result.get("success", False),
        }

    logs.append(f"[ReplyAgent] Formulated action plan: {action_plan['action_type']}")

    return {
        "action_plan": action_plan,
        "telegram_alert": alert_result,
        "logs": logs,
    }

