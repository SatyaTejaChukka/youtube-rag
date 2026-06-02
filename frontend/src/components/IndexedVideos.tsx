import { useEffect, useState } from 'react';

import { getSources } from '../api/client';
import type { VideoSummary } from '../types';
import VideoListItem from './VideoListItem';
import { SkeletonVideoItem } from './ui/Skeleton';

interface Props {
  sourceId: string;
  refreshKey?: number;
}

export default function IndexedVideos({ sourceId, refreshKey = 0 }: Props) {
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getSources(sourceId)
      .then((data) => {
        if (!cancelled) {
          setVideos(data.videos || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVideos([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sourceId, refreshKey]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto pb-2">
        <div className="space-y-0.5 px-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonVideoItem key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto pb-2">
        <p className="px-5 text-[11px] italic text-[var(--text-muted)]">No videos indexed yet.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-2">
      <div className="space-y-0.5 px-2">
        {videos.map((video, index) => (
          <div key={video.video_id} className="fade-in-up" style={{ animationDelay: `${index * 0.03}s` }}>
            <VideoListItem video={video} />
          </div>
        ))}
      </div>
    </div>
  );
}
