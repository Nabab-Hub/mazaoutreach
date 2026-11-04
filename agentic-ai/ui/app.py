"""
Interactive Gradio UI for Agentic AI Client Outreach Engine.
Allows visual testing of Lead Outreach, Inbound Reply Classification,
Follow-up Generation, Anti-Spam Deliverability, and Telegram Notifications.
Communicates via FastAPI Microservice (http://localhost:8000) with direct LangGraph fallback.
"""

import sys
import os
from pathlib import Path
import json
import requests

# Ensure parent agentic-ai directory is on sys.path
current_dir = Path(__file__).resolve().parent
agentic_dir = current_dir.parent
if str(agentic_dir) not in sys.path:
    sys.path.insert(0, str(agentic_dir))

# UTF-8 stdout configuration for Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    import config
    from graphs.orchestrator import (
        run_lead_outreach_pipeline,
        run_reply_processing_pipeline,
        run_followup_pipeline,
    )
except ImportError:
    from agentic_ai import config
    from agentic_ai.graphs.orchestrator import (
        run_lead_outreach_pipeline,
        run_reply_processing_pipeline,
        run_followup_pipeline,
    )

import gradio as gr

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")


def check_api_server_status() -> bool:
    """Checks if the FastAPI server is reachable."""
    try:
        res = requests.get(f"{API_BASE_URL}/health", timeout=1.5)
        return res.status_code == 200
    except Exception:
        return False


def get_server_health_info() -> str:
    """Returns markdown description of current backend status."""
    is_live = check_api_server_status()
    tracing = "ENABLED" if config.LANGCHAIN_TRACING_V2 else "DISABLED"
    tele = "ENABLED" if config.TELEGRAM_BOT_TOKEN else "DISABLED"
    mode_text = (
        f"🟢 **FastAPI Microservice Connected** (`{API_BASE_URL}`)"
        if is_live
        else "🟡 **Direct LangGraph Engine Mode** (FastAPI server offline; running in-process)"
    )

    return f"""### 🖥️ Backend Status:
- **Connection Mode:** {mode_text}
- **Default LLM:** `{config.DEFAULT_LLM_PROVIDER.upper()}` (`{config.DEFAULT_LLM_MODEL}`)
- **LangSmith Tracing:** `{tracing}` (Project: `{config.LANGCHAIN_PROJECT}`)
- **Telegram Instant Alerts:** `{tele}`
- **Sender Profile:** `{config.SENDER_NAME}` | `{config.SENDER_EMAIL}` | `{config.SENDER_PHONE}`
- **Booking Link:** [{config.CALENDAR_BOOKING_LINK}]({config.CALENDAR_BOOKING_LINK})
"""


# ------------------------------------------------------------------------------
# 1. Lead Outreach Handler
# ------------------------------------------------------------------------------
def generate_outreach_ui(
    name: str,
    business_name: str,
    email: str,
    niche: str,
    company_description: str,
    website: str,
    city: str,
    notes: str,
):
    lead_payload = {
        "id": f"lead-{hash(email) % 10000}",
        "name": name.strip(),
        "business_name": business_name.strip(),
        "email": email.strip(),
        "niche": niche.strip().lower(),
        "company_description": company_description.strip(),
        "website": website.strip(),
        "city": city.strip(),
        "notes": notes.strip(),
    }

    server_live = check_api_server_status()
    mode_badge = "🚀 *Processed via FastAPI Microservice*" if server_live else "⚡ *Processed via Direct Engine*"

    if server_live:
        try:
            res = requests.post(f"{API_BASE_URL}/api/v1/outreach", json=lead_payload, timeout=60)
            if res.status_code == 200:
                result = res.json()
            else:
                result = run_lead_outreach_pipeline(lead_payload)
        except Exception:
            result = run_lead_outreach_pipeline(lead_payload)
    else:
        result = run_lead_outreach_pipeline(lead_payload)

    research = result.get("research") or {}
    draft = result.get("draft") or {}
    spam_score = draft.get("spam_score", 0.0)
    word_count = draft.get("word_count", 0)
    confidence = draft.get("confidence", 0.95)
    approval = result.get("approval_status", "approved").upper()
    status_icon = "✅" if approval == "APPROVED" else "⚠️"

    status_card = (
        f"### {status_icon} Approval Status: **{approval}** | Deliverability Score: **{spam_score} / 1.0**\n"
        f"- **Word Count:** {word_count} words (Target: 80–130)\n"
        f"- **Confidence:** {int(confidence * 100)}%\n"
        f"- {mode_badge}"
    )

    research_md = f"""### 🔍 Research Agent Insights:
- **Company Summary:** {research.get('company_summary', 'N/A')}
- **Target Audience:** {research.get('target_audience', 'N/A')}
- **Software Bottlenecks:**
  - {"<br/>- ".join(research.get('potential_tech_pain_points', ['Custom automation opportunity']))}
- **Recommended Pitch Angle:** *"{research.get('recommended_angle', 'N/A')}"*
"""

    subject = draft.get("subject", "Quick question")
    plain_body = result.get("final_email_plain", draft.get("body", ""))
    html_preview = result.get("final_email_html", f"<pre>{plain_body}</pre>")

    logs_text = "\n".join(result.get("logs", []))

    return status_card, subject, plain_body, html_preview, research_md, logs_text


