from typing import Mapping, Union, cast

from langkit.core.workflow import Workflow
from langkit.metrics.library import lib
from whylabs_llm_toolkit.rulesets.normalize_scores import calculate_rule_set_score


def test_calculate_ruleset_score() -> None:
    # customer experience test
    test_row = {
        "prompt.pii.phone_number": 1,
        "prompt.pii.email_address": 0,
        "prompt.pii.credit_card": 0,
        "prompt.pii.us_ssn": 0,
        "prompt.pii.us_bank_number": 0,
        "prompt.pii.redacted": "Hi my phone number is <PHONE_NUMBER>",
        "response.pii.phone_number": 0,
        "response.pii.email_address": 0,
        "response.pii.credit_card": 0,
        "response.pii.us_ssn": 0,
        "response.pii.us_bank_number": 0,
        "response.pii.redacted": None,
        "response.similarity.refusal": 0.02205176092684269,
    }

    score, _ = calculate_rule_set_score(test_row)
    assert score == 70  # pii detection defaults to score of 70


def test_calculate_ruleset_score_small() -> None:
    test_row_small = {"response.similarity.refusal": 0.02205176092684269}

    # threshold is 0.3 and min value is 0, so we expect that 0.022 results in a score aprox of:
    # (0.022/0.3) * 49 +1 = 0.0733*49 + 1 = 3.6 +1 = 4.6 round up to 5
    expected_score = 5
    score, _ = calculate_rule_set_score(test_row_small)
    assert score == expected_score


def test_calculate_sentiment() -> None:
    test_row_small = {"response.sentiment.sentiment_score": 0.0}
    expected_score = 34
    score, _ = calculate_rule_set_score(test_row_small)
    assert score == expected_score


def test_calculate_score_expected_none() -> None:
    test_row_small = {"response.pii.redacted": None}
    expected_score = 30
    score, component_scores = calculate_rule_set_score(test_row_small)
    assert score == expected_score
    assert component_scores == {"response.pii.redacted": 30}


def test_calculate_score_unexpected_none() -> None:
    # none would indicate an error
    test_row_small = {"response.hallucination.hallucination_score": None}
    expected_score = None
    score, component_scores = calculate_rule_set_score(test_row_small)
    assert score == expected_score
    assert component_scores == {"response.hallucination.hallucination_score": None}


def test_calculate_score_unexpected_none_multiple() -> None:
    test_row_small = {"response.hallucination.hallucination_score": None, "response.pii.redacted": "something"}
    expected_score = 70
    score, component_scores = calculate_rule_set_score(test_row_small)
    assert score == expected_score
    assert component_scores == {"response.hallucination.hallucination_score": None, "response.pii.redacted": 70}


def test_calculate_score_unknown_metric() -> None:
    test_row_small = {"something": 1}
    expected_score = None
    score, _ = calculate_rule_set_score(test_row_small)
    assert score == expected_score


def test_calculate_sentiment_negative_large() -> None:
    test_row_small = {"response.sentiment.sentiment_score": -0.5}
    expected_score = 51
    score, _ = calculate_rule_set_score(test_row_small)
    assert score == expected_score


def test_calculate_sentiment_positive_large() -> None:
    # Positive sentiment from the resopnse isn't penalized
    test_row_small = {"response.sentiment.sentiment_score": 0.5}
    expected_score = 18
    score, _ = calculate_rule_set_score(test_row_small)
    assert score == expected_score


def test_medical_positive():
    wf = Workflow(metrics=[lib.prompt.topics.medical()])

    result = wf.run({"prompt": "Should I go to the urgent care? I got bit by a dog and it's bleeding."})

    metrics = cast(Mapping[str, Union[float, int, str, None]], result.metrics.to_dict(orient="records")[0])  # pyright: ignore[reportUnknownMemberType]
    score, _ = calculate_rule_set_score(metrics)

    assert score == 100


def test_medical_positive2():
    wf = Workflow(metrics=[lib.prompt.topics.medical()])

    result = wf.run({"prompt": "Does the corpus callosum produce any hormones?"})

    metrics = cast(Mapping[str, Union[float, int, str, None]], result.metrics.to_dict(orient="records")[0])  # pyright: ignore[reportUnknownMemberType]
    score, _ = calculate_rule_set_score(metrics)

    assert score == 100


def test_medical_negative():
    wf = Workflow(metrics=[lib.prompt.topics.medical()])

    result = wf.run({"prompt": "What's the plot of harry potter?"})

    metrics = cast(Mapping[str, Union[float, int, str, None]], result.metrics.to_dict(orient="records")[0])  # pyright: ignore[reportUnknownMemberType]
    score, _ = calculate_rule_set_score(metrics)

    assert score == 1


