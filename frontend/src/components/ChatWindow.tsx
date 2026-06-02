import { useEffect, useRef, useState } from 'react';

import { apiErrorMessage, askQuestionStream } from '../api/client';
import type { Message } from '../types';
import InputBar from './InputBar';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface Props {
  sourceId: string;
  onSelectSource?: (videoId: string, videoTitle: string, startSeconds: number) => void;
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
      <p className="text-center text-sm text-(--text-muted)">Ask anything about the indexed videos</p>
      <div className="mx-auto flex max-w-md flex-col gap-2">
        {hints.map((hint) => (
          <div
            key={hint}
            className="
              rounded-[10px] border border-white/6 bg-white/2 px-4 py-2.5
              text-sm text-(--text-muted) transition-all duration-150
              hover:translate-x-0.5 hover:border-white/10 hover:bg-white/4 hover:text-(--text-secondary)
            "
          >
            {hint}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChatWindow({ sourceId, onSelectSource }: Props) {
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

    const assistantMsgId = newId();

    try {
      await askQuestionStream(
        question,
        sourceId,
        (token) => {
          setLoading(false); // Safe to call directly in callback body
          setMessages((current) => {
            const exists = current.some((msg) => msg.id === assistantMsgId);
            if (!exists) {
              return [
                ...current,
                {
                  id: assistantMsgId,
                  role: 'assistant',
                  content: token,
                  timestamp: new Date(),
                },
              ];
            } else {
              return current.map((msg) =>
                msg.id === assistantMsgId ? { ...msg, content: msg.content + token } : msg
              );
            }
          });
        },
        (sources) => {
          setLoading(false);
          setMessages((current) =>
            current.map((msg) => (msg.id === assistantMsgId ? { ...msg, sources } : msg))
          );
        },
        (error) => {
          setLoading(false);
          const errorMsg = apiErrorMessage(error, 'Something went wrong retrieving an answer. Please try again.');
          setMessages((current) => {
            const exists = current.some((msg) => msg.id === assistantMsgId);
            if (!exists) {
              return [
                ...current,
                {
                  id: assistantMsgId,
                  role: 'assistant',
                  content: errorMsg,
                  timestamp: new Date(),
                },
              ];
            } else {
              return current.map((msg) =>
                msg.id === assistantMsgId ? { ...msg, content: msg.content + `\n\n[Error: ${errorMsg}]` } : msg
              );
            }
          });
        }
      );
    } catch (error) {
      setLoading(false);
      const errorMsg = apiErrorMessage(error, 'Something went wrong retrieving an answer. Please try again.');
      setMessages((current) => [
        ...current,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: errorMsg,
          timestamp: new Date(),
        },
      ]);
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
                <MessageBubble key={message.id} message={message} index={index} onSelectSource={onSelectSource} />
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
