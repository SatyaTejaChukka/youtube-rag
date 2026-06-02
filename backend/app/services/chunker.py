import tiktoken

from app.config import settings


tokenizer = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(tokenizer.encode(text))


def format_timestamp(seconds: float) -> str:
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    remaining_seconds = seconds % 60
    if hours > 0:
        return f"{hours}:{minutes:02d}:{remaining_seconds:02d}"
    return f"{minutes}:{remaining_seconds:02d}"


def chunk_transcript(
    segments: list[dict],
    video_id: str,
    source_id: str,
    video_meta: dict,
    chunk_size: int | None = None,
    overlap_tokens: int | None = None,
) -> list[dict]:
    chunk_size = chunk_size or settings.chunk_size_tokens
    overlap_tokens = overlap_tokens or settings.chunk_overlap_tokens

    chunks = []
    buffer_segments: list[dict] = []
    buffer_tokens = 0
    chunk_index = 0

    for segment in segments:
        text = str(segment.get("text", "")).strip().replace("\n", " ")
        if not text:
            continue

        normalized_segment = {
            "text": text,
            "start": float(segment.get("start", 0)),
            "duration": float(segment.get("duration", 0)),
        }
        segment_tokens = count_tokens(text)

        if buffer_tokens + segment_tokens > chunk_size and buffer_segments:
            chunks.append(
                _make_chunk(buffer_segments, chunk_index, video_id, source_id, video_meta)
            )
            chunk_index += 1

            while buffer_segments and buffer_tokens > overlap_tokens:
                dropped = buffer_segments.pop(0)
                buffer_tokens -= count_tokens(dropped["text"])

        buffer_segments.append(normalized_segment)
        buffer_tokens += segment_tokens

    if buffer_segments:
        chunks.append(_make_chunk(buffer_segments, chunk_index, video_id, source_id, video_meta))

    return chunks


def _make_chunk(
    segments: list[dict],
    chunk_index: int,
    video_id: str,
    source_id: str,
    video_meta: dict,
) -> dict:
    text = " ".join(segment["text"].strip() for segment in segments)
    start_seconds = segments[0]["start"]
    end_seconds = segments[-1]["start"] + segments[-1].get("duration", 0)
    youtube_url = f"https://www.youtube.com/watch?v={video_id}&t={int(start_seconds)}s"
    chunk_id = f"{source_id}_{video_id}_{chunk_index:04d}"

    return {
        "id": chunk_id,
        "video_id": video_id,
        "source_id": source_id,
        "chunk_index": chunk_index,
        "text": text,
        "start_seconds": start_seconds,
        "end_seconds": end_seconds,
        "timestamp_label": format_timestamp(start_seconds),
        "youtube_url": youtube_url,
        "video_title": video_meta.get("title", ""),
        "thumbnail_url": video_meta.get("thumbnail_url", ""),
        "published_at": video_meta.get("published_at", ""),
    }
