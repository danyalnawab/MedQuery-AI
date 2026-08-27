import { Suspense } from "react";
import { ChatWindow } from "@/components/chat/chat-window";

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatWindow />
    </Suspense>
  );
}
