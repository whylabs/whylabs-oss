import json
import logging
import os
from functools import lru_cache, partial
from typing import Any, Dict, List, Literal, Optional, TypedDict, cast

import pandas as pd
import torch
import torch.nn.functional as F

from langkit.core.context import Context
from langkit.core.metric import Metric, SingleMetric, SingleMetricResult
from langkit.metrics.embeddings_utils import as_pt
from langkit.metrics.themes.additional_data import AdditionalData
from langkit.tensor_util import device
from langkit.transformer import EmbeddingChoiceArg, EmbeddingContextDependency, EmbeddingOptions

logger = logging.getLogger(__name__)


class Themes(TypedDict):
    key: Dict[str, List[str]]


def _validate_themes(data: Any) -> bool:
    if not isinstance(data, dict):
        return False

    for key, value in data.items():  # pyright: ignore[reportUnknownVariableType]
        if not isinstance(key, str):
            return False

        if not isinstance(value, list):
            return False

        # Check if all items in the list are strings
        if not all(isinstance(item, str) for item in value):  # pyright: ignore[reportUnknownVariableType]
            return False

    return True


def __load_themes() -> Dict[str, List[str]]:
    __current_module_path = os.path.dirname(__file__)
    __default_pattern_file = os.path.join(__current_module_path, "themes.json")
    try:
        with open(__default_pattern_file, "r", encoding="utf-8") as f:
            themes_groups = json.loads(f.read())
            assert _validate_themes(themes_groups)
            return cast(Dict[str, List[str]], themes_groups)
    except FileNotFoundError as e:
        logger.error(f"Could not find {__default_pattern_file}")
        raise e
    except json.decoder.JSONDecodeError as e:
        logger.error(f"Could not parse {__default_pattern_file}: {e}")
        raise e


@lru_cache
def _get_themes() -> Dict[str, torch.Tensor]:
    encoder = EmbeddingOptions.get_encoder()
    theme_groups = __load_themes()
    return {group: torch.as_tensor(encoder.encode(tuple(themes))) for group, themes in theme_groups.items()}


def __themes_metric(
    column_name: str,
    themes_group: Literal["jailbreak", "refusal"],
    embedding: EmbeddingChoiceArg = "default",
    additional_data_path: Optional[str] = None,
) -> Metric:
    if themes_group == "refusal" and column_name == "prompt":
        raise ValueError("Refusal themes are not applicable to prompt")

    if themes_group == "jailbreak" and column_name == "response":
        raise ValueError("Jailbreak themes are not applicable to response")

    combined_tensors: Optional[torch.Tensor] = None

    def init():
        nonlocal combined_tensors
        theme = _get_themes()[themes_group]  # (n_theme_examples, embedding_dim)
        if additional_data_path is not None:
            additional_data = AdditionalData(additional_data_path)
            additional_tensors = torch.tensor(additional_data.encode_additional_data())
        else:
            additional_tensors = torch.tensor([])

        combined_tensors = torch.cat([theme, additional_tensors.to(device)], dim=0)  # (n_theme_examples + n_additional_data, embedding_dim)

    embedding_dep = EmbeddingContextDependency(embedding_choice=embedding, input_column=column_name)

    def udf(text: pd.DataFrame, context: Context) -> SingleMetricResult:
        if combined_tensors is None:
            raise ValueError("Themes not initialized")
        encoded_text = as_pt(embedding_dep.get_request_data(context))
        similarities = F.cosine_similarity(
            encoded_text.unsqueeze(1), combined_tensors.unsqueeze(0), dim=2
        )  # (n_input_rows, n_theme_examples)
        max_similarities = similarities.max(dim=1)[0]  # (n_input_rows,)
        similarity_list: List[float] = max_similarities.tolist()  # pyright: ignore[reportUnknownMemberType]
        return SingleMetricResult(similarity_list)

    return SingleMetric(
        name=f"{column_name}.similarity.{themes_group}",
        input_names=[column_name],
        evaluate=udf,
        init=init,
        context_dependencies=[embedding_dep],
    )


prompt_jailbreak_similarity_metric = partial(__themes_metric, column_name="prompt", themes_group="jailbreak")
response_refusal_similarity_metric = partial(__themes_metric, column_name="response", themes_group="refusal")
