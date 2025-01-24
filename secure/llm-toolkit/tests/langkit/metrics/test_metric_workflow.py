import time
from functools import cache
from typing import List

import pandas as pd
import pytest

from langkit.core.metric import Metric, MetricCreator, MultiMetric, MultiMetricResult, SingleMetric, SingleMetricResult
from langkit.core.validation import ValidationFailure
from langkit.core.workflow import MetricFilterOptions, RunOptions, Workflow
from langkit.metrics.library import lib
from langkit.validators.library import lib as validator_lib


def test_just_prompt():
    wf = Workflow(metrics=[lib.presets.recommended()])
    result = wf.run({"prompt": "hi"})
    metrics = result.metrics

    metric_names: List[str] = metrics.columns.tolist()

    assert metric_names == [
        "prompt.pii.phone_number",
        "prompt.pii.email_address",
        "prompt.pii.credit_card",
        "prompt.pii.us_ssn",
        "prompt.pii.us_bank_number",
        "prompt.pii.redacted",
        "prompt.stats.token_count",
        "prompt.stats.char_count",
        "prompt.similarity.injection",
        "prompt.similarity.injection_neighbor_ids",
        "prompt.similarity.injection_neighbor_coordinates",
        "id",
    ]


def test_metric_filter_prompt():
    wf = Workflow(metrics=[lib.presets.recommended(), lib.response.similarity.prompt()])
    options = RunOptions(metric_filter=MetricFilterOptions(by_required_inputs=[["prompt"]]))
    result = wf.run({"prompt": "hi", "response": "hello"}, options)
    metrics = result.metrics

    metric_names: List[str] = metrics.columns.tolist()

    assert metric_names == [
        "prompt.pii.phone_number",
        "prompt.pii.email_address",
        "prompt.pii.credit_card",
        "prompt.pii.us_ssn",
        "prompt.pii.us_bank_number",
        "prompt.pii.redacted",
        "prompt.stats.token_count",
        "prompt.stats.char_count",
        "prompt.similarity.injection",
        "prompt.similarity.injection_neighbor_ids",
        "prompt.similarity.injection_neighbor_coordinates",
        "id",
    ]


def test_metric_filter_response():
    wf = Workflow(metrics=[lib.presets.recommended(), lib.response.similarity.prompt()])
    options = RunOptions(metric_filter=MetricFilterOptions(by_required_inputs=[["response"]]))
    result = wf.run({"prompt": "hi", "response": "hello"}, options)
    metrics = result.metrics

    metric_names: List[str] = metrics.columns.tolist()

    assert metric_names == [
        "response.pii.phone_number",
        "response.pii.email_address",
        "response.pii.credit_card",
        "response.pii.us_ssn",
        "response.pii.us_bank_number",
        "response.pii.redacted",
        "response.stats.token_count",
        "response.stats.char_count",
        "response.stats.flesch_reading_ease",
        "response.sentiment.sentiment_score",
        "response.toxicity.toxicity_score",
        "response.similarity.refusal",
        "id",
    ]


def test_metric_filter_prompt_or_response():
    wf = Workflow(metrics=[lib.presets.recommended(), lib.response.similarity.prompt()])
    options = RunOptions(metric_filter=MetricFilterOptions(by_required_inputs=[["prompt"], ["response"]]))
    result = wf.run({"prompt": "hi", "response": "hello"}, options)
    metrics = result.metrics

    metric_names: List[str] = metrics.columns.tolist()

    assert metric_names == [
        "prompt.pii.phone_number",
        "prompt.pii.email_address",
        "prompt.pii.credit_card",
        "prompt.pii.us_ssn",
        "prompt.pii.us_bank_number",
        "prompt.pii.redacted",
        "prompt.stats.token_count",
        "prompt.stats.char_count",
        "prompt.similarity.injection",
        "prompt.similarity.injection_neighbor_ids",
        "prompt.similarity.injection_neighbor_coordinates",
        "response.pii.phone_number",
        "response.pii.email_address",
        "response.pii.credit_card",
        "response.pii.us_ssn",
        "response.pii.us_bank_number",
        "response.pii.redacted",
        "response.stats.token_count",
        "response.stats.char_count",
        "response.stats.flesch_reading_ease",
        "response.sentiment.sentiment_score",
        "response.toxicity.toxicity_score",
        "response.similarity.refusal",
        "id",
    ]

    # swap the order of response/prompt filter, should be the same output
    options_swapped = RunOptions(metric_filter=MetricFilterOptions(by_required_inputs=[["response"], ["prompt"]]))
    result = wf.run({"prompt": "hi", "response": "hello"}, options_swapped)
    assert metric_names == result.metrics.columns.tolist()


