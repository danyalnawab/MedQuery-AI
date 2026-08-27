"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/layout/logo"
import { ExampleQuestionCard } from "@/components/landing/example-question-card"
import { EXAMPLE_QUESTIONS } from "@/lib/example-questions"

const CORPUS_TOPICS = [
  "Affective Disorders",
  "Neurology",
  "Infectious Disease",
  "Cardiovascular Disease",
  "Allergy",
  "Metabolic & Endocrine Disorders",
  "Nephrology",
  "Gastrointestinal Disorders",
  "Autoimmune Disease",
  "Gynecology",
  "Urology",
  "Musculoskeletal",
  "Dermatology",
  "Cancer",
  "Substance Abuse",
  "Ophthalmology",
]

export default function Home() {
  const router = useRouter()

  function askExample(question: string) {
    router.push(`/chat?q=${encodeURIComponent(question)}`)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-16">
      <section className="flex flex-col items-center gap-4 text-center">
        <h1>
          <Logo size="lg" asLink={false} />
        </h1>
        <p className="max-w-xl text-muted-foreground">
          An AI assistant for exploring integrative medicine literature —
          ask a question and get answers grounded in a curated document
          corpus, with sources cited.
        </p>
        <Link href="/chat">
          <Button size="lg">Start Chatting</Button>
        </Link>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-center text-lg font-semibold">Try asking:</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <ExampleQuestionCard key={q} question={q} onSelect={askExample} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">How it works</h2>
        <p className="text-muted-foreground">
          Answers are grounded in a specific collection of Integrative
          Medicine documents — not general web knowledge. When a question
          matches the corpus, the assistant cites its sources; when it
          doesn&apos;t, it says so instead of guessing. The corpus covers:
        </p>
        <div className="flex flex-wrap gap-2">
          {CORPUS_TOPICS.map((topic) => (
            <Badge key={topic} variant="secondary">
              {topic}
            </Badge>
          ))}
        </div>
      </section>

      <footer className="border-t pt-6 text-sm text-muted-foreground">
        ⚠️ Disclaimer: This tool is not intended to diagnose, treat, or
        replace professional medical advice. Always consult a qualified
        healthcare provider regarding any medical condition.
      </footer>
    </div>
  )
}
