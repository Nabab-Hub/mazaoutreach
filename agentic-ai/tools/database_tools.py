from typing import Set, Dict, Any, List
from langchain_core.tools import tool

# In-memory suppression list for quick filtering
_suppression_list: Set[str] = {"do-not-contact@example.com", "unsubscribed.lead@example.com"}


@tool
def check_email_suppressed(email: str) -> bool:
    """Checks if an email is on the suppression or opt-out list."""
    return email.lower().strip() in _suppression_list


@tool
def add_to_suppression_list(email: str, reason: str = "user_requested") -> Dict[str, Any]:
    """Adds an email address to the opt-out suppression list to prevent future outreach."""
    cleaned = email.lower().strip()
    _suppression_list.add(cleaned)
    return {"email": cleaned, "suppressed": True, "reason": reason}


def get_suppressed_emails() -> Set[str]:
    return set(_suppression_list)

