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

    curl_cffi_status = "Not installed"
    curl_cffi_test = None
    try:
        import curl_cffi
        from curl_cffi import requests as curl_requests
        curl_cffi_status = f"Installed, version: {curl_cffi.__version__}"
        try:
            resp = curl_requests.get("https://www.youtube.com", timeout=5)
            curl_cffi_test = f"Success (status: {resp.status_code})"
        except Exception as test_err:
            curl_cffi_test = f"Request error: {type(test_err).__name__}: {test_err}"
    except Exception as e:
        curl_cffi_status = f"Import error: {type(e).__name__}: {e}"

    yt_dlp_impersonate_status = "Not available"
    yt_dlp_targets = []
    try:
        import yt_dlp
        from yt_dlp.networking.impersonate import ImpersonateTarget
        yt_dlp_impersonate_status = "ImpersonateTarget importable"
        try:
            with yt_dlp.YoutubeDL() as ydl:
                targets = ydl._get_available_impersonate_targets()
                yt_dlp_targets = [str(t) for t in targets]
        except Exception as list_err:
            yt_dlp_targets = [f"List error: {type(list_err).__name__}: {list_err}"]
    except Exception as e:
        yt_dlp_impersonate_status = f"Import error: {type(e).__name__}: {e}"

    return {
        "cookies_file_found": cookies_paths,
        "cookies_file_size_bytes": cookies_size,
        "cookies_preview": cookies_preview,
        "yt_cookies_env_set": yt_cookies_env_set,
        "yt_cookies_env_length": yt_cookies_env_length,
        "cwd": os.getcwd(),
        "curl_cffi_status": curl_cffi_status,
        "curl_cffi_test": curl_cffi_test,
        "yt_dlp_impersonate_status": yt_dlp_impersonate_status,
        "yt_dlp_targets": yt_dlp_targets,
        "logs": get_diag_logs(),
    }


