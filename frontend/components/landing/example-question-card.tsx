"use client";

import { Card } from "@/components/ui/card";

export function ExampleQuestionCard({
  question,
  onSelect,
}: {
  question: string;
  onSelect: (question: string) => void;
}) {
  return (
    <button type="button" onClick={() => onSelect(question)} className="text-left">
      <Card className="p-3 text-sm transition-colors hover:bg-accent">
        {question}
      </Card>
    </button>
  );
}
