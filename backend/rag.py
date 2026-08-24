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
    """Given the conversation history and a follow-up question, rephrase the \
follow-up question to be a standalone question that includes any necessary \
context from the history.

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
