import sys
import json
from pathlib import Path

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Ensure root workspace is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agentic_ai.graphs.orchestrator import run_lead_outreach_pipeline
from agentic_ai import config


def main():
    print("=" * 70)
    print("[*] AGENTIC AI OUTREACH ENGINE (LangChain + LangGraph + LangSmith)")
    print("=" * 70)
    tracing_status = f"ENABLED (Project: {config.LANGCHAIN_PROJECT})" if config.LANGCHAIN_TRACING_V2 else "DISABLED"
    print(f"[*] LangSmith Tracing: {tracing_status}")
    print(f"[*] LLM Provider: {config.DEFAULT_LLM_PROVIDER.upper()} ({config.DEFAULT_LLM_MODEL})")
    print(f"[*] Sender: {config.SENDER_NAME} | {config.SENDER_EMAIL}")
    print("-" * 70)

    # Sample prospect lead to test
    sample_lead = {
        "id": "lead-demo-101",
        "name": "Dr. Rohit Sen",
        "business_name": "Apex Spine & Orthopedic Clinic",
        "email": "dr.rohit@apexspinecare.com",
        "niche": "clinic",
        "company_description": (
            "Specialized orthopedic clinic experiencing high patient volume, "
            "seeking automated appointment scheduling, WhatsApp patient reminders, and a digital check-in web portal."
        ),
        "website": "https://apexspinecare.com",
        "city": "Kolkata",
        "notes": "Losing about 20% of appointments due to manual phone booking friction.",
    }

    print(f"[Lead] Processing Lead: {sample_lead['name']} ({sample_lead['business_name']})")
    print("[Pipeline] Running LangGraph StateGraph workflow...")
    print("-" * 70)

    result = run_lead_outreach_pipeline(sample_lead)

    print("\n[Logs] Pipeline Execution Logs:")
    for log in result.get("logs", []):
        print(f"  {log}")

    research = result.get("research", {})
    draft = result.get("draft", {})

    print("\n" + "=" * 70)
    print("[ResearchAgent] Insights:")
    print(f"  - Summary: {research.get('company_summary')}")
    print(f"  - Tech Pain Points: {', '.join(research.get('potential_tech_pain_points', []))}")
    print(f"  - Recommended Pitch Angle: {research.get('recommended_angle')}")

    print("\n" + "=" * 70)
    print("[CopywriterAgent] Cold Outreach Email:")
    print(f"  - Subject: {draft.get('subject')}")
    print(f"  - Word Count: {draft.get('word_count')} words")
    print(f"  - Spam Score: {draft.get('spam_score')} (Risk warnings: {draft.get('spam_warnings', 'None')})")
    print(f"  - Confidence: {draft.get('confidence')}")
    print(f"  - Approval Status: {result.get('approval_status', 'pending').upper()}")
    print(f"  - Dispatch Status: {result.get('send_status', 'queued').upper()}")
    print("-" * 70)
    print("PLAIN TEXT PREVIEW (with Top Unsubscribe & Sk Ahidulla Signature):")
    print(result.get("final_email_plain", draft.get("body", "")))
    print("=" * 70)
    print("[SUCCESS] Outreach workflow completed successfully!")


if __name__ == "__main__":
    main()
