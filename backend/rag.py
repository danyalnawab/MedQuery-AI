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
