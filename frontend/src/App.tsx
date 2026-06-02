import { useState } from 'react';

import ChatWindow from './components/ChatWindow';
import EmptyState from './components/EmptyState';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';

export default function App() {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceTitle, setSourceTitle] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  function handleIngested(id: string, title: string) {
    setSourceId(id);
    setSourceTitle(title);
    setRefreshKey((value) => value + 1);
  }

  function handleClear() {
    setSourceId(null);
    setSourceTitle('');
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
        style={{ animation: 'sidebarEnter 0.5s cubic-bezier(0.22,1,0.36,1) both' }}
      />

      <main
        className="relative z-10 flex flex-1 flex-col overflow-hidden"
        style={{ animation: 'mainEnter 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both' }}
      >
        {sourceId ? (
          <>
            <TopBar sourceTitle={sourceTitle} onClear={handleClear} />
            <ChatWindow sourceId={sourceId} />
          </>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
