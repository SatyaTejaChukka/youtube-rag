import asyncio
import json
import re
from typing import Any

import httpx

from youtube_transcript_api import NoTranscriptFound, TranscriptsDisabled, YouTubeTranscriptApi


def _normalize_segment(segment: Any) -> dict:
    if isinstance(segment, dict):
        return {
            "text": segment.get("text", ""),
            "start": segment.get("start", 0),
            "duration": segment.get("duration", 0),
        }
    return {
        "text": getattr(segment, "text", ""),
        "start": getattr(segment, "start", 0),
        "duration": getattr(segment, "duration", 0),
    }


def _fetch_transcript_sync(video_id: str) -> list[dict] | None:
    try:
        import os
        cookies_file = None
        for path in ("cookies.txt", "/app/cookies.txt", "backend/cookies.txt"):
            if os.path.exists(path):
                cookies_file = path
                break

        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id, cookies=cookies_file)
        try:
            transcript = transcript_list.find_manually_created_transcript(["en"])
        except Exception:
            transcript = transcript_list.find_generated_transcript(["en"])
        
        from app.services.diagnostics import log_diag
        log_diag(f"YouTubeTranscriptApi successfully listed transcripts for {video_id}")
        
        segments = [_normalize_segment(segment) for segment in transcript.fetch()]
        log_diag(f"YouTubeTranscriptApi successfully fetched {len(segments)} segments for {video_id}")
        return segments
    except (NoTranscriptFound, TranscriptsDisabled) as exc:
        from app.services.diagnostics import log_diag
        log_diag(f"YouTubeTranscriptApi NoTranscriptFound/TranscriptsDisabled for {video_id}: {exc}")
        return None
    except Exception as exc:
        from app.services.diagnostics import log_diag
        log_diag(f"YouTubeTranscriptApi exception for {video_id}: {exc}")
        print(f"[WARN] Transcript fetch failed for {video_id}: {exc}")
        return None


def _pick_auto_caption_track(automatic_captions: dict[str, list[dict]]) -> str | None:
    if not automatic_captions:
        return None

    for language_code in ("en", "en-US", "en-GB"):
        tracks = automatic_captions.get(language_code)
        if tracks:
            for track in tracks:
                if track.get("url"):
                    return track["url"]

    for language_code, tracks in automatic_captions.items():
        if not language_code.startswith("en"):
            continue
        for track in tracks:
            if track.get("url"):
                return track["url"]

    return None


def _parse_json3_caption_payload(payload: str) -> list[dict]:
    text = payload[payload.find("{") :] if "{" in payload else payload
    data = json.loads(text)

    segments: list[dict] = []
    for event in data.get("events", []):
        start = float(event.get("tStartMs", 0)) / 1000.0
        duration = float(event.get("dDurationMs", 0)) / 1000.0
        parts: list[str] = []
        for seg in event.get("segs", []):
            piece = str(seg.get("utf8", ""))
            if piece:
                parts.append(piece)
        text_value = "".join(parts).replace("\n", " ").strip()
        if text_value:
            segments.append({"text": text_value, "start": start, "duration": duration})

    return segments


def _fetch_auto_generated_transcript_sync(video_id: str) -> list[dict] | None:
    try:
        import os
        import tempfile
        import yt_dlp

        # Use a temporary directory for subtitle files
        tmpdir = tempfile.mkdtemp()
        
        opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "writeautomaticsub": True,
            "writesubtitles": True,
            "subtitleslangs": ["en"],
            "subtitlesformat": "json3",
            "outtmpl": os.path.join(tmpdir, "%(id)s"),
            "source_address": "0.0.0.0",
        }
        for path in ("cookies.txt", "/app/cookies.txt", "backend/cookies.txt"):
            if os.path.exists(path):
                opts["cookiefile"] = path
                break

        # Inject Chrome impersonation to bypass SSL/TLS blocking on datacenter IPs
        try:
            from yt_dlp.networking.impersonate import ImpersonateTarget
            opts["impersonate"] = ImpersonateTarget.from_str("chrome-110")
        except Exception:
            pass

        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            
            # Check if subtitles are available
            subtitles = info.get("subtitles") or {}
            automatic_captions = info.get("automatic_captions") or {}
            combined_captions = {**automatic_captions, **subtitles}
            
            caption_url = _pick_auto_caption_track(combined_captions)
            if not caption_url:
                return None
            
            # Use yt-dlp's url opener which includes cookies
            caption_content = ydl.urlopen(caption_url).read().decode("utf-8")

        if "json3" in caption_url:
            segments = _parse_json3_caption_payload(caption_content)
        else:
            # Fallback for other caption formats
            text = caption_content
            chunks = [chunk.strip() for chunk in re.split(r"\n\s*\n", text) if chunk.strip()]
            segments: list[dict] = []
            for chunk in chunks:
                if "-->" not in chunk:
                    continue
                lines = chunk.splitlines()
                if len(lines) < 2:
                    continue
                timestamp_line = lines[0]
                text_lines = lines[1:]
                match = re.match(
                    r"(?P<start>\d+:\d+:\d+\.\d+|\d+:\d+\.\d+|\d+\.\d+)\s*-->\s*(?P<end>\d+:\d+:\d+\.\d+|\d+:\d+\.\d+|\d+\.\d+)",
                    timestamp_line,
                )
                if not match:
                    continue

                def _to_seconds(value: str) -> float:
                    parts = value.split(":")
                    if len(parts) == 3:
                        hours, minutes, seconds = parts
                        return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
                    if len(parts) == 2:
                        minutes, seconds = parts
                        return int(minutes) * 60 + float(seconds)
                    return float(value)

                start = _to_seconds(match.group("start"))
                end = _to_seconds(match.group("end"))
                text_value = " ".join(line.strip() for line in text_lines if line.strip())
                if text_value:
                    segments.append({"text": text_value, "start": start, "duration": max(0.0, end - start)})

        # Clean up temp directory
        try:
            import shutil
            shutil.rmtree(tmpdir, ignore_errors=True)
        except Exception:
            pass

        if segments:
            from app.services.diagnostics import log_diag
            log_diag(f"_fetch_auto_generated_transcript_sync successfully fetched {len(segments)} segments for {video_id}")
        else:
            from app.services.diagnostics import log_diag
            log_diag(f"_fetch_auto_generated_transcript_sync returned no segments for {video_id}")
        return segments or None
    except Exception as exc:
        from app.services.diagnostics import log_diag
        log_diag(f"_fetch_auto_generated_transcript_sync exception for {video_id}: {exc}")
        print(f"[WARN] Auto-caption fallback failed for {video_id}: {exc}")
        return None


async def fetch_transcript(video_id: str) -> list[dict] | None:
    transcript = await asyncio.to_thread(_fetch_transcript_sync, video_id)
    if transcript:
        return transcript

    return await asyncio.to_thread(_fetch_auto_generated_transcript_sync, video_id)

