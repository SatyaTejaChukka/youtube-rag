import pytest

from app.routers.ingest import parse_link_entries
from app.services.url_resolver import resolve_url, _extract_video_id


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"),
        ("dQw4w9WgXcQ", "dQw4w9WgXcQ"),
    ],
)
def test_extract_video_id_from_common_url_shapes(url, expected):
    assert _extract_video_id(url) == expected


def test_extract_video_id_rejects_playlist_only_url():
    # Since _extract_video_id doesn't parse list= as video id, it returns None
    assert _extract_video_id("https://www.youtube.com/playlist?list=PL123") is None


def test_resolve_url_shapes():
    # Playlist
    info = resolve_url("https://www.youtube.com/playlist?list=PLabc_123&feature=shared")
    assert info.source_type == "playlist"
    assert info.source_id == "PLabc_123"
    assert info.normalized_url == "https://www.youtube.com/playlist?list=PLabc_123"

    # Channel handle
    info = resolve_url("https://www.youtube.com/@Some.Channel/videos")
    assert info.source_type == "channel_handle"
    assert info.source_id == "@Some.Channel"
    assert info.normalized_url == "https://www.youtube.com/@Some.Channel"

    # Channel ID
    info = resolve_url("https://www.youtube.com/channel/UC123_abc")
    assert info.source_type == "channel"
    assert info.source_id == "UC123_abc"
    assert info.normalized_url == "https://www.youtube.com/channel/UC123_abc"

    # Video
    info = resolve_url("https://youtu.be/dQw4w9WgXcQ")
    assert info.source_type == "video"
    assert info.source_id == "dQw4w9WgXcQ"
    assert info.normalized_url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"


def test_parse_link_entries_splits_newlines_and_commas():
    assert parse_link_entries("https://a\nhttps://b, https://c") == [
        "https://a",
        "https://b",
        "https://c",
    ]
