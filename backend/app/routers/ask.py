from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.models.api_models import AskRequest, AskResponse
from app.services.answer_generator import generate_answer
from app.services.embedder import embed_text
from app.services.retriever import retrieve_chunks
from app.services.provider_resolver import resolve_provider


router = APIRouter()

QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


@router.post("/", response_model=AskResponse)
async def ask_question(request: AskRequest, req: Request) -> AskResponse:
    question = request.question.strip()
    source_id = request.source_id.strip() if request.source_id else None

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if not source_id:
        raise HTTPException(status_code=400, detail="source_id cannot be empty")

    try:
        provider_creds = resolve_provider(req)
        
        question_embedding = await embed_text(f"{QUERY_PREFIX}{question}")
        chunks = await retrieve_chunks(
            query_embedding=question_embedding,
            source_id=source_id,
            top_k=settings.retrieval_top_k,
        )
        result = await generate_answer(question, chunks, provider_creds)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Answer generation failed: {exc}") from exc

    return AskResponse(
        question=question,
        answer=result["answer"],
        sources=result["sources"],
    )
