import re
from dataclasses import dataclass
from urllib.parse import parse_qs, urlparse

@dataclass
class SourceInfo:
    source_type: str  # "playlist", "channel", "channel_handle", "video"
    source_id: str
    normalized_url: str

VIDEO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$")
VIDEO_URL_PATTERN = re.compile(r"(?:v=|youtu\.be/|/shorts/|/embed/|/live/)([A-Za-z0-9_-]{11})")

def _extract_video_id(value: str) -> str | None:
    if VIDEO_ID_PATTERN.fullmatch(value):
        return value
    match = VIDEO_URL_PATTERN.search(value)
    if match:
        return match.group(1)
    
    parsed = urlparse(value if re.match(r"^https?://", value) else f"https://{value}")
    query_video_ids = parse_qs(parsed.query).get("v")
    if query_video_ids and VIDEO_ID_PATTERN.fullmatch(query_video_ids[0]):
        return query_video_ids[0]
        
    path_parts = [part for part in parsed.path.split("/") if part]
    if parsed.netloc.endswith("youtu.be") and path_parts and VIDEO_ID_PATTERN.fullmatch(path_parts[0]):
        return path_parts[0]
    if path_parts and path_parts[0] in {"shorts", "embed", "live", "v"} and len(path_parts) > 1:
        if VIDEO_ID_PATTERN.fullmatch(path_parts[1]):
            return path_parts[1]
            
    return None

def resolve_url(url: str) -> SourceInfo:
    """Classify the YouTube URL without network calls."""
    value = url.strip()
    parsed = urlparse(value if re.match(r"^https?://", value) else f"https://{value}")

    # Playlist
    playlist_ids = parse_qs(parsed.query).get("list")
    if playlist_ids and playlist_ids[0].strip():
        pid = playlist_ids[0].strip()
        return SourceInfo(
            source_type="playlist",
            source_id=pid,
            normalized_url=f"https://www.youtube.com/playlist?list={pid}"
        )

    # Channel Handle
    handle_match = re.search(r"youtube\.com/@([A-Za-z0-9_.-]+)", value)
    if handle_match:
        handle = handle_match.group(1)
        return SourceInfo(
            source_type="channel_handle",
            source_id=f"@{handle}",
            normalized_url=f"https://www.youtube.com/@{handle}"
        )

    # Channel Handle (fallback via path)
    path_parts = [part for part in parsed.path.split("/") if part]
    if path_parts and path_parts[0].startswith("@"):
        handle = path_parts[0][1:]
        return SourceInfo(
            source_type="channel_handle",
            source_id=f"@{handle}",
            normalized_url=f"https://www.youtube.com/@{handle}"
        )

    # Channel ID
    channel_match = re.search(r"youtube\.com/channel/([A-Za-z0-9_-]+)", value)
    if channel_match:
        cid = channel_match.group(1)
        return SourceInfo(
            source_type="channel",
            source_id=cid,
            normalized_url=f"https://www.youtube.com/channel/{cid}"
        )

    # Video
    vid = _extract_video_id(value)
    if vid:
        return SourceInfo(
            source_type="video",
            source_id=vid,
            normalized_url=f"https://www.youtube.com/watch?v={vid}"
        )

    raise ValueError("Unsupported YouTube URL format.")
