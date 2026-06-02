import asyncio
from functools import partial
from typing import Any

from app.config import settings
from app.services._answer_common import (
    NOT_FOUND_ANSWER,
    SYSTEM_PROMPT,
    answer_payload,
    build_user_message,
)


_client: Any | None = None


def _get_client() -> Any:
    global _client
    if _client is None:
        import ollama

        _client = ollama.Client(host=settings.ollama_base_url)
    return _client


def _chat_sync(question: str, chunks: list[dict]) -> str:
    response = _get_client().chat(
        model=settings.ollama_model,
        options={"temperature": 0.3, "num_predict": 1024},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_message(question, chunks)},
        ],
    )
    return response["message"]["content"]


async def generate_answer(question: str, chunks: list[dict]) -> dict:
    if not chunks:
        return {"answer": NOT_FOUND_ANSWER, "sources": []}

    answer_text = await asyncio.to_thread(partial(_chat_sync, question, chunks))
    return answer_payload(answer_text, chunks)
