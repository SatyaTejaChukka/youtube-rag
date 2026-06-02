import { FormEvent, KeyboardEvent, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus } from 'lucide-react';

import { apiErrorMessage, ingestSource } from '../api/client';
import type { IngestRequest } from '../types';
import { Button } from './ui/Button';

interface Props {
  onIngested: (sourceId: string, title: string) => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

function splitLinks(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((link) => link.trim())
    .filter(Boolean);
}

export default function IngestPanel({ onIngested }: Props) {
  const [sourceUrl, setSourceUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  const disabled = status === 'loading' || !sourceUrl.trim();

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (status === 'loading') {
      return;
    }

    const trimmed = sourceUrl.trim();
    if (!trimmed) {
      return;
    }

    setStatus('loading');
    setMessage('');

    const urls = splitLinks(trimmed);
    const request: IngestRequest = urls.length > 1 ? { urls } : { url: urls[0] };

    try {
      const result = await ingestSource(request);
      const label = result.videos_indexed === 1 ? 'video indexed' : 'videos indexed';
      setStatus('success');
      setMessage(
        `${result.videos_indexed} ${label}` +
          (result.videos_skipped > 0 ? `, ${result.videos_skipped} skipped` : ''),
      );
      onIngested(result.source_id, result.source_title);
    } catch (error) {
      setStatus('error');
      setMessage(apiErrorMessage(error, 'Ingestion failed. Check the links.'));
    }
  }

  function handleShortcut(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      void handleSubmit();
    }
  }

  return (
    <form className="space-y-3 border-b border-white/[0.04] p-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
          YouTube Link(s)
        </label>
        <textarea
          className="
            h-[88px] w-full resize-none rounded-[12px] border border-white/8 bg-[#191926]
            px-3 py-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
            placeholder:italic transition-all duration-200
            focus:border-indigo-500/60 focus:outline-none focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)]
          "
          onChange={(event) => setSourceUrl(event.target.value)}
          onKeyDown={handleShortcut}
          placeholder={'https://youtube.com/@channel\nhttps://youtube.com/playlist?list=...\nhttps://youtu.be/...'}
          value={sourceUrl}
        />
      </div>

      <Button
        className="w-full"
        disabled={disabled}
        icon={<Plus size={15} />}
        loading={status === 'loading'}
        size="md"
        type="submit"
      >
        {status === 'loading' ? 'Indexing...' : 'Index Source'}
      </Button>

      {status === 'loading' && (
        <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full w-1/3 rounded-full"
            style={{
              animation: 'progressSlide 1.4s ease-in-out infinite',
              background: 'linear-gradient(90deg, transparent, #6366F1, transparent)',
            }}
          />
        </div>
      )}

      {message && (
        <div
          className={`flex items-center gap-2 rounded-[8px] border px-3 py-2 text-[12px] font-medium ${
            status === 'success'
              ? 'border-emerald-500/15 bg-emerald-500/8 text-emerald-400'
              : 'border-red-500/15 bg-red-500/8 text-red-400'
          }`}
          style={status === 'success' ? { animation: 'successPop 0.4s cubic-bezier(0.22,1,0.36,1) both' } : undefined}
        >
          {status === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          {message}
        </div>
      )}
    </form>
  );
}
