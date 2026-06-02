from dataclasses import dataclass
from typing import Optional

from fastapi import Request

from app.config import settings


@dataclass
class ProviderCredentials:
    provider: str
    api_key: Optional[str]
    is_local: bool = False


def resolve_provider(request: Request) -> ProviderCredentials:
    """
    Priority:
    1. User Key (Frontend via Headers)
    2. Server Demo Key (.env)
    3. Local Ollama
    """
    header_provider = request.headers.get("X-Provider")
    header_key = request.headers.get("X-API-Key")

    if header_provider:
        provider_lower = header_provider.lower()
        if provider_lower == "ollama":
            return ProviderCredentials(
                provider="ollama",
                api_key=None,
                is_local=True
            )
        elif provider_lower == "groq":
            if header_key:
                return ProviderCredentials(
                    provider="groq",
                    api_key=header_key
                )
            if settings.groq_api_key:
                return ProviderCredentials(
                    provider="groq",
                    api_key=settings.groq_api_key
                )
            raise ValueError("GROQ API key is required but not provided.")

    # Fallback to .env configuration
    if settings.llm_provider == "groq" and settings.groq_api_key:
        return ProviderCredentials(
            provider="groq", 
            api_key=settings.groq_api_key
        )

    if settings.llm_provider == "ollama":
        return ProviderCredentials(
            provider="ollama", 
            api_key=None, 
            is_local=True
        )

    raise ValueError("No AI provider configured. Please provide an API key.")
