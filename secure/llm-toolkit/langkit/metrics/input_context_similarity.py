import pandas as pd

from langkit.core.context import Context
from langkit.core.metric import Metric, SingleMetric, SingleMetricResult
from langkit.metrics.embeddings_utils import as_pt, compute_embedding_similarity_encoded
from langkit.transformer import EmbeddingChoiceArg, EmbeddingContextDependency, RAGContextDependency


def input_context_similarity(
    input_column_name: str = "prompt", context_column_name: str = "context", embedding: EmbeddingChoiceArg = "default"
) -> Metric:
    prompt_embedding_dep = EmbeddingContextDependency(embedding_choice=embedding, input_column=input_column_name)
    context_embedding_dep = RAGContextDependency(embedding_choice=embedding, context_column_name=context_column_name)

    def udf(text: pd.DataFrame, context: Context) -> SingleMetricResult:
        prompt_embedding = as_pt(prompt_embedding_dep.get_request_data(context))
        context_embedding = context_embedding_dep.get_request_data(context)
        similarity = compute_embedding_similarity_encoded(prompt_embedding, context_embedding)

        if len(similarity.shape) == 1:
            return SingleMetricResult(similarity.tolist())  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]
        else:
            return SingleMetricResult(similarity.squeeze(dim=0).tolist())  # pyright: ignore[reportUnknownMemberType, reportUnknownArgumentType]

    return SingleMetric(
        name=f"{input_column_name}.similarity.{context_column_name}",
        input_names=[input_column_name, context_column_name],
        evaluate=udf,
        context_dependencies=[prompt_embedding_dep, context_embedding_dep],
    )
