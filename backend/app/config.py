from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    llm_provider: Literal["groq", "ollama"] = "groq"
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    ollama_model: str = "llama3.2"
    ollama_base_url: str = "http://localhost:11434"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 384
    frontend_url: str = "http://localhost:5173"
    chroma_persist_dir: str = "./chroma_db"
    sqlite_db_path: str = "./app.db"
    chunk_size_tokens: int = 500
    chunk_overlap_tokens: int = 50
    retrieval_top_k: int = 8


settings = Settings()
