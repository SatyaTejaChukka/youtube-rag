from app.services._answer_common import build_source_references
from app.services.provider_resolver import ProviderCredentials


async def generate_answer(question: str, chunks: list[dict], creds: ProviderCredentials) -> dict:
    if creds.provider == "groq":
        from app.services._answer_groq import generate_answer as generate_groq_answer

        return await generate_groq_answer(question, chunks, creds.api_key)

    if creds.provider == "ollama":
        from app.services._answer_ollama import generate_answer as generate_ollama_answer

        return await generate_ollama_answer(question, chunks)

    raise RuntimeError(
        f"Unsupported LLM Provider: {creds.provider}. Supported options are 'groq' or 'ollama'."
    )


__all__ = ["generate_answer", "build_source_references"]
