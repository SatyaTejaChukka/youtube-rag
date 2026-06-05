from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import ask, health, ingest, sources


app = FastAPI(title="TubeRAG API", version="1.0.0")

origins = [settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()
    
    # Write YouTube cookies if provided in environment variables
    import os
    import json
    cookies_content = os.environ.get("YT_COOKIES")
    if cookies_content:
        try:
            # Check if it is JSON format and convert if necessary
            stripped = cookies_content.strip()
            if (stripped.startswith("[") and stripped.endswith("]")) or (stripped.startswith("{") and stripped.endswith("}")):
                try:
                    cookies_data = json.loads(stripped)
                    if isinstance(cookies_data, dict):
                        if "cookies" in cookies_data and isinstance(cookies_data["cookies"], list):
                            cookies_data = cookies_data["cookies"]
                        else:
                            cookies_data = [cookies_data]
                    
                    if isinstance(cookies_data, list):
                        lines = ["# Netscape HTTP Cookie File", "# This was auto-converted from JSON format\n"]
                        for c in cookies_data:
                            if not isinstance(c, dict):
                                continue
                            domain = c.get("domain", "")
                            if not domain:
                                continue
                            
                            flag = "TRUE" if domain.startswith(".") else "FALSE"
                            path = c.get("path", "/")
                            secure = "TRUE" if c.get("secure") else "FALSE"
                            
                            exp = c.get("expirationDate")
                            if exp is None:
                                exp = c.get("expiry")
                            if exp is not None:
                                try:
                                    exp_val = str(int(float(exp)))
                                except Exception:
                                    exp_val = "0"
                            else:
                                exp_val = "0"
                                
                            name = c.get("name", "")
                            value = c.get("value", "")
                            lines.append(f"{domain}\t{flag}\t{path}\t{secure}\t{exp_val}\t{name}\t{value}")
                        
                        cookies_content = "\n".join(lines) + "\n"
                        print("[INFO] Parsed JSON cookies and converted to Netscape format")
                except Exception as json_err:
                    print(f"[WARN] Failed to parse cookies as JSON, using raw format: {json_err}")
            
            with open("cookies.txt", "w", encoding="utf-8") as f:
                f.write(cookies_content)
            print("[INFO] Successfully wrote YT_COOKIES to cookies.txt")
        except Exception as e:
            print(f"[WARN] Failed to write YT_COOKIES: {e}")


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "message": "Welcome to TubeRAG API",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs"
    }


app.include_router(health.router, prefix="/api")
app.include_router(ingest.router, prefix="/api/ingest")
app.include_router(ask.router, prefix="/api/ask")
app.include_router(sources.router, prefix="/api/sources")

