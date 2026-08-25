from langchain.prompts import ChatPromptTemplate

RELEVANCE_THRESHOLD = 0.7


def is_below_relevance_threshold(results: list[tuple]) -> bool:
    """results: list of (Document, score) tuples from a Chroma similarity search."""
    return len(results) == 0 or results[0][1] < RELEVANCE_THRESHOLD


def format_history_for_prompt(history: list[dict]) -> str:
    """history: list of {"role": "user"|"assistant", "content": str}."""
    if not history:
        return ""
    lines = [f"{turn['role'].capitalize()}: {turn['content']}" for turn in history]
    return "\n".join(lines)


CONDENSE_PROMPT = ChatPromptTemplate.from_template(
    """Given the conversation history and a follow-up question, decide whether \
the follow-up question is actually related to that history.

- If it is related (e.g. it uses pronouns, "what about...", or otherwise \
depends on the prior turns to make sense), rephrase it into a standalone \
question that includes the necessary context from the history.
- If it is NOT related — a new, independent topic — return the follow-up \
question completely unchanged. Do not pull in unrelated terms from the \
history just because history exists.

Conversation history:
{history}

Follow-up question: {question}

Standalone question:"""
)


def condense_question(message: str, history: list[dict], llm) -> str:
    if not history:
        return message
    prompt = CONDENSE_PROMPT.format(
        history=format_history_for_prompt(history), question=message
    )
    response = llm.invoke(prompt)
    return response.content.strip()


def retrieve(query: str, db, k: int = 3) -> tuple[str, list[str]]:
    results = db.similarity_search_with_relevance_scores(query, k=k)
    if is_below_relevance_threshold(results):
        return "", []
    context = "\n\n---\n\n".join(doc.page_content for doc, _ in results)
    sources = [doc.metadata.get("source") for doc, _ in results]
    return context, sources


ANSWER_PROMPT = ChatPromptTemplate.from_template(
    """Answer the question based only on the following context:

{context}

---

Conversation history:
{history}

Answer the question based on the above context: {question}"""
)


def stream_answer(message: str, history: list[dict], db, llm):
    standalone_query = condense_question(message, history, llm)
    context, sources = retrieve(standalone_query, db)
    if not sources:
        yield {"no_match": True}
        return
    prompt = ANSWER_PROMPT.format(
        context=context, history=format_history_for_prompt(history), question=message
    )
    for chunk in llm.stream(prompt):
        if chunk.content:
            yield {"token": chunk.content}
    yield {"done": True, "sources": sources}
