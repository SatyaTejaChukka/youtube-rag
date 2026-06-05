import asyncio
import os
from functools import partial
from typing import Any

from app.config import settings


_model: Any | None = None


def get_model() -> Any:
    global _model
    if _model is None:
        os.environ.setdefault("USE_TF", "0")
        os.environ.setdefault("TRANSFORMERS_NO_TF", "1")
        from sentence_transformers import SentenceTransformer

        print(f"[INFO] Loading embedding model: {settings.embedding_model}")
        _model = SentenceTransformer(settings.embedding_model, model_kwargs={"low_cpu_mem_usage": False})
        actual_dim = _model.get_sentence_embedding_dimension()
        if actual_dim != settings.embedding_dim:
            print(
                f"[WARN] Embedding model dimension is {actual_dim}, "
                f"but EMBEDDING_DIM is {settings.embedding_dim}."
            )
    return _model


def _encode_sync(texts: list[str]) -> list[list[float]]:
    model = get_model()
    vectors = model.encode(
        texts,
        normalize_embeddings=True,
        batch_size=32,
        show_progress_bar=False,
    )
    return vectors.tolist()


async def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    return await asyncio.to_thread(partial(_encode_sync, texts))


async def embed_text(text: str) -> list[float]:
    embeddings = await embed_texts([text])
    return embeddings[0]
