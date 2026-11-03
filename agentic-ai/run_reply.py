import _setup_path
import sys

from agentic_ai.graphs.orchestrator import run_reply_processing_pipeline
from agentic_ai import config


def main():
    print("=" * 70)
    print("[*] AGENTIC AI INBOUND REPLY HANDLER (LangChain + LangGraph + LangSmith)")
    print("=" * 70)
    print(f"[*] LangSmith Tracing: {'ENABLED' if config.LANGCHAIN_TRACING_V2 else 'DISABLED'}")
    print(f"[*] Telegram Alerts: {'ENABLED' if config.TELEGRAM_BOT_TOKEN else 'DISABLED'}")
    print("-" * 70)

    # Simulated incoming reply from a hot prospect
    sample_reply = {
        "id": "reply-demo-99",
        "lead_id": "lead-demo-101",
        "from_email": "dr.rohit@apexspinecare.com",
        "subject": "Re: Quick question regarding Apex Spine & Orthopedic Clinic",
        "body": "Hi Sk, thanks for reaching out. Yes, we actually really need an automated WhatsApp reminder system and appointment portal. How much do you charge, and can we set up a quick 10 min call this Thursday afternoon?",
    }

    sample_lead = {
        "id": "lead-demo-101",
        "name": "Dr. Rohit Sen",
        "business_name": "Apex Spine & Orthopedic Clinic",
        "email": "dr.rohit@apexspinecare.com",
    }

    print(f"[Inbound] Processing Incoming Reply From: {sample_reply['from_email']}")
    print(f"[Message] Body:\n\"{sample_reply['body']}\"")
    print("-" * 70)

    result = run_reply_processing_pipeline(sample_reply, sample_lead)

    print("\n[Logs] Pipeline Execution Logs:")
    for log in result.get("logs", []):
        print(f"  {log}")

    classification = result.get("classification", {})
    action_plan = result.get("action_plan", {})

    print("\n" + "=" * 70)
    print("[ClassifierAgent] Reply Classification:")
    print(f"  - Category: {classification.get('classification', '').upper()}")
    print(f"  - Sentiment: {classification.get('sentiment', '').upper()}")
    print(f"  - Confidence: {classification.get('confidence')}")
    print(f"  - Urgency: {classification.get('urgency', '').upper()}")
    print(f"  - Key Intent: {classification.get('key_question_or_intent')}")

    print("\n" + "=" * 70)
    print("[ReplyAgent] Autonomous Response Plan:")
    print(f"  - Action Type: {action_plan.get('action_type')}")
    print(f"  - Telegram Alert Sent: {action_plan.get('telegram_alert_sent')}")
    print(f"  - Auto-Send Immediately: {action_plan.get('send_immediately')}")
    print("-" * 70)
    print("DRAFTED RESPONSE TO PROSPECT:")
    print(action_plan.get("reply_body", ""))
    print("=" * 70)
    print("[SUCCESS] Inbound reply processing completed successfully!")


if __name__ == "__main__":
    main()