def test_metric_filter_both_prompt_and_response():
    wf = Workflow(metrics=[lib.presets.recommended(), lib.response.similarity.prompt()])
    options = RunOptions(metric_filter=MetricFilterOptions(by_required_inputs=[["prompt", "response"]]))
    result = wf.run({"prompt": "hi", "response": "hello"}, options)
    metrics = result.metrics

    metric_names: List[str] = metrics.columns.tolist()

    assert metric_names == [
        "response.similarity.prompt",
        "id",
    ]


def test_metric_filter_include_everything():
    wf = Workflow(metrics=[lib.presets.recommended(), lib.response.similarity.prompt()])
    options = RunOptions(metric_filter=MetricFilterOptions(by_required_inputs=[["prompt", "response"], ["prompt"], ["response"]]))
    result = wf.run({"prompt": "hi", "response": "hello"}, options)
    metrics = result.metrics

    metric_names: List[str] = metrics.columns.tolist()

    assert metric_names == [
        "prompt.pii.phone_number",
        "prompt.pii.email_address",
        "prompt.pii.credit_card",
        "prompt.pii.us_ssn",
        "prompt.pii.us_bank_number",
        "prompt.pii.redacted",
        "prompt.stats.token_count",
        "prompt.stats.char_count",
        "prompt.similarity.injection",
        "prompt.similarity.injection_neighbor_ids",
        "prompt.similarity.injection_neighbor_coordinates",
        "response.pii.phone_number",
        "response.pii.email_address",
        "response.pii.credit_card",
        "response.pii.us_ssn",
        "response.pii.us_bank_number",
        "response.pii.redacted",
        "response.stats.token_count",
        "response.stats.char_count",
        "response.stats.flesch_reading_ease",
        "response.sentiment.sentiment_score",
        "response.toxicity.toxicity_score",
        "response.similarity.refusal",
        "response.similarity.prompt",
        "id",
    ]

    # Should be the same as not filtering at all
    result_all = wf.run({"prompt": "hi", "response": "hello"})
    assert metric_names == result_all.metrics.columns.tolist()

    # And order doesn't matter
    options_swapped = RunOptions(metric_filter=MetricFilterOptions(by_required_inputs=[["response", "prompt"], ["response"], ["prompt"]]))
    result_swapped = wf.run({"prompt": "hi", "response": "hello"}, options_swapped)
    assert metric_names == result_swapped.metrics.columns.tolist()


def test_just_prompt_validation():
    rule = validator_lib.constraint(target_metric="response.stats.token_count", upper_threshold=10)
    wf = Workflow(metrics=[lib.presets.recommended()], validators=[rule])

    result = wf.run({"prompt": "hi"})
    metrics = result.metrics

    metric_names: List[str] = metrics.columns.tolist()

    assert metric_names == [
        "prompt.pii.phone_number",
        "prompt.pii.email_address",
        "prompt.pii.credit_card",
        "prompt.pii.us_ssn",
        "prompt.pii.us_bank_number",
        "prompt.pii.redacted",
        "prompt.stats.token_count",
        "prompt.stats.char_count",
        "prompt.similarity.injection",
        "prompt.similarity.injection_neighbor_ids",
        "prompt.similarity.injection_neighbor_coordinates",
        "id",
    ]


def test_just_prompt_validation_flag():
    rule = validator_lib.constraint(target_metric="response.stats.token_count", upper_threshold=1, failure_level="flag")
    wf = Workflow(metrics=[lib.presets.recommended()], validators=[rule])

    result = wf.run({"prompt": "hi", "response": "hello there"})
    metrics = result.metrics

    metric_names: List[str] = metrics.columns.tolist()

    assert metric_names == [
        "prompt.pii.phone_number",
        "prompt.pii.email_address",
        "prompt.pii.credit_card",
        "prompt.pii.us_ssn",
        "prompt.pii.us_bank_number",
        "prompt.pii.redacted",
        "prompt.stats.token_count",
        "prompt.stats.char_count",
        "prompt.similarity.injection",
        "prompt.similarity.injection_neighbor_ids",
        "prompt.similarity.injection_neighbor_coordinates",
        "response.pii.phone_number",
        "response.pii.email_address",
        "response.pii.credit_card",
        "response.pii.us_ssn",
        "response.pii.us_bank_number",
        "response.pii.redacted",
        "response.stats.token_count",
        "response.stats.char_count",
        "response.stats.flesch_reading_ease",
        "response.sentiment.sentiment_score",
        "response.toxicity.toxicity_score",
        "response.similarity.refusal",
        "id",
    ]

    assert result.validation_results.report == [
        ValidationFailure(
            id="0",
            metric="response.stats.token_count",
            details="Value 2 is above threshold 1",
            value=2,
            upper_threshold=1,
            lower_threshold=None,
            allowed_values=None,
            disallowed_values=None,
            must_be_none=None,
            must_be_non_none=None,
            failure_level="flag",
        ),
    ]


