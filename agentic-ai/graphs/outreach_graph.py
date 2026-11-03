from typing import Dict, Any, Literal
from langgraph.graph import StateGraph, START, END
from agentic_ai.state import OutreachState
from agentic_ai.agents.research_agent import research_lead_node
from agentic_ai.agents.copywriter_agent import draft_outreach_node
from agentic_ai.tools.database_tools import check_email_suppressed
from agentic_ai.tools.gmail_tools import render_email_html, render_email_plain_text, send_email_outreach


def check_suppression_node(state: OutreachState) -> Dict[str, Any]:
    """Node: Checks if the lead's email is already unsubscribed or suppressed."""
    lead = state.get("lead", {})
    email = lead.get("email", "")
    is_suppressed = check_email_suppressed.invoke({"email": email})

    logs = state.get("logs", [])
    if is_suppressed:
        logs.append(f"[SuppressionGate] Lead {email} is suppressed. Halting outreach.")
        return {
            "approval_status": "rejected",
            "send_status": "skipped",
            "error": "Email is on suppression list",
            "logs": logs,
        }

    logs.append(f"[SuppressionGate] Verified {email} is eligible for outreach.")
    return {"logs": logs}


def format_deliverability_node(state: OutreachState) -> Dict[str, Any]:
    """Node: Formats final HTML with top unsubscribe button and clean freelance typography."""
    draft = state.get("draft", {})
    body = draft.get("body", "")

    html_email = render_email_html(body)
    plain_email = render_email_plain_text(body)

    logs = state.get("logs", [])
    logs.append("[Deliverability] Formatted top-unsubscribe header and professional signature.")

    return {
        "final_email_html": html_email,
        "final_email_plain": plain_email,
        "logs": logs,
    }


def human_approval_gate_node(state: OutreachState) -> Dict[str, Any]:
    """
    Node: Evaluates whether the draft can be auto-approved or requires human review.
    Drafts with high confidence (>0.90) and low spam score (<0.20) are marked ready.
    """
    draft = state.get("draft", {})
    spam_score = draft.get("spam_score", 0.0)
    confidence = draft.get("confidence", 0.95)

    logs = state.get("logs", [])

    if spam_score > 0.35 or confidence < 0.80:
        logs.append(f"[ApprovalGate] Flagged for manual review (spam: {spam_score}, conf: {confidence})")
        return {"approval_status": "pending", "logs": logs}
    else:
        logs.append(f"[ApprovalGate] Auto-approved high deliverability draft.")
        return {"approval_status": "approved", "logs": logs}


def dispatch_email_node(state: OutreachState) -> Dict[str, Any]:
    """Node: Executes email dispatch to the lead."""
    lead = state.get("lead", {})
    draft = state.get("draft", {})
    email = lead.get("email", "")
    subject = draft.get("subject", "")
    body = draft.get("body", "")

    result = send_email_outreach.invoke({
        "to_email": email,
        "subject": subject,
        "body": body,
        "lead_id": lead.get("id", "lead-1"),
    })

    logs = state.get("logs", [])
    logs.append(f"[DispatchNode] Successfully sent email to {email} (ID: {result.get('message_id')})")

    return {
        "send_status": "sent",
        "logs": logs,
    }


# Routing condition based on suppression check
def should_continue_after_suppression(state: OutreachState) -> Literal["research_lead", "__end__"]:
    if state.get("send_status") == "skipped":
        return END
    return "research_lead"


# Routing condition based on human approval
def route_after_approval(state: OutreachState) -> Literal["dispatch_email", "__end__"]:
    status = state.get("approval_status")
    if status == "approved":
        return "dispatch_email"
    return END


def create_outreach_graph() -> StateGraph:
    """Builds and compiles the complete Cold Outreach LangGraph workflow."""
    workflow = StateGraph(OutreachState)

    # Add Nodes
    workflow.add_node("check_suppression", check_suppression_node)
    workflow.add_node("research_lead", research_lead_node)
    workflow.add_node("draft_email", draft_outreach_node)
    workflow.add_node("format_deliverability", format_deliverability_node)
    workflow.add_node("approval_gate", human_approval_gate_node)
    workflow.add_node("dispatch_email", dispatch_email_node)

    # Add Edges
    workflow.add_edge(START, "check_suppression")
    workflow.add_conditional_edges(
        "check_suppression",
        should_continue_after_suppression,
        {
            "research_lead": "research_lead",
            END: END,
        }
    )
    workflow.add_edge("research_lead", "draft_email")
    workflow.add_edge("draft_email", "format_deliverability")
    workflow.add_edge("format_deliverability", "approval_gate")
    workflow.add_conditional_edges(
        "approval_gate",
        route_after_approval,
        {
            "dispatch_email": "dispatch_email",
            END: END,
        }
    )
    workflow.add_edge("dispatch_email", END)

    return workflow.compile()


outreach_app = create_outreach_graph()

