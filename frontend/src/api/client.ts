import axios from 'axios';

import { db } from '../db';
import type { AskResponse, IngestRequest, IngestResponse, IngestProgress, SourceSummary, SourceReference, VideoChunk } from '../types';

const getBaseURL = () => {
  const url = import.meta.env.VITE_API_URL;
  if (url) {
    return url.endsWith('/') ? `${url}api` : `${url}/api`;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 300_000,
});

api.interceptors.request.use(async (config) => {
  const defaultSettings = await db.settings.get('default');
  const provider = defaultSettings?.provider || 'groq';
  const keyRecord = await db.keys.get(provider);
  
  config.headers['X-Provider'] = provider;
  if (keyRecord?.apiKey) {
    config.headers['X-API-Key'] = keyRecord.apiKey;
  }
  return config;
});

export async function ingestSource(request: IngestRequest): Promise<IngestResponse> {
  const { data } = await api.post<IngestResponse>('/ingest/', request);
  return data;
}

export async function getIngestProgress(sourceId: string): Promise<IngestProgress> {
  const { data } = await api.get<IngestProgress>(`/ingest/progress/${encodeURIComponent(sourceId)}`);
  return data;
}

export async function askQuestion(question: string, sourceId: string): Promise<AskResponse> {
  const { data } = await api.post<AskResponse>('/ask/', {
    question,
    source_id: sourceId,
  });
  return data;
}

export async function askQuestionStream(
  question: string,
  sourceId: string,
  onChunk: (token: string) => void,
  onDone: (sources: SourceReference[]) => void,
  onError: (error: any) => void
): Promise<void> {
  try {
    const defaultSettings = await db.settings.get('default');
    const provider = defaultSettings?.provider || 'groq';
    const keyRecord = await db.keys.get(provider);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Provider': provider,
    };
    if (keyRecord?.apiKey) {
      headers['X-API-Key'] = keyRecord.apiKey;
    }

    const streamBase = import.meta.env.VITE_API_URL || '';
    const streamURL = streamBase.endsWith('/') ? `${streamBase}api/ask/stream` : `${streamBase}/api/ask/stream`;

    const response = await fetch(streamURL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, source_id: sourceId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = response.statusText;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.detail) {
          errorDetail = errorJson.detail;
        }
      } catch (e) {}
      throw new Error(errorDetail || `HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const dataStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.token) {
            onChunk(parsed.token);
          }
          if (parsed.done) {
            onDone(parsed.sources || []);
          }
        } catch (e) {
          console.warn('Failed to parse SSE line:', line, e);
        }
      }
    }
  } catch (err: any) {
    onError(err);
  }
}

export async function getSources(sourceId: string): Promise<SourceSummary> {
  const { data } = await api.get<SourceSummary>(`/sources/${sourceId}`);
  return data;
}

export async function getVideoChunks(sourceId: string, videoId: string): Promise<VideoChunk[]> {
  const { data } = await api.get<VideoChunk[]>(
    `/sources/${encodeURIComponent(sourceId)}/videos/${encodeURIComponent(videoId)}/chunks`
  );
  return data;
}

export async function deleteSource(sourceId: string): Promise<void> {
  await api.delete(`/sources/${sourceId}`);
}

export async function getHealth(): Promise<{ status: string; has_groq_api_key: boolean }> {
  const { data } = await api.get<{ status: string; has_groq_api_key: boolean }>('/health');
  return data;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