def test_just_response():
    wf = Workflow(metrics=[lib.presets.recommended()])
    result = wf.run({"response": "I'm doing great!"})
    metrics = result.metrics

    metric_names: List[str] = metrics.columns.tolist()

    assert metric_names == [
        "response.pii.phone_number",
        "response.pii.email_address",
        "response.pii.credit_card",
        "response.pii.us_ssn",
        "response.pii.us_bank_number",
        "response.pii.redacted",
        "response.stats.token_count",
        "response.stats.char_count",
        "response.stats.flesch_reading_ease",
        "response.sentiment.sentiment_score",
        "response.toxicity.toxicity_score",
        "response.similarity.refusal",
        "id",
    ]


def test_reinit():
    init_count = 0
    cache_count = 0

    @cache
    def test_metric() -> Metric:
        def init():
            nonlocal init_count
            init_count += 1

        def cache_assets():
            nonlocal cache_count
            cache_count += 1

        def udf(text: pd.DataFrame) -> SingleMetricResult:
            metrics = [2 for _ in range(len(text))]
            return SingleMetricResult(metrics)

        return SingleMetric(
            name="test_metric",
            input_names=["prompt"],
            init=init,
            cache_assets=cache_assets,
            evaluate=udf,
        )

    wf1 = Workflow(metrics=[test_metric])
    wf1.run({"prompt": "I'm doing great!"})

    wf2 = Workflow(metrics=[test_metric])
    wf2.run({"prompt": "I'm doing great!"})

    assert init_count == 1
    assert cache_count == 1


def test_multimetric_format():
    def test_metric() -> Metric:
        def init():
            pass

        def cache_assets():
            pass

        def udf(text: pd.DataFrame) -> MultiMetricResult:
            # Only returning a single list even though there were two metric names declared
            return MultiMetricResult(metrics=[[22]])

        return MultiMetric(
            names=["foo", "bar"],
            input_names=["prompt"],
            init=init,
            cache_assets=cache_assets,
            evaluate=udf,
        )

    wf = Workflow(metrics=[test_metric])

    with pytest.raises(ValueError):
        wf.run({"prompt": "I'm doing great!"})


def test_multimetric_result_ength():
    def test_metric() -> Metric:
        def init():
            pass

        def cache_assets():
            pass

        def udf(text: pd.DataFrame) -> MultiMetricResult:
            # Returns the right amount of lists but the lists have the wrong size. Each should have one value
            # per input row
            return MultiMetricResult(metrics=[[22], [11]])

        return MultiMetric(
            names=["foo", "bar"],
            input_names=["prompt"],
            init=init,
            cache_assets=cache_assets,
            evaluate=udf,
        )

    wf = Workflow(metrics=[test_metric])

    df = pd.DataFrame({"prompt": ["I'm doing great!", "I'm doing great!"]})
    with pytest.raises(ValueError):
        wf.run(df)


def test_remote_metrics():
    start_order: List[str] = []
    finish_order: List[str] = []

    def remote_metric(id: str, work_time: float = 0.01) -> MetricCreator:
        def _metric():
            def udf(text: pd.DataFrame) -> SingleMetricResult:
                start_order.append(id)
                time.sleep(work_time)
                finish_order.append(id)
                return SingleMetricResult(metrics=[1 for _ in range(len(text))])

            return SingleMetric(
                name="remote_metric",
                input_names=["prompt"],
                evaluate=udf,
                remote=True,
            )

        return _metric

    def local_metric(id: str, work_time: float = 0.01) -> MetricCreator:
        def _metric():
            def udf(text: pd.DataFrame) -> SingleMetricResult:
                start_order.append(id)
                time.sleep(work_time)
                finish_order.append(id)
                return SingleMetricResult(metrics=[1 for _ in range(len(text))])

            return SingleMetric(
                name="remote_metric",
                input_names=["prompt"],
                evaluate=udf,
                remote=False,
            )

        return _metric

    wf = Workflow(metrics=[remote_metric("a", work_time=2), remote_metric("b", work_time=0.1), local_metric("c"), local_metric("d")])
    df = pd.DataFrame({"prompt": ["I'm doing great!"]})

    wf.run(df)

    assert start_order == ["a", "b", "c", "d"]
    assert finish_order == ["b", "a", "c", "d"]


