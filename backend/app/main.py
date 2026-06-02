from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import ask, health, ingest, sources


app = FastAPI(title="TubeRAG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()


app.include_router(health.router, prefix="/api")
app.include_router(ingest.router, prefix="/api/ingest")
app.include_router(ask.router, prefix="/api/ask")
app.include_router(sources.router, prefix="/api/sources")

