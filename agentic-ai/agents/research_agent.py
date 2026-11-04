from typing import Dict, Any
from langchain_core.prompts import ChatPromptTemplate

try:
    from models import get_chat_model
    from state import ResearchResult
except ImportError:
    from agentic_ai.models import get_chat_model
    from agentic_ai.state import ResearchResult

RESEARCH_SYSTEM_PROMPT = """You are a senior B2B Technical Researcher and Lead Qualification Analyst.
Your goal is to inspect a prospect business, understand what they do from their company description and niche,
and pinpoint high-value software engineering or automation opportunities tailored to full-stack developer Sk Ahidulla.

Sk Ahidulla's Capabilities:
- Modern responsive web apps (Next.js, React, Tailwind)
- Mobile apps (Flutter / React Native)
- SaaS & Client Portals
- Backend APIs & Microservices (Python, Node.js)
- WhatsApp bots, AI chatbots & customer support automations
- Custom workflow automations and integrations

Given the lead information, analyze:
1. Clear summary of what the company does.
2. Who their target audience or customers are.
3. 2-3 specific practical tech/software bottlenecks or growth angles.
4. The single best angle to pitch Sk Ahidulla's expertise.
"""

RESEARCH_PROMPT_TEMPLATE = ChatPromptTemplate.from_messages([
    ("system", RESEARCH_SYSTEM_PROMPT),
    ("human", """Analyze this lead:
- Business Name: {business_name}
- Contact Person: {name}
- Industry Niche: {niche}
- Company Description: {company_description}
- Website: {website}
- City: {city}
- Notes: {notes}
"""),
])


def research_lead_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    LangGraph node: Analyzes lead details and generates strategic research insights.
    """
    lead_dict = state.get("lead", {})
    llm = get_chat_model(temperature=0.2)

    try:
        structured_llm = llm.with_structured_output(ResearchResult)
        chain = RESEARCH_PROMPT_TEMPLATE | structured_llm
        research_result = chain.invoke({
            "business_name": lead_dict.get("business_name", "Target Business"),
            "name": lead_dict.get("name", "Team"),
            "niche": lead_dict.get("niche", "b2b"),
            "company_description": lead_dict.get("company_description", "Software / Service company"),
            "website": lead_dict.get("website", "N/A"),
            "city": lead_dict.get("city", "N/A"),
            "notes": lead_dict.get("notes", "None"),
        })
        research_data = research_result.model_dump()
    except Exception as e:
        # Fallback if model doesn't support structured output directly
        research_data = {
            "company_summary": lead_dict.get("company_description", f"Business in {lead_dict.get('niche', 'B2B')}"),
            "target_audience": "Prospective clients and end-users",
            "potential_tech_pain_points": [
                "Manual workflows and lack of custom automation",
                "Need for an upgraded modern client-facing web application"
            ],
            "recommended_angle": "Offer a fast 10-min review of their existing tech setup."
        }

    logs = state.get("logs", [])
    logs.append(f"[ResearchAgent] Completed analysis for {lead_dict.get('business_name')}")

    return {
        "research": research_data,
        "logs": logs,
    }
