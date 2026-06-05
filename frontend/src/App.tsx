import { useEffect, useState } from 'react';

import ChatWindow from './components/ChatWindow';
import EmptyState from './components/EmptyState';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import VideoCompanion from './components/VideoCompanion';
import type { ActiveVideo, VideoSummary } from './types';
import { deleteSource } from './api/client';

export default function App() {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeVideo, setActiveVideo] = useState<ActiveVideo | null>(null);

  // Clear companion when source changes
  useEffect(() => {
    setActiveVideo(null);
  }, [sourceId]);

  function handleIngested(id: string, title: string) {
    setSourceId(id);
    setSourceTitle(title);
    setRefreshKey((value) => value + 1);
  }

  async function handleClear() {
    if (sourceId) {
      try {
        await deleteSource(sourceId);
      } catch (err) {
        console.warn('Failed to delete source on clear:', err);
      }
    }
    setSourceId(null);
    setSourceTitle('');
    setActiveVideo(null);
  }

  function handleSelectSource(videoId: string, videoTitle: string, startSeconds: number) {
    setActiveVideo({ videoId, videoTitle, startSeconds });
  }

  function handleSelectVideo(video: VideoSummary) {
    setActiveVideo({ videoId: video.video_id, videoTitle: video.title, startSeconds: 0 });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
        <div
          className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 blur-3xl"
          style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 h-[400px] w-[600px] blur-3xl"
          style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.05) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <Sidebar
        sourceId={sourceId}
        refreshKey={refreshKey}
        onIngested={handleIngested}
        onSelectVideo={handleSelectVideo}
        style={{ animation: 'sidebarEnter 0.5s cubic-bezier(0.22,1,0.36,1) both' }}
      />

      <main
        className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden"
        style={{ animation: 'mainEnter 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both' }}
      >
        {sourceId ? (
          <>
            <TopBar sourceTitle={sourceTitle} onClear={handleClear} />
            <div className="flex min-w-0 flex-1 overflow-hidden">
              <ChatWindow
                sourceId={sourceId}
                onSelectSource={handleSelectSource}
              />
              {activeVideo && (
                <VideoCompanion
                  sourceId={sourceId}
                  activeVideo={activeVideo}
                  onClose={() => setActiveVideo(null)}
                  onChangeVideo={setActiveVideo}
                />
              )}
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
