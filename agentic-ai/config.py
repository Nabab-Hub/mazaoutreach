import os
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in local folder first, then parent directory
current_dir = Path(__file__).resolve().parent
local_env = current_dir / ".env"
parent_env = current_dir.parent / ".env"

if local_env.exists():
    load_dotenv(local_env)
elif parent_env.exists():
    load_dotenv(parent_env)
else:
    load_dotenv()

# LangSmith Tracing & Observability
LANGCHAIN_TRACING_V2 = os.getenv("LANGCHAIN_TRACING_V2", "true").lower() == "true"
LANGCHAIN_ENDPOINT = os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")
LANGCHAIN_API_KEY = os.getenv("LANGCHAIN_API_KEY", "")
LANGCHAIN_PROJECT = os.getenv("LANGCHAIN_PROJECT", "client-handling-agentic-ai")

# Ensure environment variables for LangChain/LangSmith are active in process
if LANGCHAIN_TRACING_V2 and LANGCHAIN_API_KEY:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_ENDPOINT"] = LANGCHAIN_ENDPOINT
    os.environ["LANGCHAIN_API_KEY"] = LANGCHAIN_API_KEY
    os.environ["LANGCHAIN_PROJECT"] = LANGCHAIN_PROJECT

# AI Provider API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
GROK_API_KEY = os.getenv("GROK_API_KEY", "")

DEFAULT_LLM_PROVIDER = os.getenv("DEFAULT_LLM_PROVIDER", "gemini")
DEFAULT_LLM_MODEL = os.getenv("DEFAULT_LLM_MODEL", "gemini-3.7-flash")

# Telegram Notifications
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# Freelance Profile Settings
SENDER_NAME = os.getenv("SENDER_NAME", "Sk Ahidulla")
SENDER_TITLE = os.getenv("SENDER_TITLE", "Full-Stack Engineer & Automation Specialist")
SENDER_PHONE = os.getenv("SENDER_PHONE", "+91 86097 20621")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "skahidulla568@gmail.com")
SENDER_WEBSITE = os.getenv("SENDER_WEBSITE", "https://www.codingkamaza.in")
SENDER_YOUTUBE = os.getenv("SENDER_YOUTUBE", "https://youtube.com/@codingkamaza")
CALENDAR_BOOKING_LINK = os.getenv("CALENDAR_BOOKING_LINK", "https://calendly.com/gandfadexperiments/30min")

AGENTIC_MODE = os.getenv("AGENTIC_MODE", "live")