# ------------------------------------------------------------------------------
# 2. Inbound Reply Handler
# ------------------------------------------------------------------------------
def process_reply_ui(
    from_email: str,
    subject: str,
    reply_body: str,
    previous_outreach: str,
):
    reply_payload = {
        "id": f"reply-{hash(from_email) % 10000}",
        "from_email": from_email.strip(),
        "subject": subject.strip(),
        "body": reply_body.strip(),
        "previous_outreach": previous_outreach.strip(),
    }

    server_live = check_api_server_status()
    mode_badge = "🚀 *FastAPI Microservice*" if server_live else "⚡ *Direct Engine*"

    if server_live:
        try:
            res = requests.post(f"{API_BASE_URL}/api/v1/reply", json=reply_payload, timeout=60)
            if res.status_code == 200:
                result = res.json()
            else:
                result = run_reply_processing_pipeline(reply_payload, previous_outreach=previous_outreach)
        except Exception:
            result = run_reply_processing_pipeline(reply_payload, previous_outreach=previous_outreach)
    else:
        result = run_reply_processing_pipeline(reply_payload, previous_outreach=previous_outreach)

    cls_data = result.get("classification") or {}
    action_data = result.get("action_plan") or {}
    tele_data = result.get("telegram_alert") or {}

    cat = cls_data.get("classification", "other").upper()
    sent = cls_data.get("sentiment", "neutral").upper()
    urg = cls_data.get("urgency", "medium").upper()
    intent = cls_data.get("key_question_or_intent", "")

    tele_status = "🔔 **Telegram Alert Dispatched Instantly!**" if tele_data.get("success") else "⚪ No alert required (low urgency)"

    classification_card = f"""### 🏷️ Classification: **`{cat}`** ({mode_badge})
- **Sentiment:** `{sent}` | **Urgency:** `{urg}` | **Confidence:** `{cls_data.get('confidence', 0.9)}`
- **Extracted Intent:** *"{intent}"*
- **Action Type:** `{action_data.get('action_type', 'manual_review')}`
- **Telegram Notification:** {tele_status}
"""

    drafted_response = action_data.get("reply_body", "")
    response_subject = action_data.get("reply_subject", f"Re: {subject}")
    logs_text = "\n".join(result.get("logs", []))

    return classification_card, response_subject, drafted_response, logs_text


