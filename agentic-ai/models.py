import os
from typing import Optional
from langchain_core.language_models.chat_models import BaseChatModel
from agentic_ai import config


def get_chat_model(
    provider: Optional[str] = None,
    model_name: Optional[str] = None,
    temperature: float = 0.3,
) -> BaseChatModel:
    """
    Factory function returning a configured LangChain ChatModel with LangSmith tracing.
    Uses Gemini 3.7 by default with automatic fallback to Gemini 3.8 if Google reports high demand (503).
    """
    provider = (provider or config.DEFAULT_LLM_PROVIDER).lower()

    # 1. Google Gemini (Preferred)
    if (provider == "gemini" or not provider) and config.GEMINI_API_KEY:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            target_model = model_name or config.DEFAULT_LLM_MODEL or "gemini-3.7-flash"

            primary_llm = ChatGoogleGenerativeAI(
                model=target_model,
                google_api_key=config.GEMINI_API_KEY,
                temperature=temperature,
                max_retries=2,
            )

            # Fallback to gemini-3.8-flash if primary encounters 503 high demand
            if target_model != "gemini-3.8-flash":
                fallback_llm = ChatGoogleGenerativeAI(
                    model="gemini-3.8-flash",
                    google_api_key=config.GEMINI_API_KEY,
                    temperature=temperature,
                    max_retries=2,
                )
                return primary_llm.with_fallbacks([fallback_llm])

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
    if provider in ("groq", "xai") and config.GROK_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model=model_name or "llama-3.1-70b-versatile",
                api_key=config.GROK_API_KEY,
                base_url="https://api.groq.com/openai/v1",
                temperature=temperature,
            )
        except Exception as e:
            print(f"[Models] Warning initializing Groq ChatOpenAI: {e}")

    # Fallback: Attempt any available key
    if config.GEMINI_API_KEY:
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model="gemini-3.8-flash",
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
