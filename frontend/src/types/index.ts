export interface VideoChunk {
  chunk_index: number;
  start_seconds: number;
  end_seconds: number;
  timestamp_label: string;
  text: string;
}

export interface ActiveVideo {
  videoId: string;
  videoTitle: string;
  startSeconds: number;
}


export interface SourceReference {
  video_id: string;
  video_title: string;
  start_seconds: number;
  timestamp_label: string;
  snippet: string;
  youtube_url: string;
  thumbnail_url?: string | null;
}

export interface AskResponse {
  question: string;
  answer: string;
  sources: SourceReference[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceReference[];
  timestamp: Date;
}

export type IngestSourceType = 'playlist' | 'channel' | 'channel_handle' | 'single_video' | 'multiple_videos';

export interface IngestRequest {
  source_type?: IngestSourceType; // Optional since the backend now resolves via regex
  url?: string;
  urls?: string[];
  limit_override?: boolean;
}

export interface IngestResponse {
  source_id: string;
  source_title: string;
  source_type: string;
  videos_indexed: number;
  videos_skipped: number;
  skipped_video_ids: string[];
  status: string;
}

export interface VideoProgress {
  video_id: string;
  title: string;
  thumbnail_url: string;
  status: 'queued' | 'downloading' | 'embedding' | 'completed' | 'skipped' | 'failed';
}

export interface IngestProgress {
  status: string;
  current_video: string;
  processed: number;
  total: number;
  videos_indexed: number;
  videos_skipped: number;
  skipped_video_ids: string[];
  videos?: Record<string, VideoProgress>;
}

export interface VideoSummary {
  video_id: string;
  title: string;
  thumbnail_url?: string | null;
  published_at?: string | null;
  chunk_count: number;
  transcript_available: boolean;
}

export interface SourceSummary {
  source_id: string;
  source_type: string;
  title: string;
  video_count: number;
  created_at: string;
  last_indexed_at: string;
  videos: VideoSummary[];
}
