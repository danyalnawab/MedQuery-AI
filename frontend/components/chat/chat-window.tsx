"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle } from "lucide-react"

import { Logo } from "@/components/layout/logo"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatComposer } from "./chat-composer"
import { ChatMessage, type Message } from "./chat-message"
import { streamChat, type ChatTurn } from "@/lib/chat-stream"
import { ExampleQuestionCard } from "@/components/landing/example-question-card"
import { EXAMPLE_QUESTIONS } from "@/lib/example-questions"

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasAutoSubmitted = useRef(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return

    const userMessage: Message = { role: "user", content: text }
    const history: ChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }])
    setIsStreaming(true)

    try {
      await streamChat(userMessage.content, history, (event) => {
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if ("token" in event) {
            next[next.length - 1] = { ...last, content: last.content + event.token }
          } else if ("done" in event) {
            next[next.length - 1] = { ...last, sources: event.sources }
          } else if ("no_match" in event) {
            next[next.length - 1] = { ...last, noMatch: true }
          } else if ("error" in event) {
            next[next.length - 1] = { ...last, error: event.error }
          }
          return next
        })
      })
    } catch {
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = {
          ...next[next.length - 1],
          error: "Something went wrong reaching the server. Please try again.",
        }
        return next
      })
    } finally {
      setIsStreaming(false)
    }
  }

  function handleSubmit() {
    const text = input
    setInput("")
    sendMessage(text)
  }

  useEffect(() => {
    const q = searchParams.get("q")
    if (q && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true
      router.replace("/chat")
      sendMessage(q)
    }
    // sendMessage intentionally omitted: on first mount `messages` is always
    // empty, so the closure's history is correct for the auto-sent message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages])

  const showEmptyState = messages.length === 0
  const lastIndex = messages.length - 1

  return (
    <div className="flex h-screen flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
        <Logo />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="hidden sm:inline">Not a substitute for professional medical advice.</span>
          <span className="sm:hidden">Not medical advice.</span>
        </p>
      </div>
      <ScrollArea className="flex-1">
        {showEmptyState ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center sm:p-6">
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
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            {messages.map((message, i) => (
              <ChatMessage
                key={i}
                message={message}
                isThinking={
                  isStreaming &&
                  i === lastIndex &&
                  message.role === "assistant" &&
                  message.content === "" &&
                  !message.noMatch &&
                  !message.error
                }
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>
      <ChatComposer value={input} onChange={setInput} onSubmit={handleSubmit} isStreaming={isStreaming} />
    </div>
  )
}
