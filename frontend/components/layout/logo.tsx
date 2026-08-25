import Link from "next/link"
import { Leaf } from "lucide-react"

import { cn } from "@/lib/utils"

function LogoMark({ size = "default" }: { size?: "default" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-heading font-semibold text-foreground",
        size === "lg" ? "text-3xl sm:text-4xl" : "text-lg"
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground",
          size === "lg" ? "size-10" : "size-7"
        )}
      >
        <Leaf className={size === "lg" ? "size-5" : "size-4"} />
      </span>
      MedQuery-AI
    </span>
  )
}

export function Logo({
  size = "default",
  asLink = true,
}: {
  size?: "default" | "lg"
  asLink?: boolean
}) {
  if (!asLink) {
    return <LogoMark size={size} />
  }
  return (
    <Link
      href="/"
      aria-label="MedQuery-AI home"
      className="inline-flex transition-opacity hover:opacity-80"
    >
      <LogoMark size={size} />
    </Link>
  )
}
