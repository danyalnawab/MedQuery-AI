"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, type Message } from "./chat-message";
import { streamChat, type ChatTurn } from "@/lib/chat-stream";
import { ExampleQuestionCard } from "@/components/landing/example-question-card";
import { EXAMPLE_QUESTIONS } from "@/lib/example-questions";

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasAutoSubmitted = useRef(false);

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    const userMessage: Message = { role: "user", content: text };
    const history: ChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setIsStreaming(true);

    try {
      await streamChat(userMessage.content, history, (event) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if ("token" in event) {
            next[next.length - 1] = { ...last, content: last.content + event.token };
          } else if ("done" in event) {
            next[next.length - 1] = { ...last, sources: event.sources };
          } else if ("no_match" in event) {
            next[next.length - 1] = { ...last, noMatch: true };
          } else if ("error" in event) {
            next[next.length - 1] = { ...last, error: event.error };
          }
          return next;
        });
      });
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: "Something went wrong reaching the server. Please try again.",
        };
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input;
    setInput("");
    sendMessage(text);
  }

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      router.replace("/chat");
      sendMessage(q);
    }
    // sendMessage intentionally omitted: on first mount `messages` is always
    // empty, so the closure's history is correct for the auto-sent message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const showEmptyState = messages.length === 0;

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b bg-muted p-4">
        <Link href="/" className="text-lg font-semibold hover:underline">
          MedQuery-AI
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">
          ⚠️ Not a substitute for professional medical advice.
        </p>
      </div>
      <ScrollArea className="flex-1 p-4">
        {showEmptyState ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-muted-foreground">
              Ask a question about integrative medicine to get started, or try one of these:
            </p>
            <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {EXAMPLE_QUESTIONS.map((q) => (
                <ExampleQuestionCard key={q} question={q} onSelect={sendMessage} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message, i) => (
              <ChatMessage key={i} message={message} />
            ))}
          </div>
        )}
      </ScrollArea>
      <form onSubmit={handleSubmit} className="flex gap-2 border-t p-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about integrative medicine topics..."
          disabled={isStreaming}
        />
        <Button type="submit" disabled={isStreaming}>
          Send
        </Button>
      </form>
    </div>
  );
}
