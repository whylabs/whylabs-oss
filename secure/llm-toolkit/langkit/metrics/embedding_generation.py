from logging import getLogger
from typing import Optional

import pandas as pd

from langkit.core.context import Context
from langkit.core.metric import (
    Metric,
    MetricCreator,
    MultiMetric,
    MultiMetricResult,
    WorkflowOptions,
)
from langkit.metrics.embeddings_utils import as_numpy
from langkit.metrics.wf_option_util import WorkflowOptionUtil
from langkit.transformer import EmbeddingChoiceArg, EmbeddingContextDependency
from whylabs_llm_toolkit.models.chroma.chroma_id import short_sha256_base64

logger = getLogger(__name__)


def embedding_generation(
    column_name: str,
    choice: Optional[EmbeddingChoiceArg] = None,
) -> MetricCreator:
    def _metric(options: WorkflowOptions) -> Metric:
        _choice = choice or WorkflowOptionUtil.get_embedding_choice(options) or "default"
        embedding_dep = EmbeddingContextDependency(embedding_choice=_choice, input_column=column_name)

        def udf(text: pd.DataFrame, context: Context) -> MultiMetricResult:
            target_embeddings = as_numpy(embedding_dep.get_request_data(context))
            ids = [short_sha256_base64(str(embedding)) for embedding in target_embeddings]
            return MultiMetricResult(metrics=[target_embeddings.tolist(), ids])

        return MultiMetric(
            names=[f"{column_name}.util.embedding", f"{column_name}.util.embedding_id"],
            input_names=[column_name],
            evaluate=udf,
            context_dependencies=[embedding_dep],
        )

    return _metric
