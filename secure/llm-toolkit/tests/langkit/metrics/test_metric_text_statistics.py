# pyright: reportUnknownMemberType=none
from typing import Any

import pandas as pd
from textstat import textstat

import whylogs as why
from langkit.core.metric import Metric, MultiMetric, MultiMetricResult, UdfInput, WorkflowMetricConfig, WorkflowMetricConfigBuilder
from langkit.core.validation import ValidationFailure, ValidationResult
from langkit.core.workflow import Workflow
from langkit.metrics.library import lib
from langkit.metrics.text_statistics import (
    prompt_char_count_metric,
    prompt_reading_ease_metric,
    prompt_response_grade_metric,
    prompt_response_textstat_module,
    prompt_textstat_metric,
    response_char_count_metric,
    response_reading_ease_metric,
    response_textstat_metric,
)
from langkit.metrics.text_statistics_types import TextStat
from langkit.metrics.whylogs_compat import create_whylogs_udf_schema
from langkit.validators.comparison import ConstraintValidator, ConstraintValidatorOptions

expected_metrics = [
    "cardinality/est",
    "cardinality/lower_1",
    "cardinality/upper_1",
    "counts/inf",
    "counts/n",
    "counts/nan",
    "counts/null",
    "distribution/max",
    "distribution/mean",
    "distribution/median",
    "distribution/min",
    "distribution/n",
    "distribution/q_01",
    "distribution/q_05",
    "distribution/q_10",
    "distribution/q_25",
    "distribution/q_75",
    "distribution/q_90",
    "distribution/q_95",
    "distribution/q_99",
    "distribution/stddev",
    "type",
    "types/boolean",
    "types/fractional",
    "types/integral",
    "types/object",
    "types/string",
    "types/tensor",
    "ints/max",
    "ints/min",
]

df = pd.DataFrame(
    {
        "prompt": [
            "Hi, how are you doing today?",
            "Hi, how are you doing today?",
            "Hi, how are you doing today?",
            "Hi, how are you doing today?",
        ],
        "response": [
            "I'm doing great, how about you?",
            "I'm doing great, how about you?",
            "I'm doing great, how about you?",
            "I'm doing great, how about you?",
        ],
    }
)

row = {"prompt": "Hi, how are you doing today?", "response": "I'm doing great, how about you?"}


def _log(item: Any, conf: WorkflowMetricConfig) -> pd.DataFrame:
    schema = create_whylogs_udf_schema(conf)
    return why.log(item, schema=schema).view().to_pandas()  # type: ignore


def test_prompt_response_textstat_module():
    all_textstat_schema = WorkflowMetricConfigBuilder().add(prompt_response_textstat_module).build()

    actual = _log(row, all_textstat_schema)

    assert list(actual.columns) == expected_metrics

    expected_columns = [
        "prompt",
        "prompt.stats.char_count",
        "prompt.stats.difficult_words",
        "prompt.stats.flesch_kincaid_grade",
        "prompt.stats.flesch_reading_ease",
        "prompt.stats.letter_count",
        "prompt.stats.lexicon_count",
        "prompt.stats.sentence_count",
        "prompt.stats.syllable_count",
        "response",
        "response.stats.char_count",
        "response.stats.difficult_words",
        "response.stats.flesch_kincaid_grade",
        "response.stats.flesch_reading_ease",
        "response.stats.letter_count",
        "response.stats.lexicon_count",
        "response.stats.sentence_count",
        "response.stats.syllable_count",
    ]

    assert actual.index.tolist() == expected_columns
    assert actual["distribution/max"]["prompt.stats.char_count"] == len(row["prompt"].replace(" ", ""))
    assert actual["distribution/max"]["response.stats.char_count"] == len(row["response"].replace(" ", ""))

    actual_row = _log(row, all_textstat_schema)

    assert actual_row.index.tolist() == expected_columns
    assert actual_row["distribution/max"]["prompt.stats.char_count"] == len(row["prompt"].replace(" ", ""))
    assert actual_row["distribution/max"]["response.stats.char_count"] == len(row["response"].replace(" ", ""))


def test_prompt_textstat_module():
    prompt_textstat_schema = WorkflowMetricConfigBuilder().add(prompt_textstat_metric).build()

    actual = _log(row, prompt_textstat_schema)

    assert list(actual.columns) == expected_metrics

    expected_columns = [
        "prompt",
        "prompt.stats.char_count",
        "prompt.stats.difficult_words",
        "prompt.stats.flesch_kincaid_grade",
        "prompt.stats.flesch_reading_ease",
        "prompt.stats.letter_count",
        "prompt.stats.lexicon_count",
        "prompt.stats.sentence_count",
        "prompt.stats.syllable_count",
        "response",
    ]

    assert actual.index.tolist() == expected_columns
    assert actual["distribution/max"]["prompt.stats.char_count"] == len(row["prompt"].replace(" ", ""))
    assert "response.stats.char_count" not in actual["distribution/max"]

    actual_row = _log(row, prompt_textstat_schema)

    assert actual_row.index.tolist() == expected_columns
    assert actual_row["distribution/max"]["prompt.stats.char_count"] == len(row["prompt"].replace(" ", ""))
    assert "response.stats.char_count" not in actual_row["distribution/max"]


