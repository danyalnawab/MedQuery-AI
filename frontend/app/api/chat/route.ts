import type { NextRequest } from "next/server";

// This route always runs per-request on the server; never cache or prerender it.
export const dynamic = "force-dynamic";

/**
 * Server-side proxy from the browser to the FastAPI backend.
 *
 * The browser calls this same-origin endpoint (`/api/chat`). This handler runs
 * inside the Next.js container and forwards the request to the backend over the
 * internal Docker network, so `BACKEND_URL` uses the Compose service name
 * (`http://backend:8000`) which is only resolvable server-side. The default
 * keeps `npm run dev` working against a locally running backend.
 *
 * The upstream response is a Server-Sent Events stream; returning
 * `upstream.body` streams tokens straight through without buffering.
 */
export async function POST(req: NextRequest) {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";
  const body = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Backend is unavailable." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
