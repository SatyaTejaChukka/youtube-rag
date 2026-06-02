from app.services.vector_store import query_chunks


async def retrieve_chunks(
    query_embedding: list[float],
    source_id: str,
    top_k: int = 8,
) -> list[dict]:
    raw_chunks = await query_chunks(query_embedding, source_id, top_k=top_k * 2)

    deduplicated = []
    seen: list[tuple[str, float]] = []

    for chunk in raw_chunks:
        meta = chunk["metadata"]
        video_id = meta["video_id"]
        start_seconds = float(meta["start_seconds"])

        too_close = any(
            seen_video_id == video_id and abs(seen_start - start_seconds) < 30
            for seen_video_id, seen_start in seen
        )
        if too_close:
            continue

        deduplicated.append(chunk)
        seen.append((video_id, start_seconds))

        if len(deduplicated) >= top_k:
            break

    return deduplicated
