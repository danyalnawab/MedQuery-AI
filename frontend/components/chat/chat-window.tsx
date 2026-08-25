"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, type Message } from "./chat-message";
import { streamChat, type ChatTurn } from "@/lib/chat-stream";

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = { role: "user", content: input };
    const history: ChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setInput("");
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

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b bg-muted p-4">
        <h1 className="text-lg font-semibold">MedQuery-AI</h1>
        <p className="text-sm text-muted-foreground">
          Integrative Medicine Query Assistant — an experimental AI chatbot
          designed to help users explore and understand concepts from
          integrative and holistic medicine literature.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          ⚠️ Disclaimer: This tool is not intended to diagnose, treat, or
          replace professional medical advice. Always consult a qualified
          healthcare provider regarding any medical condition.
        </p>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-3">
          {messages.map((message, i) => (
            <ChatMessage key={i} message={message} />
          ))}
        </div>
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
