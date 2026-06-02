import pytest
import asyncio
from app.services import youtube_service

def test_best_thumbnail():
    # Test default fallback when no thumbnails are provided
    assert youtube_service._best_thumbnail({}, "vid123") == "https://i.ytimg.com/vi/vid123/hqdefault.jpg"
    
    # Test fallback to "thumbnail" key
    info = {"thumbnail": "http://img.jpg"}
    assert youtube_service._best_thumbnail(info, "vid123") == "http://img.jpg"
    
    # Test list of thumbnails (should pick the last one, i.e., reversed)
    info = {"thumbnails": [{"url": "small.jpg"}, {"url": "large.jpg"}]}
    assert youtube_service._best_thumbnail(info, "vid123") == "large.jpg"


def test_video_meta_from_info():
    info = {
        "title": "My Title",
        "description": "Short desc",
        "channel_id": "UC123",
        "uploader": "My Channel",
        "upload_date": "20240101",
        "duration": 120,
        "thumbnail": "thumb.jpg"
    }
    meta = youtube_service._video_meta_from_info(info, "vid123")
    assert meta["title"] == "My Title"
    assert meta["description"] == "Short desc"
    assert meta["duration_secs"] == 120


@pytest.mark.anyio
async def test_fetch_videos_metadata_concurrently(monkeypatch):
    calls = []
    async def fake_extract(url, opts):
        calls.append(url)
        return {
            "title": "Title " + url,
            "duration": 60,
        }
    monkeypatch.setattr(youtube_service, "_extract", fake_extract)
    
    res = await youtube_service.fetch_videos_metadata(["vid1", "vid2"])
    assert len(res) == 2
    assert res["vid1"]["title"] == "Title https://www.youtube.com/watch?v=vid1"
    assert res["vid2"]["title"] == "Title https://www.youtube.com/watch?v=vid2"
    assert len(calls) == 2
