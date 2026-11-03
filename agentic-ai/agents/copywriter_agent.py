import re
from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from agentic_ai.models import get_chat_model
from agentic_ai.state import EmailDraft
from agentic_ai.tools.spam_checker import analyze_email_spam_risk

COPYWRITER_SYSTEM_PROMPT = """You write short, friendly, high-converting 1-to-1 cold emails for a software developer named Sk Ahidulla.
Services: Modern responsive websites, mobile apps, SaaS, backend APIs, WhatsApp/chatbots, custom automations.

Strict Deliverability & Quality Rules:
1. Subject line: Conversational, lowercase or natural casing, under 7 words (e.g., "Quick question regarding {business_name}", "Idea for {business_name}'s web setup", "Dev question for {name}"). NEVER use hype words (Free, Guarantee, 100%, Boost, Urgent, $$$) or exclamation marks.
2. Email Body: 80 to 130 words maximum. Written in a genuine, polite, human tone. Point out 1-2 practical, specific improvements based on their company description.
3. Call to Action: A single relaxed invitation for a brief 10-minute introductory chat.
4. DO NOT write the sign-off or signature in the body (that is appended automatically).

Return strictly structured data matching EmailDraft:
- subject: string
- body: string (without signature)
- reasoning: strategic justification
- confidence: float between 0 and 1
"""

COPYWRITER_PROMPT_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system", COPYWRITER_SYSTEM_PROMPT),
    ("human", """Generate outreach for this prospect:
- Contact Name: {name}
- Business Name: {business_name}
- Niche: {niche}
- Company Summary: {company_summary}
- Target Audience: {target_audience}
- Identified Tech Opportunities: {tech_points}
- Recommended Pitch Angle: {recommended_angle}
"""),
])


def draft_outreach_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph node: Drafts personalized cold email and performs deliverability quality inspection.
    """
    lead_dict = state.get("lead", {})
    research_dict = state.get("research", {})
    llm = get_chat_model(temperature=0.35)

    contact_name = lead_dict.get("name") or "there"
    business_name = lead_dict.get("business_name") or "your company"

    try:
        structured_llm = llm.with_structured_output(EmailDraft)
        chain = COPYWRITER_PROMPT_TEMPLATE | structured_llm
        draft_result = chain.invoke({
            "name": contact_name,
            "business_name": business_name,
            "niche": lead_dict.get("niche", "b2b"),
            "company_summary": research_dict.get("company_summary", "Professional services company"),
            "target_audience": research_dict.get("target_audience", "Clients"),
            "tech_points": ", ".join(research_dict.get("potential_tech_pain_points", [])),
            "recommended_angle": research_dict.get("recommended_angle", "Tech optimization"),
        })
        draft_data = draft_result.model_dump()
    except Exception as e:
        # Fallback template
        body_text = (
            f"Hi {contact_name},\n\n"
            f"I came across {business_name} and was really impressed by your focus on your clients. "
            f"I specialize in building custom web applications and workflow automations that help businesses streamline their operations and customer intake.\n\n"
            f"I noticed a couple of areas where a custom portal or automated workflow could save your team significant time each week.\n\n"
            f"Would you be open to a quick 10-minute introductory chat sometime this week?"
        )
        draft_data = {
            "subject": f"Quick question regarding {business_name}",
            "body": body_text,
            "reasoning": "Fallback clean 1-to-1 freelance outreach angle.",
            "confidence": 0.90,
            "word_count": len(body_text.split()),
            "spam_score": 0.0,
            "spam_warnings": [],
        }

    # Perform automated Spam & Deliverability Check Tool
    spam_analysis = analyze_email_spam_risk.invoke({
        "subject": draft_data["subject"],
        "body": draft_data["body"]
    })

    draft_data["spam_score"] = spam_analysis["spam_score"]
    draft_data["spam_warnings"] = spam_analysis["warnings"]
    draft_data["word_count"] = spam_analysis["word_count"]

    logs = state.get("logs", [])
    logs.append(
        f"[CopywriterAgent] Drafted email for {business_name} ({draft_data['word_count']} words, spam score: {draft_data['spam_score']})"
    )

    return {
        "draft": draft_data,
        "logs": logs,
    }

