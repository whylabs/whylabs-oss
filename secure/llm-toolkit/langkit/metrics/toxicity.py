import os
from dataclasses import dataclass
from functools import lru_cache, partial
from typing import List, Optional, cast

import pandas as pd
import torch
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    PreTrainedTokenizerBase,
    TextClassificationPipeline,
)

from langkit.core.context import VerboseName
from langkit.core.metric import Metric, MetricCreator, SingleMetric, SingleMetricResult, UdfInput
from whylabs_llm_toolkit.settings import get_settings


def __toxicity(pipeline: TextClassificationPipeline, max_length: int, text: List[str]) -> List[float]:
    results = pipeline(text, truncation=True, max_length=max_length)  # pyright: ignore[reportUnknownVariableType]
    return [result["score"] if result["label"] == "toxic" else 1.0 - result["score"] for result in results]  # pyright: ignore[reportReturnType, reportOptionalIterable, reportOptionalSubscript, reportArgumentType, reportIndexIssue, reportCallIssue, reportUnknownVariableType]


def _cache_assets(model_path: str, revision: str):
    AutoModelForSequenceClassification.from_pretrained(model_path, revision=revision)  # pyright: ignore[reportUnknownMemberType]
    AutoTokenizer.from_pretrained(model_path, revision=revision)  # pyright: ignore[reportUnknownMemberType]


@lru_cache
def _get_tokenizer(model_path: str, revision: str) -> PreTrainedTokenizerBase:
    return AutoTokenizer.from_pretrained(model_path, local_files_only=True, revision=revision)  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]


@lru_cache
def _get_pipeline(model_path: str, revision: str) -> TextClassificationPipeline:
    use_cuda = torch.cuda.is_available() and not bool(os.environ.get("LANGKIT_NO_CUDA", False))
    model: PreTrainedTokenizerBase = AutoModelForSequenceClassification.from_pretrained(  # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType]
        model_path, local_files_only=True, revision=revision
    )
    tokenizer = _get_tokenizer(model_path, revision)
    return TextClassificationPipeline(model=model, tokenizer=tokenizer, device=0 if use_cuda else -1)


@dataclass
class _VerboseMetricName(VerboseName):
    hf_model: Optional[str]
    hf_model_revision: Optional[str]
    _column_name: str

    def get_verbose_title(self) -> str:
        return f"{self._column_name}.toxicity.toxicity_score"


def toxicity_metric(column_name: str, hf_model: Optional[str] = None, hf_model_revision: Optional[str] = None) -> Metric:
    settings = get_settings()
    model_path = "martin-ha/toxic-comment-model" if hf_model is None else hf_model
    revision = "9842c08b35a4687e7b211187d676986c8c96256d" if hf_model_revision is None else hf_model_revision

    def cache_assets():
        _cache_assets(model_path, revision)

    def init():
        _get_pipeline(model_path, revision)

    def udf(text: pd.DataFrame) -> SingleMetricResult:
        _tokenizer = _get_tokenizer(model_path, revision)
        _pipeline = _get_pipeline(model_path, revision)

        col = list(UdfInput(text).iter_column_rows(column_name))
        max_length = cast(int, _tokenizer.model_max_length)  # pyright: ignore[reportUnknownMemberType]
        metrics = __toxicity(_pipeline, max_length, col)
        return SingleMetricResult(metrics=metrics)

    metric_name = _VerboseMetricName(hf_model, hf_model_revision, column_name)
    name = metric_name.get_verbose_name() if settings.VERBOSE_METRIC_NAMES else metric_name.get_verbose_title()

    return SingleMetric(name=name, input_names=[column_name], evaluate=udf, init=init, cache_assets=cache_assets)


prompt_toxicity_metric = partial(toxicity_metric, "prompt")
response_toxicity_metric = partial(toxicity_metric, "response")
prompt_response_toxicity_module: MetricCreator = [prompt_toxicity_metric, response_toxicity_metric]
