"use client"

import { useState } from "react"
import { AlertTriangle, Check, ChevronDown, Copy, FileText, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ThinkingIndicator } from "./thinking-indicator"

export type Message = {
  role: "user" | "assistant"
  content: string
  sources?: string[]
  noMatch?: boolean
  error?: string
}

export function ChatMessage({
  message,
  isThinking = false,
}: {
  message: Message
  isThinking?: boolean
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const isUser = message.role === "user"
  const isAlert = Boolean(message.error || message.noMatch)

  async function copyContent() {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn("flex items-start gap-2.5", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-3.5" />
        </div>
      )}
      <Card
        className={cn(
          "group/message max-w-[85%] gap-1.5 p-3 sm:max-w-[75%]",
          isUser ? "bg-primary text-primary-foreground" : isAlert ? "bg-destructive/10" : "bg-muted"
        )}
      >
        {isThinking ? (
          <ThinkingIndicator />
        ) : (
          <>
            <div className="flex items-start gap-2">
              {isAlert && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />}
              <p className="whitespace-pre-wrap">
                {message.error
                  ? message.error
                  : message.noMatch
                    ? "Unable to find matching results."
                    : message.content}
              </p>
            </div>
            {!isUser && !isAlert && message.content && (
              <button
                type="button"
                onClick={copyContent}
                aria-label={copied ? "Copied" : "Copy message"}
                className="flex w-fit items-center gap-1 self-end text-xs text-muted-foreground opacity-0 transition-opacity group-hover/message:opacity-100 hover:text-foreground focus-visible:opacity-100"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setSourcesOpen((open) => !open)}
                  aria-expanded={sourcesOpen}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <FileText className="size-3.5" />
                  {sourcesOpen
                    ? "Hide sources"
                    : `${message.sources.length} source${message.sources.length > 1 ? "s" : ""}`}
                  <ChevronDown
                    className={cn("size-3.5 transition-transform", sourcesOpen && "rotate-180")}
                  />
                </button>
                {sourcesOpen && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.sources.map((source, i) => (
                      <Badge key={`${source}-${i}`} variant="secondary">
                        {source}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