# ------------------------------------------------------------------------------
# 3. Follow-Up Sequence Generator
# ------------------------------------------------------------------------------
def generate_followup_ui(
    name: str,
    business_name: str,
    initial_subject: str,
    initial_body: str,
    followup_number: int,
):
    lead_payload = {
        "name": name.strip(),
        "business_name": business_name.strip(),
        "email": "lead@prospect.com",
    }
    draft_payload = {
        "subject": initial_subject.strip(),
        "body": initial_body.strip(),
    }

    server_live = check_api_server_status()
    if server_live:
        try:
            res = requests.post(
                f"{API_BASE_URL}/api/v1/followup",
                json={
                    "lead": lead_payload,
                    "draft": draft_payload,
                    "followup_number": followup_number,
                },
                timeout=60,
            )
            if res.status_code == 200:
                result = res.json()
            else:
                result = run_followup_pipeline(lead_payload, draft_payload, followup_number)
        except Exception:
            result = run_followup_pipeline(lead_payload, draft_payload, followup_number)
    else:
        result = run_followup_pipeline(lead_payload, draft_payload, followup_number)

    draft = result.get("draft") or {}
    subject = draft.get("subject", f"Re: {initial_subject}")
    body = draft.get("body", "")
    reasoning = draft.get("reasoning", "")
    words = draft.get("word_count", len(body.split()))

    meta_card = f"""### ✉️ Follow-Up #{followup_number} Generated
- **Word Count:** {words} words
- **Strategic Angle:** {reasoning}
- **Thread Subject:** `{subject}`
"""
    logs_text = "\n".join(result.get("logs", []))

    return meta_card, subject, body, logs_text


# ------------------------------------------------------------------------------
# GRADIO APPLICATION LAYOUT
# ------------------------------------------------------------------------------
custom_theme = gr.themes.Soft(
    primary_hue="blue",
    secondary_hue="slate",
    neutral_hue="slate",
)

