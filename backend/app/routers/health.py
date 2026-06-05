from fastapi import APIRouter


router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/diagnostics")
async def diagnostics() -> dict:
    import os
    from app.services.diagnostics import get_diag_logs
    
    cookies_paths = {
        "cookies.txt": os.path.exists("cookies.txt"),
        "/app/cookies.txt": os.path.exists("/app/cookies.txt"),
    }
    
    cookies_size = None
    for path, exists in cookies_paths.items():
        if exists:
            try:
                cookies_size = os.path.getsize(path)
            except Exception:
                pass
            break
    
    yt_cookies_env_set = os.environ.get("YT_COOKIES") is not None
    yt_cookies_env_length = len(os.environ.get("YT_COOKIES", ""))
    
    # Check cookies file content sample (safely)
    cookies_preview = None
    if os.path.exists("cookies.txt"):
        try:
            with open("cookies.txt", "r", encoding="utf-8") as f:
                cookies_preview = f.read(200) # first 200 chars
        except Exception as e:
            cookies_preview = f"Error reading: {e}"

    return {
        "cookies_file_found": cookies_paths,
        "cookies_file_size_bytes": cookies_size,
        "cookies_preview": cookies_preview,
        "yt_cookies_env_set": yt_cookies_env_set,
        "yt_cookies_env_length": yt_cookies_env_length,
        "cwd": os.getcwd(),
        "logs": get_diag_logs(),
    }


