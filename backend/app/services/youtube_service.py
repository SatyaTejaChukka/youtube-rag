import asyncio
from functools import partial

from app.services.url_resolver import resolve_url, SourceInfo


BASE_OPTS = {
    "quiet": True,
    "no_warnings": True,
    "extract_flat": True,
}


def _run_ydl(url: str, opts: dict) -> dict:
    import os
    import yt_dlp
    
    # Inject cookies if file exists
    for path in ("cookies.txt", "/app/cookies.txt", "backend/cookies.txt"):
        if os.path.exists(path):
            opts["cookiefile"] = path
            break
            
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False)


async def _extract(url: str, opts: dict) -> dict:
    return await asyncio.to_thread(partial(_run_ydl, url, opts))


def _best_thumbnail(info: dict, video_id: str) -> str:
    thumbnails = info.get("thumbnails") or []
    if thumbnails:
        for thumbnail in reversed(thumbnails):
            url = thumbnail.get("url")
            if url:
                return url

    thumbnail = info.get("thumbnail")
    if thumbnail:
        return thumbnail
    return f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"


def _video_meta_from_info(info: dict, video_id: str) -> dict:
    return {
        "title": info.get("title") or video_id,
        "description": (info.get("description") or "")[:2000],
        "channel_id": info.get("channel_id") or "",
        "channel_title": info.get("uploader") or info.get("channel") or "",
        "published_at": info.get("upload_date") or "",
        "thumbnail_url": _best_thumbnail(info, video_id),
        "duration_secs": int(info.get("duration") or 0),
    }


async def fetch_video_metadata(video_id: str) -> dict:
    opts = {**BASE_OPTS, "extract_flat": False}
    url = f"https://www.youtube.com/watch?v={video_id}"
    try:
        info = await _extract(url, opts)
        return _video_meta_from_info(info, video_id)
    except Exception as exc:
        print(f"[WARN] Could not fetch full metadata for {video_id}: {exc}")
        return {
            "title": video_id,
            "description": "",
            "channel_id": "",
            "channel_title": "",
            "published_at": "",
            "thumbnail_url": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            "duration_secs": 0,
        }


async def fetch_videos_metadata(video_ids: list[str]) -> dict[str, dict]:
    semaphore = asyncio.Semaphore(10)

    async def fetch_with_sem(video_id: str) -> tuple[str, dict]:
        async with semaphore:
            meta = await fetch_video_metadata(video_id)
            return video_id, meta

    tasks = [fetch_with_sem(video_id) for video_id in video_ids]
    results = await asyncio.gather(*tasks)
    return dict(results)


async def fetch_source_metadata(source_info: SourceInfo, video_ids: list[str] | None = None) -> dict:
    if source_info.source_type == "video" and video_ids:
        return await fetch_video_metadata(video_ids[0])

    try:
        info = await _extract(source_info.normalized_url, BASE_OPTS)
        title = info.get("title") or info.get("uploader") or "Untitled YouTube Source"
        channel_id = info.get("channel_id") or ""
        channel_title = info.get("uploader") or info.get("channel") or ""
        
        # Prioritize video_ids length for channels, fallback to entries or 0
        video_count = len(video_ids) if video_ids is not None else (len(info.get("entries") or []) if info.get("entries") else 0)

        return {
            "title": title,
            "channel_id": channel_id,
            "channel_title": channel_title,
            "url": info.get("webpage_url") or source_info.normalized_url,
            "video_count": video_count,
        }
    except Exception as exc:
        print(f"[WARN] Could not fetch source metadata for {source_info.normalized_url}: {exc}")
        return {
            "title": source_info.source_id,
            "channel_id": "",
            "channel_title": "",
            "url": source_info.normalized_url,
            "video_count": len(video_ids or []),
        }


async def resolve_source_video_ids_and_meta(source_info: SourceInfo) -> tuple[list[str], dict[str, dict]]:
    if source_info.source_type == "video":
        opts = {**BASE_OPTS, "extract_flat": False}
        url = f"https://www.youtube.com/watch?v={source_info.source_id}"
        try:
            info = await _extract(url, opts)
            meta = _video_meta_from_info(info, source_info.source_id)
        except Exception as exc:
            print(f"[WARN] Error extracting single video details: {exc}")
            meta = {
                "title": source_info.source_id,
                "description": "",
                "channel_id": "",
                "channel_title": "",
                "published_at": "",
                "thumbnail_url": f"https://i.ytimg.com/vi/{source_info.source_id}/hqdefault.jpg",
                "duration_secs": 0,
            }
        return [source_info.source_id], {source_info.source_id: meta}

    try:
        url = source_info.normalized_url
        if source_info.source_type in ("channel", "channel_handle"):
            url = url.rstrip("/") + "/videos"

        info = await _extract(url, BASE_OPTS)
        entries = info.get("entries") or []

        video_ids = []
        video_metadata = {}
        
        channel_id = info.get("channel_id") or ""
        channel_title = info.get("uploader") or info.get("channel") or ""

        for entry in entries:
            if entry and entry.get("id"):
                vid = entry["id"]
                video_ids.append(vid)
                video_metadata[vid] = {
                    "title": entry.get("title") or vid,
                    "description": "",
                    "channel_id": channel_id,
                    "channel_title": channel_title,
                    "published_at": entry.get("upload_date") or "",
                    "thumbnail_url": _best_thumbnail(entry, vid),
                    "duration_secs": int(entry.get("duration") or 0),
                }

        if not video_ids:
            raise ValueError("No videos found at the provided URL. Is it public?")
        return video_ids, video_metadata
    except Exception as exc:
        raise ValueError(f"Failed to extract videos from source: {exc}")
