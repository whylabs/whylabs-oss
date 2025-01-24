import os
from functools import lru_cache, partial
from typing import List, Optional, cast

import numpy as np
import onnxruntime
import pandas as pd
from transformers import (
    AutoTokenizer,
    PreTrainedTokenizerBase,
)

from langkit.core.metric import Metric, SingleMetric, SingleMetricResult, UdfInput
from langkit.onnx_encoder import TransformerModel
from whylabs_llm_toolkit.asset_download import get_asset


def __toxicity(tokenizer: PreTrainedTokenizerBase, session: onnxruntime.InferenceSession, max_length: int, text: List[str]) -> List[float]:
    max_length_in_chars = tokenizer.model_max_length * 5  # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType]
    truncated_text = [content[:max_length_in_chars] for content in text]
    inputs = tokenizer(truncated_text, return_tensors="pt", padding=True, truncation=True)
    onnx_inputs = {k: v.numpy() for k, v in inputs.items() if k in ["input_ids", "attention_mask"]}  # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType]
    onnx_output_logits = session.run(None, onnx_inputs)[0]  # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType]

    # Apply softmax to convert logits into probabilities
    probabilities = np.exp(onnx_output_logits) / np.sum(np.exp(onnx_output_logits), axis=1, keepdims=True)  # pyright: ignore[reportUnknownArgumentType]
    labels = ["non-toxic", "toxic"]
    # Find the index of the highest probability to determine the predicted label
    predicted_label_idx = np.argmax(probabilities, axis=1)
    predicted_labels: List[str] = [labels[idx] for idx in predicted_label_idx]
    predicted_scores: List[float] = [prob[idx] for prob, idx in zip(probabilities, predicted_label_idx)]
    results = [{"label": label, "score": score} for label, score in zip(predicted_labels, predicted_scores)]
    return [result["score"] if result["label"] == "toxic" else 1.0 - result["score"] for result in results]  # pyright: ignore[reportReturnType, reportOperatorIssue, reportUnknownVariableType]


def _download_assets(tag: Optional[str], version: Optional[int] = None):
    name, _default_tag = TransformerModel.ToxicCommentModel.value
    return get_asset(name, tag or _default_tag, version=version)


@lru_cache
def _get_tokenizer(tag: Optional[str], version: Optional[int] = None) -> PreTrainedTokenizerBase:
    return AutoTokenizer.from_pretrained(_download_assets(tag, version))  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]


@lru_cache
def _get_session(tag: Optional[str], version: Optional[int] = None) -> onnxruntime.InferenceSession:
    downloaded_path = _download_assets(tag, version=version)
    onnx_model_path = os.path.join(downloaded_path, "model.onnx")
    return onnxruntime.InferenceSession(onnx_model_path, providers=["CPUExecutionProvider"])


def toxicity_metric(column_name: str, tag: Optional[str] = None, version: Optional[int] = None) -> Metric:
    def cache_assets():
        _download_assets(tag, version=version)

    def init():
        _get_session(tag, version=version)
        _get_tokenizer(tag, version=version)

    def udf(text: pd.DataFrame) -> SingleMetricResult:
        _tokenizer = _get_tokenizer(tag)
        _session = _get_session(tag)

        col = list(UdfInput(text).iter_column_rows(column_name))
        max_length = cast(int, _tokenizer.model_max_length)  # pyright: ignore[reportUnknownMemberType]
        metrics = __toxicity(_tokenizer, _session, max_length, col)
        return SingleMetricResult(metrics=metrics)

    return SingleMetric(
        name=f"{column_name}.toxicity.toxicity_score", input_names=[column_name], evaluate=udf, init=init, cache_assets=cache_assets
    )


prompt_toxicity_metric = partial(toxicity_metric, "prompt")
response_toxicity_metric = partial(toxicity_metric, "response")
prompt_response_toxicity_module = [prompt_toxicity_metric, response_toxicity_metric]
