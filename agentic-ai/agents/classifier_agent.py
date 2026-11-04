from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate

try:
    from models import get_chat_model
    from state import ClassificationResult
except ImportError:
    from agentic_ai.models import get_chat_model
    from agentic_ai.state import ClassificationResult

CLASSIFIER_SYSTEM_PROMPT = """You are an expert Inbound Sales Email Reply Classifier for freelance engineer Sk Ahidulla.
Your job is to read an incoming prospect reply and accurately categorize it.

Categories:
- 'interested': Prospect expresses interest, curiosity, or wants to see a demo / discuss pricing / hop on a call.
- 'question': Prospect asks a technical question, portfolio inquiry, rate question, or availability question.
- 'meeting_booked': Prospect sent a calendar invite or confirmed a meeting slot.
- 'not_interested': Polite or direct rejection ("No thanks", "Not at this time", "We already have a dev team").
- 'unsubscribe': Prospect asks to be removed ("Stop", "Remove me", "Unsubscribe", "Please don't email again").
- 'out_of_office': Automated vacation / OOO auto-responder.
- 'other': Unclear, ambiguous, or irrelevant message.

Extract:
1. classification: Exactly one category above.
2. sentiment: positive, neutral, or negative.
3. confidence: 0.0 to 1.0.
4. key_question_or_intent: Short summary of what they actually asked or expressed.
5. urgency: high (interested lead or question), medium, or low.
6. reasoning: 1-sentence justification.
"""

CLASSIFIER_PROMPT_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system", CLASSIFIER_SYSTEM_PROMPT),
    ("human", """Classify this inbound reply:
- Prospect Email: {from_email}
- Previous Outreach Sent: {previous_outreach}
- Reply Subject: {reply_subject}
- Reply Body: {reply_body}
"""),
])


def classify_reply_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph node: Classifies an incoming email reply using structured LLM output.
    """
    reply_dict = state.get("reply", {})
    prev_outreach = state.get("previous_outreach", "")
    llm = get_chat_model(temperature=0.0)

    try:
        structured_llm = llm.with_structured_output(ClassificationResult)
        chain = CLASSIFIER_PROMPT_TEMPLATE | structured_llm
        classification = chain.invoke({
            "from_email": reply_dict.get("from_email", "unknown@domain.com"),
            "previous_outreach": prev_outreach or "Initial cold outreach email",
            "reply_subject": reply_dict.get("subject", ""),
            "reply_body": reply_dict.get("body", ""),
        })
        classification_data = classification.model_dump()
    except Exception as e:
        # Robust heuristic fallback
        text = reply_dict.get("body", "").lower()
        if any(w in text for w in ["stop", "unsubscribe", "remove me", "don't email"]):
            cat = "unsubscribe"
            sent = "negative"
        elif any(w in text for w in ["yes", "interested", "sure", "call", "let's talk", "demo", "pricing"]):
            cat = "interested"
            sent = "positive"
        elif "?" in text:
            cat = "question"
            sent = "neutral"
        elif any(w in text for w in ["no", "not interested", "busy", "pass"]):
            cat = "not_interested"
            sent = "neutral"
        elif any(w in text for w in ["out of office", "auto-reply", "vacation"]):
            cat = "out_of_office"
            sent = "neutral"
        else:
            cat = "other"
            sent = "neutral"

        classification_data = {
            "classification": cat,
            "sentiment": sent,
            "confidence": 0.88,
            "key_question_or_intent": reply_dict.get("body", "")[:80],
            "urgency": "high" if cat in ("interested", "question") else "low",
            "reasoning": "Heuristic fallback classification",
        }

    logs = state.get("logs", [])
    logs.append(
        f"[ClassifierAgent] Classified reply as '{classification_data['classification']}' (sentiment: {classification_data['sentiment']})"
    )

    return {
        "classification": classification_data,
        "logs": logs,
    }
