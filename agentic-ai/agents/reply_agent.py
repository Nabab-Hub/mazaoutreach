from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate

try:
    import config
    from models import get_chat_model
    from state import ReplyActionPlan
    from tools.database_tools import add_to_suppression_list
    from tools.telegram_tools import send_telegram_alert, format_reply_alert
except ImportError:
    from agentic_ai import config
    from agentic_ai.models import get_chat_model
    from agentic_ai.state import ReplyActionPlan
    from agentic_ai.tools.database_tools import add_to_suppression_list
    from agentic_ai.tools.telegram_tools import send_telegram_alert, format_reply_alert

REPLY_STRATEGY_PROMPT = """You write thoughtful, high-converting, professional email responses on behalf of senior full-stack engineer and automation specialist Sk Ahidulla.

Guidelines:
1. Greeting:
   - If contact name is a person's first name, say 'Hi [Name],'.
   - If contact name is a company or generic, greet warmly as 'Hi there,' or 'Hi Team at [Business],'.
   - NEVER greet the contact using their raw email address username (e.g., NEVER say 'Hi Gandfadexperiments,' or 'Hi Info,').

2. When the prospect is 'interested' or asks for a meeting:
   - Acknowledge their positive response enthusiastically and reference any specific timing, day, or requirement they mentioned (e.g. if they mentioned Wednesday, confirm that Wednesday works great).
   - Briefly highlight how you can help (e.g. custom web applications, automated booking/intake workflows, mobile apps, or system integrations).
   - Offer concrete next steps: provide 2 specific time options AND include your direct calendar link ({booking_link}) so they can lock in a 15-minute introductory call right away.
   - Mention what you'll review together: scoping their technical requirements, timeline, and an actionable plan.
   - Structure: Write a complete, polished 3 to 4 paragraph response (approx 75–120 words). Do NOT produce a bare 1-line reply.

3. When the prospect asks a 'question':
   - Answer their specific technical or operational question directly, clearly, and concisely based on your expertise.
   - Propose a quick 10-minute discovery call via {booking_link} to discuss how it fits their architecture.

4. When 'not_interested':
   - Thank them politely for their consideration and wish them and their business continued success.

5. When 'unsubscribe':
   - Courteously confirm their immediate removal from the outreach list with an apology for the intrusion.

IMPORTANT FORMATTING RULES:
- Output ONLY the email body text.
- Do NOT include 'Subject: ...' at the start of the body text.
- Do NOT include a closing signature (Best regards / Sk Ahidulla), as the email engine automatically attaches the official signature.
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

    # Clean and realistic contact name extraction
    raw_name = lead_dict.get("name") or reply_dict.get("lead_name") or ""
    raw_name = raw_name.strip()
    company_name = lead_dict.get("business_name") or reply_dict.get("business_name") or ""

    if not raw_name or raw_name.lower() in ("business", "lead", "client", "prospect", "unknown", "there"):
        contact_name = company_name if company_name and company_name.lower() not in ("target business", "target company", "business") else "there"
    else:
        contact_name = raw_name.split()[0]

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
            if hasattr(res, "content"):
                if isinstance(res.content, list):
                    generated_body = "".join(part.get("text", "") if isinstance(part, dict) else str(part) for part in res.content)
                else:
                    generated_body = str(res.content)
            else:
                generated_body = str(res)
        except Exception:
            generated_body = (
                f"Hi {contact_name},\n\n"
                f"Thank you for getting back to me so quickly! I would love to connect and explore how we can tailor this for your team.\n\n"
                f"I can walk you through some concrete architecture ideas, project scope, and an estimated timeline. "
                f"Feel free to pick any 15-minute slot that works best for your schedule here:\n"
                f"{config.CALENDAR_BOOKING_LINK}\n\n"
                f"Looking forward to our conversation!"
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
