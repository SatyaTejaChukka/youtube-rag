from typing import Any

from app.config import settings
from app.services._answer_common import (
    NOT_FOUND_ANSWER,
    SYSTEM_PROMPT,
    answer_payload,
    build_user_message,
)


_clients: dict[str, Any] = {}


def _get_client(api_key: str) -> Any:
    if not api_key:
        raise RuntimeError("GROQ API key is required but not provided.")
    
    if api_key not in _clients:
        from groq import AsyncGroq
        _clients[api_key] = AsyncGroq(api_key=api_key)
        
    return _clients[api_key]


async def generate_answer(question: str, chunks: list[dict], api_key: str) -> dict:
    if not chunks:
        return {"answer": NOT_FOUND_ANSWER, "sources": []}

    client = _get_client(api_key)
    response = await client.chat.completions.create(
        model=settings.groq_model,
        max_tokens=1024,
        temperature=0.3,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_message(question, chunks)},
        ],
    )

    return answer_payload(response.choices[0].message.content or "", chunks)
