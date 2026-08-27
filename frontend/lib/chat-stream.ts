export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatEvent =
  | { token: string }
  | { done: true; sources: string[] }
  | { no_match: true }
  | { error: string };

export async function streamChat(
  message: string,
  history: ChatTurn[],
  onEvent: (event: ChatEvent) => void,
): Promise<void> {
  // Same-origin call: the Next.js server proxies `/api/chat` to the FastAPI
  // backend (see `app/api/chat/route.ts`). Keeping this relative means no
  // backend hostname is ever baked into the browser bundle.
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) {
    throw new Error(`/chat returned ${response.status}`);
  }

  if (!response.body) {
    throw new Error("No response body from /chat");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice("data: ".length)) as ChatEvent;
      onEvent(event);
    }
  }
}
