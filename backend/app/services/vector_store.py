from pathlib import Path

import chromadb
from chromadb.config import Settings as ChromaSettings

from app.config import settings


_client = None
_collection = None


def get_collection():
    global _client, _collection
    if _collection is None:
        Path(settings.chroma_persist_dir).mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(
            path=settings.chroma_persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        _collection = _client.get_or_create_collection(
            name="youtube_chunks",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


async def upsert_chunks(chunks: list[dict], embeddings: list[list[float]]) -> None:
    if not chunks:
        return
    if len(chunks) != len(embeddings):
        raise ValueError("Chunk count and embedding count must match.")

    collection = get_collection()
    collection.upsert(
        ids=[chunk["id"] for chunk in chunks],
        embeddings=embeddings,
        documents=[chunk["text"] for chunk in chunks],
        metadatas=[
            {
                "source_id": chunk["source_id"],
                "video_id": chunk["video_id"],
                "video_title": chunk.get("video_title") or "",
                "start_seconds": float(chunk["start_seconds"]),
                "end_seconds": float(chunk["end_seconds"]),
                "timestamp_label": chunk["timestamp_label"],
                "youtube_url": chunk["youtube_url"],
                "thumbnail_url": chunk.get("thumbnail_url") or "",
                "published_at": chunk.get("published_at") or "",
                "chunk_index": int(chunk["chunk_index"]),
            }
            for chunk in chunks
        ],
    )


async def query_chunks(
    query_embedding: list[float],
    source_id: str,
    top_k: int = 8,
) -> list[dict]:
    collection = get_collection()
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where={"source_id": source_id},
        include=["documents", "metadatas", "distances"],
    )

    ids = results.get("ids", [[]])[0]
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    return [
        {
            "id": ids[index],
            "text": documents[index],
            "metadata": metadatas[index],
            "distance": distances[index],
        }
        for index in range(len(ids))
    ]


async def delete_by_source(source_id: str) -> None:
    collection = get_collection()
    collection.delete(where={"source_id": source_id})
