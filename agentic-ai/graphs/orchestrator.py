from typing import List, Dict, Any
from agentic_ai.graphs.outreach_graph import outreach_app
from agentic_ai.graphs.reply_graph import reply_app


def run_lead_outreach_pipeline(lead_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes the full LangGraph Outreach workflow for a single lead:
    Suppression Check -> Research Agent -> Copywriter Agent -> Format & Anti-Spam -> Approval Gate -> Dispatch.
    """
    initial_state = {
        "lead": lead_data,
        "logs": [f"[Orchestrator] Initiated outreach pipeline for {lead_data.get('email')}"],
        "followup_number": 0,
    }
    final_state = outreach_app.invoke(initial_state)
    return final_state


def run_reply_processing_pipeline(
    reply_data: Dict[str, Any],
    lead_data: Dict[str, Any] = None,
    previous_outreach: str = None
) -> Dict[str, Any]:
    """
    Executes the full LangGraph Inbound Reply workflow:
    Classifier Agent -> Action Plan & Telegram Alert -> Dispatch / Suppression.
    """
    initial_state = {
        "reply": reply_data,
        "lead": lead_data or {},
        "previous_outreach": previous_outreach or "",
        "logs": [f"[Orchestrator] Processing inbound reply from {reply_data.get('from_email')}"],
    }
    final_state = reply_app.invoke(initial_state)
    return final_state

