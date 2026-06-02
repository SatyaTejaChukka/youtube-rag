import axios from 'axios';

import { db } from '../db';
import type { AskResponse, IngestRequest, IngestResponse, SourceSummary } from '../types';

const api = axios.create({
  baseURL: '/api',
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

export async function askQuestion(question: string, sourceId: string): Promise<AskResponse> {
  const { data } = await api.post<AskResponse>('/ask/', {
    question,
    source_id: sourceId,
  });
  return data;
}

export async function getSources(sourceId: string): Promise<SourceSummary> {
  const { data } = await api.get<SourceSummary>(`/sources/${sourceId}`);
  return data;
}

export async function deleteSource(sourceId: string): Promise<void> {
  await api.delete(`/sources/${sourceId}`);
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
  }
  return fallback;
}
