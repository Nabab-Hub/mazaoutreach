from typing import Dict, Any, Literal
from langgraph.graph import StateGraph, START, END
from agentic_ai.state import ReplyState
from agentic_ai.agents.classifier_agent import classify_reply_node
from agentic_ai.agents.reply_agent import handle_reply_action_node
from agentic_ai.tools.gmail_tools import send_email_outreach


def dispatch_reply_node(state: ReplyState) -> Dict[str, Any]:
    """Node: Dispatches the autonomous response to the prospect if approved."""
    action_plan = state.get("action_plan", {})
    reply = state.get("reply", {})
    from_email = reply.get("from_email", "")

    logs = state.get("logs", [])

    if not action_plan.get("send_immediately") or not action_plan.get("reply_body"):
        logs.append(f"[DispatchReply] Reply marked as '{action_plan.get('action_type')}'. No email dispatched.")
        return {"sent_result": {"status": "no_email_needed"}, "logs": logs}

    subject = action_plan.get("reply_subject", f"Re: {reply.get('subject', 'Outreach')}")
    body = action_plan.get("reply_body", "")

    result = send_email_outreach.invoke({
        "to_email": from_email,
        "subject": subject,
        "body": body,
        "lead_id": reply.get("lead_id", "unknown"),
    })

    logs.append(f"[DispatchReply] Dispatched response to {from_email}")
    return {"sent_result": result, "logs": logs}


def create_reply_graph() -> StateGraph:
    """Builds and compiles the Inbound Reply Processing LangGraph workflow."""
    workflow = StateGraph(ReplyState)

    # Nodes
    workflow.add_node("classify_reply", classify_reply_node)
    workflow.add_node("formulate_action", handle_reply_action_node)
    workflow.add_node("dispatch_reply", dispatch_reply_node)

    # Edges
    workflow.add_edge(START, "classify_reply")
    workflow.add_edge("classify_reply", "formulate_action")
    workflow.add_edge("formulate_action", "dispatch_reply")
    workflow.add_edge("dispatch_reply", END)

    return workflow.compile()


reply_app = create_reply_graph()