def test_response_textstat_module():
    response_textstat_schema = WorkflowMetricConfigBuilder().add(response_textstat_metric).build()

    actual = _log(row, response_textstat_schema)

    assert list(actual.columns) == expected_metrics

    expected_columns = [
        "prompt",
        "response",
        "response.stats.char_count",
        "response.stats.difficult_words",
        "response.stats.flesch_kincaid_grade",
        "response.stats.flesch_reading_ease",
        "response.stats.letter_count",
        "response.stats.lexicon_count",
        "response.stats.sentence_count",
        "response.stats.syllable_count",
    ]

    assert actual.index.tolist() == expected_columns
    assert "prompt.stats.char_count" not in actual["distribution/max"]
    assert actual["distribution/max"]["response.stats.char_count"] == len(row["response"].replace(" ", ""))

    actual_row = _log(row, response_textstat_schema)

    assert actual_row.index.tolist() == expected_columns
    assert "prompt.stats.char_count" not in actual_row["distribution/max"]
    assert actual_row["distribution/max"]["response.stats.char_count"] == len(row["response"].replace(" ", ""))


def test_prompt_reading_ease_module():
    prompt_reading_ease_schema = WorkflowMetricConfigBuilder().add(prompt_reading_ease_metric).build()

    actual = _log(row, prompt_reading_ease_schema)

    # score is a float so it doesn't have the ints metrics
    expected_metrics_without_ints = [metric for metric in expected_metrics if "ints" not in metric]

    assert list(actual.columns) == expected_metrics_without_ints

    assert actual.index.tolist() == [
        "prompt",
        "prompt.stats.flesch_reading_ease",
        "response",
    ]


def test_response_reading_ease_module():
    response_reading_ease_schema = WorkflowMetricConfigBuilder().add(response_reading_ease_metric).build()

    actual = _log(row, response_reading_ease_schema)

    # score is a float so it doesn't have the ints metrics
    expected_metrics_without_ints = [metric for metric in expected_metrics if "ints" not in metric]

    assert list(actual.columns) == expected_metrics_without_ints

    assert actual.index.tolist() == [
        "prompt",
        "response",
        "response.stats.flesch_reading_ease",
    ]


def test_prompt_response_flesch_kincaid_grade_level_module():
    schema = WorkflowMetricConfigBuilder().add(prompt_response_grade_metric).build()

    actual = _log(row, schema)

    # score is a float so it doesn't have the ints metrics
    expected_metrics_without_ints = [metric for metric in expected_metrics if "ints" not in metric]

    assert list(actual.columns) == expected_metrics_without_ints

    assert actual.index.tolist() == [
        "prompt",
        "prompt.stats.flesch_kincaid_grade",
        "response",
        "response.stats.flesch_kincaid_grade",
    ]


def test_prompt_char_count_module():
    prompt_char_count_schema = WorkflowMetricConfigBuilder().add(prompt_char_count_metric).build()

    actual = _log(row, prompt_char_count_schema)

    assert list(actual.columns) == expected_metrics

    assert actual.index.tolist() == [
        "prompt",
        "prompt.stats.char_count",
        "response",
    ]


def test_prompt_char_count_0_module():
    wf = Workflow(
        metrics=[prompt_char_count_metric, response_char_count_metric],
        validators=[ConstraintValidator(ConstraintValidatorOptions("prompt.stats.char_count", lower_threshold=2))],
    )

    df = pd.DataFrame(
        {
            "prompt": [
                " ",
            ],
            "response": [
                "I'm doing great, how about you?",
            ],
        }
    )
    actual = wf.run(df)

    assert actual.metrics.columns.tolist() == [
        "prompt.stats.char_count",
        "response.stats.char_count",
        "id",
    ]

    assert actual.metrics["prompt.stats.char_count"][0] == 0
    assert actual.validation_results == ValidationResult(
        report=[
            ValidationFailure(
                id="0",
                metric="prompt.stats.char_count",
                details="Value 0 is below threshold 2",
                value=0,
                upper_threshold=None,
                lower_threshold=2,
            )
        ]
    )


