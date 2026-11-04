import _setup_path
import sys
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

try:
    from graphs.orchestrator import (
        run_lead_outreach_pipeline,
        run_reply_processing_pipeline,
        run_followup_pipeline,
    )
    import config
except ImportError:
    from agentic_ai.graphs.orchestrator import (
        run_lead_outreach_pipeline,
        run_reply_processing_pipeline,
        run_followup_pipeline,
    )
    from agentic_ai import config

app = FastAPI(
    title="Agentic AI Client Outreach Engine",
    description="Multi-Agent Cold Outreach, Follow-up, and Reply Automation using LangChain, LangGraph, and LangSmith.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LeadPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="lead-1")
    name: str = Field(default="")
    business_name: str = Field(default="Target Company")
    email: str
    niche: str = Field(default="b2b")
    company_description: str = Field(default="")
    website: str = Field(default="")
    city: str = Field(default="")
    notes: str = Field(default="")


class ReplyPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="")
    lead_id: str = Field(default="")
    lead_name: str = Field(default="")
    business_name: str = Field(default="")
    from_email: str
    subject: str = Field(default="")
    body: str
    previous_outreach: str = Field(default="")


class FollowUpPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lead: LeadPayload
    draft: Optional[Dict[str, Any]] = None
    followup_number: int = Field(default=1)


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Agentic AI Client Outreach Engine",
        "endpoints": ["/health", "/api/v1/outreach", "/api/v1/reply", "/api/v1/followup", "/docs"],
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "framework": "LangChain + LangGraph",
        "langsmith_tracing": config.LANGCHAIN_TRACING_V2,
        "langsmith_project": config.LANGCHAIN_PROJECT,
        "default_llm": f"{config.DEFAULT_LLM_PROVIDER} ({config.DEFAULT_LLM_MODEL})",
    }


@app.post("/api/v1/outreach")
def process_outreach(payload: LeadPayload):
    try:
        result = run_lead_outreach_pipeline(payload.model_dump())
        return {
            "success": True,
            "research": result.get("research"),
            "draft": result.get("draft"),
            "approval_status": result.get("approval_status"),
            "send_status": result.get("send_status"),
            "final_email_html": result.get("final_email_html"),
            "final_email_plain": result.get("final_email_plain"),
            "logs": result.get("logs", []),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/reply")
def process_reply(payload: ReplyPayload):
    try:
        reply_dict = payload.model_dump()
        result = run_reply_processing_pipeline(
            reply_data=reply_dict,
            previous_outreach=payload.previous_outreach
        )
        return {
            "success": True,
            "classification": result.get("classification"),
            "action_plan": result.get("action_plan"),
            "sent_result": result.get("sent_result"),
            "telegram_alert": result.get("telegram_alert"),
            "logs": result.get("logs", []),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/followup")
def process_followup(payload: FollowUpPayload):
    try:
        result = run_followup_pipeline(
            lead_data=payload.lead.model_dump(),
            initial_draft=payload.draft or {},
            followup_number=payload.followup_number
        )
        return {
            "success": True,
            "draft": result.get("draft"),
            "logs": result.get("logs", []),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print("Starting Agentic AI FastAPI Server on http://0.0.0.0:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
