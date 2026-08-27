import json
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pydantic import BaseModel

from backend.rag import stream_answer

logger = logging.getLogger(__name__)

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_PATH = os.environ.get("CHROMA_PATH", os.path.join(BASE_DIR, "chroma"))

# Comma-separated list of browser origins allowed to call this API directly.
# In the bundled Docker setup the browser only ever talks to the Next.js
# frontend, which proxies to this service over the internal Docker network,
# so this mainly matters when the backend is exposed to browsers directly.
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}

embedding_function = OpenAIEmbeddings()
db = Chroma(persist_directory=CHROMA_PATH, embedding_function=embedding_function)
llm = ChatOpenAI(temperature=0)


class ChatTurn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatTurn] = []


def format_sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


@app.post("/chat")
def chat(request: ChatRequest):
    history = [turn.model_dump() for turn in request.history]

    def event_stream():
        try:
            for event in stream_answer(request.message, history, db, llm):
                yield format_sse(event)
        except Exception:
            logger.exception("chat stream failed")
            yield format_sse({"error": "Something went wrong generating a response."})

    return StreamingResponse(event_stream(), media_type="text/event-stream")
