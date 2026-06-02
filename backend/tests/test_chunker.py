from app.services.chunker import chunk_transcript, format_timestamp


def test_format_timestamp():
    assert format_timestamp(43) == "0:43"
    assert format_timestamp(763) == "12:43"
    assert format_timestamp(3723) == "1:02:03"


def test_chunk_transcript_preserves_timestamps_and_ids():
    segments = [
        {"text": "Hello world this is a test.", "start": 0.0, "duration": 3.0},
        {"text": "Another segment of text.", "start": 3.0, "duration": 2.0},
    ]

    chunks = chunk_transcript(
        segments,
        "testvid",
        "PLtest",
        {"title": "Test Video", "thumbnail_url": "thumb.jpg", "published_at": "2024-01-01"},
        chunk_size=100,
        overlap_tokens=10,
    )

    assert len(chunks) == 1
    assert chunks[0]["id"] == "PLtest_testvid_0000"
    assert chunks[0]["start_seconds"] == 0.0
    assert chunks[0]["end_seconds"] == 5.0
    assert chunks[0]["youtube_url"] == "https://www.youtube.com/watch?v=testvid&t=0s"

