from app.models.api_models import SourceReference


NOT_FOUND_ANSWER = "I couldn't find relevant information about this in the indexed videos."

SYSTEM_PROMPT = """You are a helpful assistant that answers questions strictly based on the provided YouTube video transcript excerpts.

Rules:
1. Answer only using information present in the provided excerpts.
2. If the answer cannot be found in the excerpts, say exactly: "I couldn't find relevant information about this in the indexed videos."
3. Be concise and clear - 3 to 6 sentences is ideal.
4. Do not speculate or add information from your general training knowledge.
5. When referencing information, you may naturally cite the video title or timestamp if it adds clarity.
"""


def format_context(chunks: list[dict]) -> str:
    lines = []
    for index, chunk in enumerate(chunks, 1):
        meta = chunk["metadata"]
        lines.append(
            f"[Excerpt {index}]\n"
            f"Video: {meta['video_title']}\n"
            f"Timestamp: {meta['timestamp_label']} ({int(meta['start_seconds'])}s)\n"
            f"Content: {chunk['text']}\n"
        )
    return "\n---\n".join(lines)


def build_source_references(chunks: list[dict]) -> list[SourceReference]:
    sources = []
    for chunk in chunks[:5]:
        meta = chunk["metadata"]
        text = chunk["text"].strip()
        snippet = f"{text[:197]}..." if len(text) > 200 else text
        sources.append(
            SourceReference(
                video_id=meta["video_id"],
                video_title=meta["video_title"],
                start_seconds=int(meta["start_seconds"]),
                timestamp_label=meta["timestamp_label"],
                snippet=snippet,
                youtube_url=meta["youtube_url"],
                thumbnail_url=meta.get("thumbnail_url"),
            )
        )
    return sources


def build_user_message(question: str, chunks: list[dict]) -> str:
    context = format_context(chunks)
    return f"""Here are the relevant transcript excerpts from the YouTube videos:

{context}

Question: {question}

Please answer based only on the excerpts above."""


def answer_payload(answer_text: str, chunks: list[dict]) -> dict:
    answer = answer_text.strip() or NOT_FOUND_ANSWER
    sources = [] if answer == NOT_FOUND_ANSWER else build_source_references(chunks)
    return {"answer": answer, "sources": sources}
