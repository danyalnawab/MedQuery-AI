# Running the stack with Docker

The whole application (Next.js frontend + FastAPI backend + bundled Chroma
vector store) runs as two containers defined in [`compose.yml`](compose.yml).

## Prerequisites

- Docker with Compose v2 (`docker compose`, not `docker-compose`)
- An OpenAI API key

## First run

```bash
cp .env.example .env          # then edit .env and set OPENAI_API_KEY
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend:  http://localhost:8000  (`/docs` for the API, `/health` for probes)

The browser only ever talks to the frontend. The frontend container proxies
`POST /api/chat` to the backend at `http://backend:8000/chat` over the private
Compose network — see [`frontend/app/api/chat/route.ts`](frontend/app/api/chat/route.ts).

## Common commands

| Task | Command |
| --- | --- |
| Start (foreground) | `docker compose up --build` |
| Start (background) | `docker compose up --build -d` |
| Rebuild after code changes | `docker compose up --build` (rebuilds changed layers only) |
| Force full rebuild | `docker compose build --no-cache && docker compose up` |
| Logs (all) | `docker compose logs -f` |
| Logs (one service) | `docker compose logs -f backend` |
| Stop, keep containers | `docker compose stop` |
| Stop and remove containers + network | `docker compose down` |
| Status / health | `docker compose ps` |

### Port already in use

Override the host ports without editing `compose.yml`:

```bash
FRONTEND_PORT=3100 BACKEND_PORT=8100 docker compose up --build
```

## Environment variables

| Variable | Where | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `OPENAI_API_KEY` | backend (runtime) | **yes** | – | OpenAI embeddings + chat completions |
| `ALLOWED_ORIGINS` | backend (runtime) | no | `http://localhost:3000` | CORS allow-list (only matters if the browser calls the backend directly) |
| `BACKEND_URL` | frontend (runtime) | no | `http://backend:8000` (set in `compose.yml`) | where the frontend proxy forwards `/api/*`; falls back to `http://localhost:8000` for `npm run dev` |
| `FRONTEND_PORT` / `BACKEND_PORT` | compose (host) | no | `3000` / `8000` | host port mappings |

There are currently **no `NEXT_PUBLIC_*` variables**, and the browser bundle
contains no backend hostname — all backend traffic goes through the same-origin
`/api/chat` proxy. Keep it that way: a `NEXT_PUBLIC_*` value is inlined into the
static JS at **build time**, so it cannot be changed per environment without
rebuilding the image.

## Persistent data

None. The Chroma vector store is committed to the repo and baked into the
backend image at build time (`COPY chroma/`), so a fresh clone works with no
volumes and no `create_database.py` run. To iterate on the DB without
rebuilding, bind-mount it: add `volumes: ["./chroma:/app/chroma:ro"]` to the
`backend` service.