def test_remote_metric_errors():
    def remote_metric_error() -> MetricCreator:
        def _metric():
            def udf(text: pd.DataFrame) -> SingleMetricResult:
                time.sleep(1)
                raise ValueError("Error")

            return SingleMetric(
                name="remote_metric",
                input_names=["prompt"],
                evaluate=udf,
                remote=True,
            )

        return _metric

    second_metric_started = False
    second_metric_finished = False

    def remote_metric() -> MetricCreator:
        def _metric():
            def udf(text: pd.DataFrame) -> SingleMetricResult:
                nonlocal second_metric_finished, second_metric_started
                second_metric_started = True
                time.sleep(3)
                second_metric_finished = True
                return SingleMetricResult(metrics=[1 for _ in range(len(text))])

            return SingleMetric(
                name="remote_metric",
                input_names=["prompt"],
                evaluate=udf,
                remote=True,
            )

        return _metric

    wf = Workflow(metrics=[remote_metric_error(), remote_metric()])
    df = pd.DataFrame({"prompt": ["I'm doing great!"]})

    with pytest.raises(ValueError):
        wf.run(df)

    # Failures short circuit the workflow, so the second metric should not have finished
    assert second_metric_started
    assert second_metric_finished is False


def test_remote_metric_error_recover():
    first_run = True

    def remote_metric_error() -> MetricCreator:
        def _metric():
            def udf(text: pd.DataFrame) -> SingleMetricResult:
                nonlocal first_run
                try:
                    if first_run:
                        first_run = False
                        return SingleMetricResult(metrics=[1 for _ in range(len(text))])
                    else:
                        raise ValueError("Error")
                except ValueError:
                    # Return all Nones. This results in empty output for the metric rather than having
                    # The entire workflow fail.
                    return SingleMetricResult(metrics=[None for _ in range(len(text))])

            return SingleMetric(
                name="remote_metric",
                input_names=["prompt"],
                evaluate=udf,
                remote=True,
            )

        return _metric

    wf = Workflow(metrics=[remote_metric_error()])
    df = pd.DataFrame({"prompt": ["I'm doing great!"]})

    first_result = wf.run(df)
    metrics = first_result.metrics.to_dict(orient="records")[0]  # pyright: ignore[reportUnknownMemberType]

    assert metrics == {"id": "0", "remote_metric": 1}

    second_result = wf.run(df)
    metrics = second_result.metrics.to_dict(orient="records")[0]  # pyright: ignore[reportUnknownMemberType]

    assert metrics == {"id": "0", "remote_metric": None}


def test_filter_all_metrics():
    # This tests what happens if you specify a filter that results in nothing being run
    rule = validator_lib.constraint(target_metric="prompt.regex.email_address", upper_threshold=1, failure_level="block")
    wf = Workflow(metrics=[lib.prompt.regex.email_address()], validators=[rule])
    options = RunOptions(metric_filter=MetricFilterOptions(by_required_inputs=[["response"]], allow_empty_results=False))
    with pytest.raises(ValueError):
        wf.run({"prompt": "hi"}, options)


def test_filter_all_metrics_allow_empty():
    # This tests what happens if you allow empty results, no longer an error
    rule = validator_lib.constraint(target_metric="prompt.regex.email_address", upper_threshold=1, failure_level="block")
    wf = Workflow(metrics=[lib.prompt.regex.email_address()], validators=[rule])

    # we allow empty responses on the run options
    options = RunOptions(metric_filter=MetricFilterOptions(by_required_inputs=[["response"]], allow_empty_results=True))
    result = wf.run({"prompt": "hi"}, options)

    # No metrics calculated, only the id will be returned
    assert result.metrics.to_dict(orient="records") == [{"id": "0"}]  # pyright: ignore[reportUnknownMemberType]
