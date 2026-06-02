import { useEffect, useRef, useState } from 'react';

import { apiErrorMessage, askQuestion } from '../api/client';
import type { Message } from '../types';
import InputBar from './InputBar';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface Props {
  sourceId: string;
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function ChatEmptyHint() {
  const hints = [
    'What are the main topics covered?',
    'What does the creator say about getting started?',
    'Summarize the key takeaways from these videos.',
  ];

  return (
    <div className="fade-in-up space-y-6 pt-12">
      <p className="text-center text-sm text-[var(--text-muted)]">Ask anything about the indexed videos</p>
      <div className="mx-auto flex max-w-md flex-col gap-2">
        {hints.map((hint) => (
          <div
            key={hint}
            className="
              rounded-[10px] border border-white/6 bg-white/[0.02] px-4 py-2.5
              text-sm text-[var(--text-muted)] transition-all duration-150
              hover:translate-x-0.5 hover:border-white/10 hover:bg-white/[0.04] hover:text-[var(--text-secondary)]
            "
          >
            {hint}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatWindow({ sourceId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    setLoading(false);
  }, [sourceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(text: string) {
    const question = text.trim();
    if (!question || loading) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: newId(),
        role: 'user',
        content: question,
        timestamp: new Date(),
      },
    ]);
    setLoading(true);

    try {
      const result = await askQuestion(question, sourceId);
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: 'assistant',
          content: result.answer,
          sources: result.sources,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: 'assistant',
          content: apiErrorMessage(error, 'Something went wrong retrieving an answer. Please try again.'),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[720px] px-6 pb-4 pt-8">
          {messages.length === 0 ? (
            <ChatEmptyHint />
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <MessageBubble key={message.id} message={message} index={index} />
              ))}
              {loading && <TypingIndicator />}
              <div ref={bottomRef} className="h-4" />
            </div>
          )}
          {messages.length === 0 && loading && <TypingIndicator />}
        </div>
      </div>

      <InputBar onSend={handleSend} disabled={loading} />
    </div>
  );
}
