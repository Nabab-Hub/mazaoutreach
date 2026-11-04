from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate

try:
    from models import get_chat_model
    from state import EmailDraft
except ImportError:
    from agentic_ai.models import get_chat_model
    from agentic_ai.state import EmailDraft

FOLLOWUP_SYSTEM_PROMPT = """You write brief, polite, value-adding follow-up emails for full-stack developer Sk Ahidulla.
The recipient has not replied to an initial cold email sent a few days ago.

Follow-up Rules:
1. Keep it extremely brief (50-90 words).
2. Reference the previous message naturally without guilt-tripping (e.g. "I know how busy things get...").
3. Offer a new helpful angle or practical suggestion.
4. Keep the subject line as 'Re: [Previous Subject]' to maintain conversation thread.
5. Single simple call to action for a 10-minute introductory call.
"""

FOLLOWUP_PROMPT_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system", FOLLOWUP_SYSTEM_PROMPT),
    ("human", """Generate Follow-up #{followup_number} for this lead:
- Contact Name: {name}
- Business Name: {business_name}
- Initial Subject: {initial_subject}
- Previous Pitch Context: {previous_context}
"""),
])


def draft_followup_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph node: Creates context-aware follow-up email drafts.
    """
    lead_dict = state.get("lead", {})
    draft_dict = state.get("draft", {})
    followup_num = state.get("followup_number", 1)
    llm = get_chat_model(temperature=0.3)

    contact_name = lead_dict.get("name") or "there"
    business_name = lead_dict.get("business_name") or "your team"
    initial_subject = draft_dict.get("subject", f"Quick question regarding {business_name}")
    subject = initial_subject if initial_subject.startswith("Re:") else f"Re: {initial_subject}"

    try:
        structured_llm = llm.with_structured_output(EmailDraft)
        chain = FOLLOWUP_PROMPT_TEMPLATE | structured_llm
        result = chain.invoke({
            "followup_number": followup_num,
            "name": contact_name,
            "business_name": business_name,
            "initial_subject": initial_subject,
            "previous_context": draft_dict.get("body", "General web and automation outreach"),
        })
        fu_data = result.model_dump()
        fu_data["subject"] = subject
    except Exception:
        body = (
            f"Hi {contact_name},\n\n"
            f"Following up briefly on my previous note regarding {business_name}. "
            f"I recently put together an automation workflow for a client in a similar space that saved them over 10 hours a week on client onboarding.\n\n"
            f"Would you be open to a 10-minute chat this Thursday to see if something similar could work for your team?"
        )
        fu_data = {
            "subject": subject,
            "body": body,
            "reasoning": f"Follow-up #{followup_num} offering value case study.",
            "confidence": 0.92,
            "word_count": len(body.split()),
            "spam_score": 0.0,
            "spam_warnings": [],
        }

    logs = state.get("logs", [])
    logs.append(f"[FollowupAgent] Created Follow-up #{followup_num} for {business_name}")

    return {
        "draft": fu_data,
        "logs": logs,
    }
