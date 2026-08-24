from fastapi.testclient import TestClient

from backend import main


def test_chat_endpoint_streams_sse_events(monkeypatch):
    def fake_stream_answer(message, history, db, llm):
        yield {"token": "Hel"}
        yield {"token": "lo"}
        yield {"done": True, "sources": ["a.md"]}

    monkeypatch.setattr(main, "stream_answer", fake_stream_answer)

    client = TestClient(main.app)
    response = client.post("/chat", json={"message": "hi", "history": []})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    body = response.text
    assert 'data: {"token": "Hel"}' in body
    assert 'data: {"token": "lo"}' in body
    assert '"done": true' in body
    assert '"sources": ["a.md"]' in body


def test_chat_endpoint_passes_history_through(monkeypatch):
    captured = {}

    def fake_stream_answer(message, history, db, llm):
        captured["message"] = message
        captured["history"] = history
        yield {"no_match": True}

    monkeypatch.setattr(main, "stream_answer", fake_stream_answer)

    client = TestClient(main.app)
    client.post(
        "/chat",
        json={
            "message": "What about kids?",
            "history": [{"role": "user", "content": "Is X safe?"}],
        },
    )

    assert captured["message"] == "What about kids?"
    assert captured["history"] == [{"role": "user", "content": "Is X safe?"}]