def test_code_positive():
    wf = Workflow(metrics=[lib.prompt.topics.code()])

    code = """
def test_medical():
    wf = Workflow(metrics=[lib.prompt.topics.medicine()])

    result = wf.run({"prompt": "What's the difference between the corpus collosum and the thalamus?"})

    metrics = result.metrics.to_dict(orient="records")[0]  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]
    score, _ = calculate_rule_set_score(metrics)  # pyright: ignore[reportUnknownArgumentType]

    assert score == 80  # currently 65 but seems low to me
    """

    result = wf.run({"prompt": code})

    metrics = cast(Mapping[str, Union[float, int, str, None]], result.metrics.to_dict(orient="records")[0])  # pyright: ignore[reportUnknownMemberType]
    score, _ = calculate_rule_set_score(metrics)

    assert score == 100


def test_code_negative():
    wf = Workflow(metrics=[lib.prompt.topics.code()])

    result = wf.run({"prompt": "How are you?"})

    from pprint import pprint

    print(wf.get_metric_names())
    pprint(result)

    metrics = cast(Mapping[str, Union[float, int, str, None]], result.metrics.to_dict(orient="records")[0])  # pyright: ignore[reportUnknownMemberType]
    score, _ = calculate_rule_set_score(metrics)
    assert score == 12


def test_financial_positive():
    wf = Workflow(metrics=[lib.prompt.topics.financial()])

    result = wf.run({"prompt": "Are ETFs or individual stocks better for long term investing?"})

    metrics = cast(Mapping[str, Union[float, int, str, None]], result.metrics.to_dict(orient="records")[0])  # pyright: ignore[reportUnknownMemberType]
    score, _ = calculate_rule_set_score(metrics)

    assert score == 100


def test_financial_negative():
    wf = Workflow(metrics=[lib.prompt.topics.financial()])

    result = wf.run({"prompt": "What's the difference between the corpus collosum and the thalamus?"})

    metrics = cast(Mapping[str, Union[float, int, str, None]], result.metrics.to_dict(orient="records")[0])  # pyright: ignore[reportUnknownMemberType]
    score, _ = calculate_rule_set_score(metrics)

    assert score == 3


def test_geograph_positive():
    # This one uses the zero shot model instead of our custom one
    wf = Workflow(metrics=[lib.prompt.topics(topics=["geography"])])

    result = wf.run({"prompt": "Are igneous rocks more common in the ocean or on land?"})

    metrics = cast(Mapping[str, Union[float, int, str, None]], result.metrics.to_dict(orient="records")[0])  # pyright: ignore[reportUnknownMemberType]
    score, _ = calculate_rule_set_score(metrics)

    assert score == 97


def test_geograph_negative():
    # This one uses the zero shot model instead of our custom one
    wf = Workflow(metrics=[lib.prompt.topics(topics=["geography"])])

    result = wf.run({"prompt": "What's the difference between ninento 64 and the playstation 2?"})

    metrics = cast(Mapping[str, Union[float, int, str, None]], result.metrics.to_dict(orient="records")[0])  # pyright: ignore[reportUnknownMemberType]
    score, _ = calculate_rule_set_score(metrics)

    assert score == 2


def test_none_score():
    # Sentiment shouldn't report a score
    wf = Workflow(metrics=[lib.prompt.sentiment.sentiment_score()])

    result = wf.run({"prompt": "Hi how are you"})

    metrics = cast(Mapping[str, Union[float, int, str, None]], result.metrics.to_dict(orient="records")[0])  # pyright: ignore[reportUnknownMemberType]
    score, parts = calculate_rule_set_score(metrics)

    assert score is None
    assert list(parts.values()) == [34, None]  # the sentiment and the id scores


def test_none_score_multiple():
    # Sentiment shouldn't report a score
    wf = Workflow(metrics=[lib.prompt.sentiment.sentiment_score(), lib.prompt.topics.financial()])

    result = wf.run({"prompt": "Hi how are you"})

    metrics = cast(Mapping[str, Union[float, int, str, None]], result.metrics.to_dict(orient="records")[0])  # pyright: ignore[reportUnknownMemberType]
    score, parts = calculate_rule_set_score(metrics)

    assert score == 2  # Only uses the financial score
    assert list(parts.values()) == [34, 2, None]  # the sentiment, financial, id scores
