from backend.rag import is_below_relevance_threshold, format_history_for_prompt


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