with gr.Blocks(title="Agentic AI — Client Handling Engine") as demo:
    gr.Markdown(
        """# ⚡ Agentic AI Multi-Agent Client Outreach & Reply Engine
### *Powered by LangChain, LangGraph, and LangSmith | Built for Sk Ahidulla*
"""
    )

    with gr.Tabs():
        # ----------------------------------------------------------------------
        # TAB 1: COLD OUTREACH
        # ----------------------------------------------------------------------
        with gr.TabItem("🎯 1. Cold Outreach Generator"):
            gr.Markdown("Draft high-deliverability 1-to-1 cold emails with deep tech research and top-unsubscribe compliance.")

            with gr.Row():
                with gr.Column(scale=1):
                    in_name = gr.Textbox(label="Contact Name", value="Dr. Rohit Sen")
                    in_business = gr.Textbox(label="Business / Clinic Name", value="Apex Spine & Orthopedic Clinic")
                    in_email = gr.Textbox(label="Prospect Email", value="dr.rohit@apexspinecare.com")
                    in_niche = gr.Dropdown(
                        label="Industry Niche",
                        choices=["clinic", "saas", "creator", "local_business", "club", "ecommerce", "b2b"],
                        value="clinic",
                    )
                    in_desc = gr.Textbox(
                        label="Company Description / Notes",
                        lines=3,
                        value="Specialized orthopedic clinic experiencing high patient volume, seeking automated appointment scheduling, WhatsApp patient reminders, and a digital check-in web portal.",
                    )
                    in_website = gr.Textbox(label="Website", value="https://apexspinecare.com")
                    in_city = gr.Textbox(label="City", value="Kolkata")
                    in_notes = gr.Textbox(label="Additional Notes", value="Losing ~20% of bookings to phone friction.")

                    with gr.Row():
                        btn_sample_clinic = gr.Button("📋 Load Clinic Lead", size="sm")
                        btn_sample_saas = gr.Button("📋 Load SaaS Lead", size="sm")

                    btn_outreach = gr.Button("⚡ Run Outreach Pipeline", variant="primary", size="lg")

                with gr.Column(scale=1):
                    out_status = gr.Markdown(label="Status")
                    out_subject = gr.Textbox(label="Subject Line", interactive=False)
                    out_plain = gr.Textbox(label="Plain Text Email (with Signature)", lines=8, interactive=False)
                    out_research = gr.Markdown(label="Research Insights")

            with gr.Row():
                out_html = gr.HTML(label="Live HTML Email Preview (Top Unsubscribe & Branding)")

            with gr.Accordion("📜 Execution Logs", open=False):
                out_logs = gr.Textbox(label="Pipeline Logs", lines=5, interactive=False)

            # Sample Buttons Wireup
            def load_clinic():
                return (
                    "Dr. Rohit Sen",
                    "Apex Spine & Orthopedic Clinic",
                    "dr.rohit@apexspinecare.com",
                    "clinic",
                    "Specialized orthopedic clinic experiencing high patient volume, seeking automated appointment scheduling, WhatsApp patient reminders, and a digital check-in web portal.",
                    "https://apexspinecare.com",
                    "Kolkata",
                    "Losing ~20% of bookings to phone friction.",
                )

            def load_saas():
                return (
                    "Sarah Connor",
                    "SkyNet Tech Consult",
                    "sarah@skynetconsult.io",
                    "saas",
                    "Cloud migration and automated security monitoring service looking to build a self-serve onboarding portal for enterprise clients.",
                    "https://skynetconsult.io",
                    "Bengaluru",
                    "Wants custom Next.js frontend with OAuth & Stripe.",
                )

            btn_sample_clinic.click(
                load_clinic,
                outputs=[in_name, in_business, in_email, in_niche, in_desc, in_website, in_city, in_notes],
            )
            btn_sample_saas.click(
                load_saas,
                outputs=[in_name, in_business, in_email, in_niche, in_desc, in_website, in_city, in_notes],
            )

            btn_outreach.click(
                generate_outreach_ui,
                inputs=[in_name, in_business, in_email, in_niche, in_desc, in_website, in_city, in_notes],
                outputs=[out_status, out_subject, out_plain, out_html, out_research, out_logs],
            )

        # ----------------------------------------------------------------------
        # TAB 2: INBOUND REPLY & TELEGRAM ALERTS
        # ----------------------------------------------------------------------
        with gr.TabItem("📩 2. Inbound Reply & Telegram Alert"):
            gr.Markdown("Classify incoming prospect replies, trigger real-time Telegram alerts, and formulate responses.")

            with gr.Row():
                with gr.Column(scale=1):
                    in_from = gr.Textbox(label="From Email", value="dr.rohit@apexspinecare.com")
                    in_reply_subj = gr.Textbox(label="Reply Subject", value="Re: Quick question regarding Apex Spine Clinic")
                    in_reply_body = gr.Textbox(
                        label="Inbound Message Body",
                        lines=4,
                        value="Hi Sk, thanks for reaching out. Yes, we actually really need an automated WhatsApp reminder system and appointment portal. How much do you charge, and can we set up a quick 10 min call this Thursday afternoon?",
                    )
                    in_prev_context = gr.Textbox(
                        label="Previous Outreach Sent (Context)",
                        lines=2,
                        value="Initial outreach introducing Sk Ahidulla's custom clinic automation and portal development.",
                    )

                    with gr.Row():
                        btn_load_interested = gr.Button("🔥 Interested Lead", size="sm")
                        btn_load_question = gr.Button("❓ Technical Question", size="sm")
                        btn_load_unsub = gr.Button("🚫 Unsubscribe Request", size="sm")

                    btn_reply = gr.Button("🤖 Classify & Formulate Action", variant="primary", size="lg")

                with gr.Column(scale=1):
                    out_cls_card = gr.Markdown(label="Classification Details")
                    out_rep_subj = gr.Textbox(label="Response Subject", interactive=False)
                    out_rep_body = gr.Textbox(label="Drafted Response to Prospect", lines=6, interactive=False)

            with gr.Accordion("📜 Execution Logs", open=False):
                out_reply_logs = gr.Textbox(label="Reply Logs", lines=5, interactive=False)

            def load_interested():
                return (
                    "dr.rohit@apexspinecare.com",
                    "Re: Quick question regarding Apex Spine Clinic",
                    "Hi Sk, thanks for reaching out. Yes, we actually really need an automated WhatsApp reminder system and appointment portal. How much do you charge, and can we set up a quick 10 min call this Thursday afternoon?",
                    "Initial outreach offering clinic appointment automation.",
                )

            def load_question():
                return (
                    "alex@fintechsaas.co",
                    "Re: Web setup",
                    "Do you have experience building Next.js apps with real-time WebSockets and Stripe subscription billing?",
                    "Initial outreach offering full-stack Next.js web application development.",
                )

            def load_unsub():
                return (
                    "optout@domain.com",
                    "Re: Inquiry",
                    "Please remove me from your email list immediately and stop emailing me.",
                    "Cold email inquiry.",
                )

            btn_load_interested.click(load_interested, outputs=[in_from, in_reply_subj, in_reply_body, in_prev_context])
            btn_load_question.click(load_question, outputs=[in_from, in_reply_subj, in_reply_body, in_prev_context])
            btn_load_unsub.click(load_unsub, outputs=[in_from, in_reply_subj, in_reply_body, in_prev_context])

            btn_reply.click(
                process_reply_ui,
                inputs=[in_from, in_reply_subj, in_reply_body, in_prev_context],
                outputs=[out_cls_card, out_rep_subj, out_rep_body, out_reply_logs],
            )

        # ----------------------------------------------------------------------
        # TAB 3: FOLLOW-UP GENERATOR
        # ----------------------------------------------------------------------
        with gr.TabItem("🔄 3. Follow-Up Generator"):
            gr.Markdown("Sequence context-aware follow-up emails for leads that haven't responded yet.")

            with gr.Row():
                with gr.Column(scale=1):
                    fu_name = gr.Textbox(label="Contact Name", value="Dr. Rohit Sen")
                    fu_business = gr.Textbox(label="Business Name", value="Apex Spine & Orthopedic Clinic")
                    fu_init_subj = gr.Textbox(label="Initial Subject Sent", value="Quick question regarding Apex Spine Clinic")
                    fu_init_body = gr.Textbox(
                        label="Initial Email Pitch Context",
                        lines=3,
                        value="Pitched automated WhatsApp reminder system and digital check-in portal to solve appointment friction.",
                    )
                    fu_number = gr.Radio(label="Follow-Up Step", choices=[1, 2, 3], value=1)

                    btn_followup = gr.Button("✍️ Generate Follow-Up Email", variant="primary", size="lg")

                with gr.Column(scale=1):
                    out_fu_meta = gr.Markdown(label="Follow-up Info")
                    out_fu_subj = gr.Textbox(label="Follow-Up Subject", interactive=False)
                    out_fu_body = gr.Textbox(label="Drafted Follow-Up Message", lines=6, interactive=False)

            with gr.Accordion("📜 Execution Logs", open=False):
                out_fu_logs = gr.Textbox(label="Follow-Up Logs", lines=4, interactive=False)

            btn_followup.click(
                generate_followup_ui,
                inputs=[fu_name, fu_business, fu_init_subj, fu_init_body, fu_number],
                outputs=[out_fu_meta, out_fu_subj, out_fu_body, out_fu_logs],
            )

        # ----------------------------------------------------------------------
        # TAB 4: SYSTEM STATUS & OBSERVABILITY
        # ----------------------------------------------------------------------
        with gr.TabItem("📊 4. System Status & LangSmith"):
            gr.Markdown("Inspect live connectivity, environment configuration, and LangSmith tracing.")

            status_display = gr.Markdown(value=get_server_health_info())
            btn_refresh = gr.Button("🔄 Refresh Connection Status")
            btn_refresh.click(get_server_health_info, outputs=[status_display])

            gr.Markdown(
                f"""
### 🔗 Quick Links:
- 🌐 **LangSmith Observability Dashboard:** [https://smith.langchain.com](https://smith.langchain.com)
  - Project: **`{config.LANGCHAIN_PROJECT}`**
- 📄 **FastAPI Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- 🏥 **FastAPI Health Endpoint:** [http://localhost:8000/health](http://localhost:8000/health)
"""
            )


if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860))
    print(f"Starting Agentic AI Gradio UI on http://localhost:{port}...")
    demo.launch(server_name="0.0.0.0", server_port=port, share=False, theme=custom_theme)
