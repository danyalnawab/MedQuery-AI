"use client"

import { useEffect, useRef } from "react"
import { ArrowUp, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MAX_HEIGHT_PX = 160

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  isStreaming,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isStreaming: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [value])

  const canSend = value.trim().length > 0 && !isStreaming

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (canSend) onSubmit()
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSend) onSubmit()
      }}
      className="flex items-end gap-2 border-t bg-background p-3 sm:p-4"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about integrative medicine topics..."
        aria-label="Ask a question"
        rows={1}
        disabled={isStreaming}
        className={cn(
          "max-h-40 min-h-8 w-full flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-1.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 md:text-sm dark:bg-input/30"
        )}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!canSend}
        aria-label={isStreaming ? "Waiting for response" : "Send message"}
      >
        {isStreaming ? <Loader2 className="animate-spin" /> : <ArrowUp />}
      </Button>
    </form>
  )
}
