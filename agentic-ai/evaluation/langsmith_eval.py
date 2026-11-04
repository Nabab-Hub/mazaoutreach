"""
LangSmith Evaluation and Benchmarking Suite.
Runs automated test evaluations on email drafting quality, anti-spam adherence,
and reply classification accuracy with full LangSmith tracing.
"""

import sys
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Add agentic-ai directory to sys.path
agentic_dir = Path(__file__).resolve().parent.parent
if str(agentic_dir) not in sys.path:
    sys.path.insert(0, str(agentic_dir))

try:
    import config
    from graphs.orchestrator import run_lead_outreach_pipeline, run_reply_processing_pipeline
except ImportError:
    from agentic_ai import config
    from agentic_ai.graphs.orchestrator import run_lead_outreach_pipeline, run_reply_processing_pipeline


def evaluate_sample_outreach():
    """Simple test run for outreach drafting with LangSmith tracing enabled."""
    print(f"[LangSmith] Starting evaluation run under project: {config.LANGCHAIN_PROJECT}")

    test_lead = {
        "id": "eval-lead-1",
        "name": "Sarah Connor",
        "business_name": "SkyNet Tech Consult",
        "email": "sarah@skynetconsult.io",
        "niche": "saas",
        "company_description": "Cloud migration and automated security monitoring service.",
    }

    result = run_lead_outreach_pipeline(test_lead)
    draft = result.get("draft", {})
    spam_score = draft.get("spam_score", 1.0)
    word_count = draft.get("word_count", 0)

    # Verification Assertions
    assert spam_score < 0.35, f"Spam score too high: {spam_score}"
    assert 40 <= word_count <= 200, f"Word count out of range: {word_count}"
    print(f"[*] Outreach Evaluation passed! Draft word count: {word_count}, Spam score: {spam_score}")


def evaluate_sample_reply():
    """Simple test run for inbound reply classification with LangSmith tracing enabled."""
    test_reply = {
        "id": "eval-reply-1",
        "lead_id": "eval-lead-1",
        "from_email": "sarah@skynetconsult.io",
        "subject": "Re: Quick question regarding SkyNet Tech Consult",
        "body": "Hi Sk, yes we'd love to chat. Could you send over your calendar link or available times for this week?",
    }

    result = run_reply_processing_pipeline(test_reply)
    classification = result.get("classification", {})
    action_plan = result.get("action_plan", {})

    assert classification.get("classification") in ("interested", "question"), (
        f"Unexpected classification: {classification.get('classification')}"
    )
    assert action_plan.get("action_type") in ("send_calendar", "answer_question"), (
        f"Unexpected action plan: {action_plan.get('action_type')}"
    )
    print(f"[*] Reply Evaluation passed! Category: {classification.get('classification')}, Action: {action_plan.get('action_type')}")
    print(f"[*] Check your traces at: {config.LANGCHAIN_ENDPOINT} -> Project '{config.LANGCHAIN_PROJECT}'")


if __name__ == "__main__":
    evaluate_sample_outreach()
    evaluate_sample_reply()