def test_text_stat_group():
    wf = Workflow(metrics=[lib.prompt.stats()])
    df = pd.DataFrame(
        {
            "prompt": [
                "test",
            ],
            "response": [
                "I'm doing great, how about you?",
            ],
        }
    )

    actual = wf.run(df)

    assert sorted(actual.metrics.columns.tolist()) == sorted(
        [
            "id",
            "prompt.stats.char_count",
            "prompt.stats.difficult_words",
            "prompt.stats.flesch_kincaid_grade",
            "prompt.stats.flesch_reading_ease",
            "prompt.stats.letter_count",
            "prompt.stats.lexicon_count",
            "prompt.stats.sentence_count",
            "prompt.stats.syllable_count",
            "prompt.stats.token_count",
        ]
    )

    assert actual.metrics["prompt.stats.char_count"][0] == 4
    assert actual.metrics["prompt.stats.difficult_words"][0] == 0
    assert actual.metrics["prompt.stats.flesch_kincaid_grade"][0] == -3.5
    assert actual.metrics["prompt.stats.flesch_reading_ease"][0] == 121.22
    assert actual.metrics["prompt.stats.letter_count"][0] == 4
    assert actual.metrics["prompt.stats.lexicon_count"][0] == 1
    assert actual.metrics["prompt.stats.sentence_count"][0] == 1
    assert actual.metrics["prompt.stats.syllable_count"][0] == 1
    assert actual.metrics["prompt.stats.token_count"][0] == 1


def test_response_char_count_module():
    response_char_count_schema = WorkflowMetricConfigBuilder().add(response_char_count_metric).build()

    actual = _log(row, response_char_count_schema)

    assert list(actual.columns) == expected_metrics

    assert actual.index.tolist() == [
        "prompt",
        "response",
        "response.stats.char_count",
    ]


def test_custom_module_combination():
    from langkit.metrics.text_statistics import (
        prompt_char_count_metric,
        prompt_difficult_words_metric,
        prompt_reading_ease_metric,
        response_char_count_metric,
        response_sentence_count_metric,
    )

    schema = (
        WorkflowMetricConfigBuilder()
        .add(prompt_char_count_metric)
        .add(prompt_reading_ease_metric)
        .add(prompt_difficult_words_metric)
        .add(response_char_count_metric)
        .add(response_sentence_count_metric)
        .build()
    )

    actual = _log(row, schema)

    expected_columns = [
        "prompt",
        "prompt.stats.char_count",
        "prompt.stats.difficult_words",
        "prompt.stats.flesch_reading_ease",
        "response",
        "response.stats.char_count",
        "response.stats.sentence_count",
    ]

    assert list(actual.columns) == expected_metrics
    assert actual.index.tolist() == expected_columns
    assert actual["distribution/max"]["prompt.stats.char_count"] == len(row["prompt"].replace(" ", ""))
    assert actual["distribution/max"]["response.stats.char_count"] == len(row["response"].replace(" ", ""))

    # and you get the same results if you combine the modules in different ways

    prompt_modules = [
        prompt_char_count_metric,
        prompt_reading_ease_metric,
        prompt_difficult_words_metric,
    ]

    response_modules = [
        response_char_count_metric,
        response_sentence_count_metric,
    ]

    schema = WorkflowMetricConfigBuilder().add(prompt_modules).add(response_modules).build()

    actual = _log(row, schema)

    assert list(actual.columns) == expected_metrics
    assert actual.index.tolist() == expected_columns
    assert actual["distribution/max"]["prompt.stats.char_count"] == len(row["prompt"].replace(" ", ""))
    assert actual["distribution/max"]["response.stats.char_count"] == len(row["response"].replace(" ", ""))


def test_multi_text_stat_metric():
    def multi_metric(stat: TextStat, column_name: str) -> Metric:
        def udf(text: pd.DataFrame) -> MultiMetricResult:
            stat_func = getattr(textstat, stat)
            metrics = [stat_func(it) for it in UdfInput(text).iter_column_rows(column_name)]
            # double the original metrics
            metrics2 = [it * 2 for it in metrics]
            return MultiMetricResult([metrics, metrics2])  # Just both the same thing

        return MultiMetric(
            names=[f"{column_name}.custom_textstat1", f"{column_name}.custom_textstat2"],
            input_names=[column_name],
            evaluate=udf,
        )

    df = pd.DataFrame(
        {
            "prompt": [
                "Hi, how are you doing today?",
                "Hi, there how are you doing today?",
                "Hi",
                "Hi?",
            ],
            "response": [
                "I'm doing great, how about you?",
                "I'm doing great, how about you?",
                "I'm doing great, how about you?",
                "I'm doing great, how about you?",
            ],
        }
    )

    config = WorkflowMetricConfigBuilder().add(prompt_char_count_metric).add(lambda: multi_metric("letter_count", "prompt")).build()
    actual = _log(df, config)

    pd.set_option("display.max_columns", None)
    pd.set_option("display.width", None)

    expected_columns = [
        "prompt",
        "prompt.custom_textstat1",
        "prompt.custom_textstat2",
        "prompt.stats.char_count",
        "response",
    ]

    assert actual.index.tolist() == expected_columns
    assert actual["distribution/max"]["prompt.stats.char_count"] == 28
    assert actual["distribution/min"]["prompt.custom_textstat1"] == 2
    assert actual["distribution/max"]["prompt.custom_textstat1"] == 26
    assert actual["distribution/min"]["prompt.custom_textstat2"] == 4
    assert actual["distribution/max"]["prompt.custom_textstat2"] == 52
