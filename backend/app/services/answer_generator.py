import json
from typing import AsyncGenerator
from app.services._answer_common import build_source_references, NOT_FOUND_ANSWER
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


async def generate_answer_stream(
    question: str, chunks: list[dict], creds: ProviderCredentials
) -> AsyncGenerator[str, None]:
    if not chunks:
        yield f"data: {json.dumps({'token': NOT_FOUND_ANSWER})}\n\n"
        yield f"data: {json.dumps({'done': True, 'sources': []})}\n\n"
        return

    if creds.provider == "groq":
        from app.services._answer_groq import generate_answer_stream as generate_groq_stream
        stream = generate_groq_stream(question, chunks, creds.api_key)
    elif creds.provider == "ollama":
        from app.services._answer_ollama import generate_answer_stream as generate_ollama_stream
        stream = generate_ollama_stream(question, chunks)
    else:
        raise RuntimeError(
            f"Unsupported LLM Provider: {creds.provider}. Supported options are 'groq' or 'ollama'."
        )

    async for token in stream:
        if token:
            yield f"data: {json.dumps({'token': token})}\n\n"

    sources = build_source_references(chunks)
    sources_serialized = [s.model_dump() for s in sources]
    yield f"data: {json.dumps({'done': True, 'sources': sources_serialized})}\n\n"


__all__ = ["generate_answer", "generate_answer_stream", "build_source_references"]

