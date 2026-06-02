import asyncio
from starlette.requests import Request

from app.routers import ask
from app.models.api_models import AskRequest
from app.services.embedder import embed_texts


def test_embed_texts_empty_input_does_not_load_model():
    assert asyncio.run(embed_texts([])) == []


def test_ask_question_prefixes_query_for_bge(monkeypatch):
    captured = {}

    async def fake_embed_text(text):
        captured["text"] = text
        return [0.1, 0.2]

    async def fake_retrieve_chunks(query_embedding, source_id, top_k):
        captured["embedding"] = query_embedding
        captured["source_id"] = source_id
        captured["top_k"] = top_k
        return []

    async def fake_generate_answer(question, chunks, provider_creds):
        captured["provider_creds"] = provider_creds
        return {"answer": "ok", "sources": []}

    def fake_resolve_provider(request):
        from app.services.provider_resolver import ProviderCredentials
        return ProviderCredentials(provider="groq", api_key="fake_key")

    monkeypatch.setattr(ask, "embed_text", fake_embed_text)
    monkeypatch.setattr(ask, "retrieve_chunks", fake_retrieve_chunks)
    monkeypatch.setattr(ask, "generate_answer", fake_generate_answer)
    monkeypatch.setattr(ask, "resolve_provider", fake_resolve_provider)

    mock_request = Request(scope={"type": "http", "headers": []})

    response = asyncio.run(
        ask.ask_question(
            AskRequest(question="What is covered?", source_id="PLtest"),
            req=mock_request
        )
    )

    assert response.answer == "ok"
    assert captured["text"] == (
        "Represent this sentence for searching relevant passages: What is covered?"
    )
    assert captured["embedding"] == [0.1, 0.2]
    assert captured["source_id"] == "PLtest"
    assert captured["provider_creds"].provider == "groq"
    assert captured["provider_creds"].api_key == "fake_key"
