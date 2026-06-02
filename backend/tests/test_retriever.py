import asyncio

from app.services import retriever


def test_retriever_deduplicates_nearby_chunks(monkeypatch):
    async def fake_query_chunks(query_embedding, playlist_id, top_k):
        return [
            {"metadata": {"video_id": "a", "start_seconds": 10}, "text": "one"},
            {"metadata": {"video_id": "a", "start_seconds": 25}, "text": "near duplicate"},
            {"metadata": {"video_id": "a", "start_seconds": 80}, "text": "far enough"},
            {"metadata": {"video_id": "b", "start_seconds": 20}, "text": "other video"},
        ]

    monkeypatch.setattr(retriever, "query_chunks", fake_query_chunks)

    chunks = asyncio.run(retriever.retrieve_chunks([0.1], "PLtest", top_k=3))

    assert [chunk["text"] for chunk in chunks] == ["one", "far enough", "other video"]

