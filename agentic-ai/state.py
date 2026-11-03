from typing import List, Optional, Dict, Any, Literal
from typing_extensions import TypedDict
from pydantic import BaseModel, Field


# ------------------------------------------------------------------------------
# Pydantic Schemas for Structured Data
# ------------------------------------------------------------------------------

class LeadModel(BaseModel):
    id: str = Field(description="Unique identifier for the lead")
    name: str = Field(default="", description="Contact person name")
    business_name: str = Field(description="Business or company name")
    email: str = Field(description="Prospect email address")
    niche: str = Field(default="b2b", description="Industry niche (e.g., creator, clinic, club, saas, b2b)")
    company_description: Optional[str] = Field(default="", description="Description of what the business does")
    website: Optional[str] = Field(default="", description="Business website URL")
    city: Optional[str] = Field(default="", description="City or location")
    notes: Optional[str] = Field(default="", description="Additional context or pain points")
    custom_fields: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ResearchResult(BaseModel):
    company_summary: str = Field(description="Clear summary of what the company does")
    target_audience: str = Field(description="Who their customers or users are")
    potential_tech_pain_points: List[str] = Field(description="1-3 realistic software/tech gaps or growth opportunities")
    recommended_angle: str = Field(description="Best angle to pitch Sk Ahidulla's engineering/automation skills")


class EmailDraft(BaseModel):
    subject: str = Field(description="Compelling, conversational subject line under 7 words")
    body: str = Field(description="Concise 80-130 word email body without signature")
    reasoning: str = Field(description="Strategic justification for this angle")
    confidence: float = Field(default=0.95, description="Confidence score between 0 and 1")
    word_count: int = Field(default=0, description="Word count of the body")
    spam_score: float = Field(default=0.0, description="Spam risk score (0.0 = safe, 1.0 = high risk)")
    spam_warnings: List[str] = Field(default_factory=list, description="Deliverability warning notes if any")


class InboundReply(BaseModel):
    id: str = Field(default="", description="Reply ID")
    lead_id: str = Field(description="Associated lead ID")
    from_email: str = Field(description="Sender email address")
    subject: str = Field(description="Reply subject line")
    body: str = Field(description="Reply email body")
    received_at: Optional[str] = Field(default="", description="Timestamp of reply")


class ClassificationResult(BaseModel):
    classification: Literal[
        "interested",
        "question",
        "meeting_booked",
        "not_interested",
        "unsubscribe",
        "out_of_office",
        "other"
    ] = Field(description="Category of the inbound prospect reply")
    sentiment: Literal["positive", "neutral", "negative"] = Field(description="Sentiment tone")
    confidence: float = Field(description="Classification confidence score 0.0 - 1.0")
    key_question_or_intent: str = Field(description="Extracted key query or intent")
    urgency: Literal["high", "medium", "low"] = Field(default="medium", description="Urgency level")
    reasoning: str = Field(description="Reason for classification")


class ReplyActionPlan(BaseModel):
    action_type: Literal["send_calendar", "answer_question", "suppress_and_close", "snooze", "manual_review"]
    reply_subject: str = Field(description="Reply email subject line")
    reply_body: str = Field(description="Email reply body to send back")
    send_immediately: bool = Field(default=True, description="Whether this response is safe to send autonomously")
    telegram_alert_sent: bool = Field(default=False)


# ------------------------------------------------------------------------------
# LangGraph State Schemas
# ------------------------------------------------------------------------------

class OutreachState(TypedDict, total=False):
    """State for the Cold Outreach & Follow-up StateGraph."""
    lead: Dict[str, Any]
    research: Optional[Dict[str, Any]]
    draft: Optional[Dict[str, Any]]
    final_email_html: Optional[str]
    final_email_plain: Optional[str]
    approval_status: Literal["pending", "approved", "rejected", "edited"]
    send_status: Literal["queued", "sent", "failed", "skipped"]
    followup_number: int
    logs: List[str]
    error: Optional[str]


class ReplyState(TypedDict, total=False):
    """State for the Inbound Reply Processing StateGraph."""
    reply: Dict[str, Any]
    lead: Optional[Dict[str, Any]]
    previous_outreach: Optional[str]
    classification: Optional[Dict[str, Any]]
    action_plan: Optional[Dict[str, Any]]
    sent_result: Optional[Dict[str, Any]]
    telegram_alert: Optional[Dict[str, Any]]
    logs: List[str]
    error: Optional[str]


class MasterOrchestratorState(TypedDict, total=False):
    """Top-level multi-agent state encompassing pipeline monitoring and dispatch."""
    active_leads: List[Dict[str, Any]]
    inbound_replies: List[Dict[str, Any]]
    processed_count: int
    alerts_triggered: int
    system_status: str

