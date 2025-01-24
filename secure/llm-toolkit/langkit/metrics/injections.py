from functools import partial
from logging import getLogger
from typing import Optional

import pandas as pd

from langkit.core.context import Context
from langkit.core.metric import Metric, SingleMetric, SingleMetricResult
from langkit.metrics.embeddings_utils import as_numpy
from langkit.transformer import EmbeddingChoiceArg, EmbeddingContextDependency, EmbeddingOptions
from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder
from whylabs_llm_toolkit.models.semantic_similarity import InjectionScorer

logger = getLogger(__name__)

__default_tag = "main"
__default_neighbors_num = 8


def _get_injection_scorer(
    encoder_name: SentenceTransformerEncoder, tag: str = "main", version: Optional[int] = None, neighbors_num: int = 8
) -> InjectionScorer:
    return InjectionScorer(tag=tag, version=version, encoder_name=encoder_name, neighbors_num=neighbors_num)


def injections_metric(
    column_name: str,
    tag: Optional[str] = None,
    version: Optional[int] = None,
    neighbors_num: Optional[int] = None,
    embedding: EmbeddingChoiceArg = "default",
) -> Metric:
    tag = tag or __default_tag
    neighbors_num = neighbors_num or __default_neighbors_num

    injection_scorer: Optional[InjectionScorer] = None
    encoder_name = EmbeddingOptions.get_supported_encoder(embedding)

    def cache_assets():
        _get_injection_scorer(tag=tag, version=version, encoder_name=encoder_name, neighbors_num=neighbors_num)

    def init():
        nonlocal injection_scorer
        injection_scorer = _get_injection_scorer(tag=tag, version=version, encoder_name=encoder_name, neighbors_num=neighbors_num)

    embedding_dep = EmbeddingContextDependency(embedding_choice=embedding, input_column=column_name)

    def udf(text: pd.DataFrame, context: Context) -> SingleMetricResult:
        assert injection_scorer is not None
        if column_name not in text.columns:
            raise ValueError(f"Injections: Column {column_name} not found in input dataframe")
        target_embeddings = as_numpy(embedding_dep.get_request_data(context))
        metrics = injection_scorer.predict(target_embeddings)
        return SingleMetricResult(metrics=metrics)

    return SingleMetric(
        name=f"{column_name}.similarity.injection",
        input_names=[column_name],
        evaluate=udf,
        cache_assets=cache_assets,
        init=init,
        context_dependencies=[embedding_dep],
    )


prompt_injections_metric = partial(injections_metric, "prompt")
