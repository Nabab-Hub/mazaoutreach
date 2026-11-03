import re
from typing import Dict, List, Any
from langchain_core.tools import tool

SPAM_TRIGGER_WORDS = [
    "free", "guarantee", "guaranteed", "100%", "risk-free", "act now", "urgent",
    "limited time", "make money", "passive income", "exclusive deal", "winner",
    "cheap", "miracle", "no catch", "instant access", "buy direct", "$$$"
]


@tool
def analyze_email_spam_risk(subject: str, body: str) -> Dict[str, Any]:
    """
    Analyzes an email subject line and body for spam trigger words, deliverability risks,
    and anti-spam compliance. Returns score between 0.0 (clean) and 1.0 (high spam risk).
    """
    warnings: List[str] = []
    score: float = 0.0

    combined_text = f"{subject} {body}".lower()

    # 1. Check for spam trigger words
    found_triggers = [word for word in SPAM_TRIGGER_WORDS if word in combined_text]
    if found_triggers:
        score += min(len(found_triggers) * 0.25, 0.6)
        warnings.append(f"Contains spam trigger phrases: {', '.join(found_triggers)}")

    # 2. Check for ALL CAPS in subject
    words = [w for w in subject.split() if len(w) > 3]
    caps_words = [w for w in words if w.isupper()]
    if caps_words:
        score += 0.3
        warnings.append("Subject contains ALL CAPS words, which triggers Google promotional filters.")

    # 3. Check for exclamation marks
    if "!" in subject:
        score += 0.25
        warnings.append("Subject contains exclamation marks ('!').")

    # 4. Length check
    body_words = len(body.split())
    if body_words < 40:
        score += 0.15
        warnings.append("Body is very short (<40 words), might seem low-effort.")
    elif body_words > 200:
        score += 0.2
        warnings.append("Body is too long (>200 words) for a cold outreach email.")

    score = min(max(round(score, 2), 0.0), 1.0)
    is_safe = score < 0.35

    return {
        "spam_score": score,
        "is_safe": is_safe,
        "warnings": warnings,
        "word_count": body_words,
    }

