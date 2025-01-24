from functools import partial
from typing import Optional

import pandas as pd

from langkit.core.context import Context
from langkit.core.metric import Metric, SingleMetric, SingleMetricResult
from langkit.metrics.embeddings_utils import as_pt, compute_embedding_similarity_encoded
from langkit.transformer import EmbeddingChoiceArg, EmbeddingContextDependency


def input_output_similarity_metric(
    input_column_name: Optional[str] = None, output_column_name: Optional[str] = None, embedding: EmbeddingChoiceArg = "default"
) -> Metric:
    input_col = input_column_name or "prompt"
    output_col = output_column_name or "response"
    prompt_embedding_dep = EmbeddingContextDependency(embedding_choice=embedding, input_column=input_col)
    response_embedding_dep = EmbeddingContextDependency(embedding_choice=embedding, input_column=output_col)

    def udf(text: pd.DataFrame, context: Context) -> SingleMetricResult:
        prompt_embedding = as_pt(prompt_embedding_dep.get_request_data(context))
        response_embedding = as_pt(response_embedding_dep.get_request_data(context))
        similarity = compute_embedding_similarity_encoded(prompt_embedding, response_embedding)

        if len(similarity.shape) == 1:
            return SingleMetricResult(similarity.tolist())  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]
        else:
            return SingleMetricResult(similarity.squeeze(dim=0).tolist())  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]

    return SingleMetric(
        name=f"{output_col}.similarity.{input_col}",
        input_names=[input_col, output_col],
        evaluate=udf,
        context_dependencies=[prompt_embedding_dep, response_embedding_dep],
    )


prompt_response_input_output_similarity_metric = partial(input_output_similarity_metric, "prompt", "response")
