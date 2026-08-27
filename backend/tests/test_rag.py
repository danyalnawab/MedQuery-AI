from backend.rag import (
    is_below_relevance_threshold,
    format_history_for_prompt,
    condense_question,
    retrieve,
    stream_answer,
)


def test_is_below_relevance_threshold_empty_results():
    assert is_below_relevance_threshold([]) is True


def test_is_below_relevance_threshold_low_score():
    assert is_below_relevance_threshold([(object(), 0.5)]) is True


def test_is_below_relevance_threshold_high_score():
    assert is_below_relevance_threshold([(object(), 0.8)]) is False


def test_format_history_for_prompt_empty():
    assert format_history_for_prompt([]) == ""


def test_format_history_for_prompt_multiple_turns():
    history = [
        {"role": "user", "content": "Is X safe?"},
        {"role": "assistant", "content": "Yes, generally."},
    ]
    assert format_history_for_prompt(history) == "User: Is X safe?\nAssistant: Yes, generally."


class FakeLLMResponse:
    def __init__(self, content):
        self.content = content


class FakeLLM:
    def __init__(self, response_content):
        self.response_content = response_content
        self.last_prompt = None

    def invoke(self, prompt):
        self.last_prompt = prompt
        return FakeLLMResponse(self.response_content)


def test_condense_question_returns_message_unchanged_when_no_history():
    llm = FakeLLM("should not be used")
    result = condense_question("What about kids?", [], llm)
    assert result == "What about kids?"


def test_condense_question_calls_llm_when_history_present():
    llm = FakeLLM("Is X safe for children?")
    history = [
        {"role": "user", "content": "Is X safe?"},
        {"role": "assistant", "content": "Yes, generally."},
    ]
    result = condense_question("What about kids?", history, llm)
    assert result == "Is X safe for children?"
    assert "What about kids?" in llm.last_prompt
    assert "Is X safe?" in llm.last_prompt


class FakeDocument:
    def __init__(self, page_content, metadata):
        self.page_content = page_content
        self.metadata = metadata


class FakeDB:
    def __init__(self, results):
        self.results = results
        self.last_query = None
        self.last_k = None

    def similarity_search_with_relevance_scores(self, query, k=3):
        self.last_query = query
        self.last_k = k
        return self.results


def test_retrieve_returns_context_and_sources_above_threshold():
    docs = [
        (FakeDocument("chunk one", {"source": "a.md"}), 0.9),
        (FakeDocument("chunk two", {"source": "b.md"}), 0.8),
    ]
    context, sources = retrieve("query", FakeDB(docs))
    assert "chunk one" in context and "chunk two" in context
    assert sources == ["a.md", "b.md"]


def test_retrieve_returns_empty_below_threshold():
    db = FakeDB([(FakeDocument("chunk", {"source": "a.md"}), 0.3)])
    context, sources = retrieve("query", db)
    assert context == ""
    assert sources == []


def test_retrieve_returns_empty_for_no_results():
    context, sources = retrieve("query", FakeDB([]))
    assert context == ""
    assert sources == []


class FakeStreamChunk:
    def __init__(self, content):
        self.content = content


class FakeStreamingLLM(FakeLLM):
    def __init__(self, response_content, stream_chunks):
        super().__init__(response_content)
        self.stream_chunks = stream_chunks

    def stream(self, prompt):
        return iter(FakeStreamChunk(c) for c in self.stream_chunks)


def test_stream_answer_yields_no_match_when_below_threshold():
    db = FakeDB([])
    llm = FakeStreamingLLM("standalone", [])
    events = list(stream_answer("question", [], db, llm))
    assert events == [{"no_match": True}]


def test_stream_answer_yields_tokens_then_done_with_sources():
    docs = [(FakeDocument("chunk", {"source": "a.md"}), 0.9)]
    db = FakeDB(docs)
    llm = FakeStreamingLLM("standalone question", ["Hel", "lo"])
    events = list(stream_answer("question", [], db, llm))
    assert events == [
        {"token": "Hel"},
        {"token": "lo"},
        {"done": True, "sources": ["a.md"]},
    ]


def test_stream_answer_condenses_question_when_history_present():
    docs = [(FakeDocument("chunk", {"source": "a.md"}), 0.9)]
    db = FakeDB(docs)
    llm = FakeStreamingLLM("condensed standalone question", ["ok"])
    history = [
        {"role": "user", "content": "Is X safe?"},
        {"role": "assistant", "content": "Yes."},
    ]
    events = list(stream_answer("What about kids?", history, db, llm))
    assert events[-1] == {"done": True, "sources": ["a.md"]}
    assert llm.last_prompt is not None
    assert "What about kids?" in llm.last_prompt
    assert db.last_query == "condensed standalone question"
    assert db.last_k == 3
