import Dexie, { type Table } from 'dexie';

export interface ProviderKey {
  provider: string; // e.g., 'groq', 'ollama'
  apiKey: string;
}

export interface UserSettings {
  id: string; // usually 'default'
  provider: string;
  theme: string;
}

export interface ChatSession {
  id: string;
  createdAt: Date;
  messages: any[]; // will be cast to Message[] where needed
}

export class TubeRAGDB extends Dexie {
  keys!: Table<ProviderKey, string>;
  settings!: Table<UserSettings, string>;
  chats!: Table<ChatSession, string>;

  constructor() {
    super('TubeRAG');
    this.version(1).stores({
      keys: 'provider',
      settings: 'id',
      chats: 'id, createdAt'
    });
  }
}

export const db = new TubeRAGDB();
