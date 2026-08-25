"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";

export type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  noMatch?: boolean;
};

export function ChatMessage({ message }: { message: Message }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <Card
        className={`max-w-[80%] p-3 ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"}`}
      >
        <p className="whitespace-pre-wrap">
          {message.noMatch ? "Unable to find matching results." : message.content}
        </p>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 text-sm">
            <button
              className="underline opacity-70"
              onClick={() => setSourcesOpen((open) => !open)}
            >
              {sourcesOpen ? "Hide sources" : "Show sources"}
            </button>
            {sourcesOpen && (
              <ul className="mt-1 list-disc pl-4 opacity-70">
                {message.sources.map((source, i) => (
                  <li key={`${source}-${i}`}>{source}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
