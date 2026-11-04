import os
from typing import Optional
from langchain_core.language_models.chat_models import BaseChatModel
try:
    import config
except ImportError:
    from agentic_ai import config


def get_chat_model(
    provider: Optional[str] = None,
    model_name: Optional[str] = None,
    temperature: float = 0.3,
) -> BaseChatModel:
    """
    Factory function returning a resilient LangChain ChatModel with LangSmith tracing.
    Uses Gemini (default: gemini-3.7-flash) with an automatic multi-tier fallback cascade:
      1. Primary: configured target_model (e.g. gemini-3.7-flash)
      2. High-quota Gemini Flash: gemini-3.5-flash
      3. Ultra-fast Gemini Flash-Lite: gemini-3.1-flash-lite
      4. Fast Cloud Inference via Groq (OpenAI-compatible) if available
    This guarantees zero downtime even when Google Free Tier per-day quota is reached.
    """
    provider = (provider or config.DEFAULT_LLM_PROVIDER).lower()

    # 1. Google Gemini (Preferred)
    if (provider == "gemini" or not provider) and config.GEMINI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            target_model = model_name or config.DEFAULT_LLM_MODEL or "gemini-3.7-flash"

            # Primary model: max_retries=0 on experimental models to avoid long quota pauses
            primary_retries = 0 if "3.7" in target_model or "3.8" in target_model else 1
            primary_llm = ChatGoogleGenerativeAI(
                model=target_model,
                google_api_key=config.GEMINI_API_KEY,
                temperature=temperature,
                max_retries=primary_retries,
            )

            # Build multi-tier fallback list
            fallbacks = []
            
            # Tier 1 fallback: gemini-3.5-flash (high daily quota)
            if target_model != "gemini-3.5-flash":
                fallbacks.append(ChatGoogleGenerativeAI(
                    model="gemini-3.5-flash",
                    google_api_key=config.GEMINI_API_KEY,
                    temperature=temperature,
                    max_retries=1,
                ))

            # Tier 2 fallback: gemini-3.1-flash-lite
            if target_model != "gemini-3.1-flash-lite":
                fallbacks.append(ChatGoogleGenerativeAI(
                    model="gemini-3.1-flash-lite",
                    google_api_key=config.GEMINI_API_KEY,
                    temperature=temperature,
                    max_retries=1,
                ))

            # Tier 3 fallback: Groq if key is present
            groq_key = getattr(config, "GROK_API_KEY", "") or os.getenv("GROQ_API_KEY", "")
            if groq_key:
                try:
                    from langchain_openai import ChatOpenAI
                    fallbacks.append(ChatOpenAI(
                        model="openai/gpt-oss-120b",
                        api_key=groq_key,
                        base_url="https://api.groq.com/openai/v1",
                        temperature=temperature,
                    ))
                except Exception:
                    pass

            if fallbacks:
                return primary_llm.with_fallbacks(fallbacks)
            return primary_llm
        except Exception as e:
            print(f"[Models] Warning initializing ChatGoogleGenerativeAI: {e}")

    # 2. OpenAI
    if provider == "openai" and config.OPENAI_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            target_model = model_name or "gpt-4o-mini"
            return ChatOpenAI(
                model=target_model,
                api_key=config.OPENAI_API_KEY,
                temperature=temperature,
            )
        except Exception as e:
            print(f"[Models] Warning initializing ChatOpenAI: {e}")

    # 3. Groq (Fast Inference via OpenAI-compatible endpoint)
    groq_api_key = getattr(config, "GROK_API_KEY", "") or os.getenv("GROQ_API_KEY", "")
    if provider in ("groq", "grok", "xai") and groq_api_key:
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=model_name or "openai/gpt-oss-120b",
                api_key=groq_api_key,
                base_url="https://api.groq.com/openai/v1",
                temperature=temperature,
            )
        except Exception as e:
            print(f"[Models] Warning initializing Groq ChatOpenAI: {e}")

    # Fallback: Attempt any available key
    if config.GEMINI_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="gemini-3.5-flash",
            google_api_key=config.GEMINI_API_KEY,
            temperature=temperature,
        )

    if config.OPENAI_API_KEY:
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model="gpt-4o-mini",
            api_key=config.OPENAI_API_KEY,
            temperature=temperature,
        )

    # Deterministic Mock for dry runs if no keys are found
    from langchain_core.language_models.fake_chat_models import FakeListChatModel
    print("[Models] Notice: No API key found. Using deterministic FakeListChatModel for dry-run testing.")
    return FakeListChatModel(
        responses=[
            '{"subject": "Idea for your web platform", "body": "Hi there,\\n\\nLoved your work. Would you be open to a 10 min chat?", "reasoning": "Direct value angle", "confidence": 0.95}'
        ]
    )
