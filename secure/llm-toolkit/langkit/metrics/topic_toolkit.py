from typing import List, Optional, Sequence

import pandas as pd

from langkit.core.context import Context
from langkit.core.metric import (
    Metric,
    MultiMetric,
    MultiMetricResult,
)
from langkit.metrics.embeddings_utils import as_numpy
from langkit.transformer import EmbeddingContextDependency
from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder
from whylabs_llm_toolkit.models.semantic_similarity import CodeScorer, MedicalScorer
from whylabs_llm_toolkit.models.semantic_similarity.financial_scorer import FinancialScorer


def topic_metric(
    column_name: str, medical: bool = True, code: bool = True, financial: bool = True, version: Optional[int] = None
) -> Metric:
    medical_scorer: Optional[MedicalScorer] = None
    code_scorer: Optional[CodeScorer] = None
    financial_scorer: Optional[FinancialScorer] = None
    embedding_dep = EmbeddingContextDependency(embedding_choice="default", input_column=column_name)

    def cache_assets():
        if medical:
            MedicalScorer(tag="main", encoder_name=SentenceTransformerEncoder.AllMiniLML6V2, version=version)
        if code:
            CodeScorer(tag="main", encoder_name=SentenceTransformerEncoder.AllMiniLML6V2, version=version)
        if financial:
            FinancialScorer(tag="main", encoder_name=SentenceTransformerEncoder.AllMiniLML6V2, version=version)

    def init():
        nonlocal medical_scorer, code_scorer, financial_scorer
        if medical:
            medical_scorer = MedicalScorer(tag="main", encoder_name=SentenceTransformerEncoder.AllMiniLML6V2, version=version)
        if code:
            code_scorer = CodeScorer(tag="main", encoder_name=SentenceTransformerEncoder.AllMiniLML6V2, version=version)
        if financial:
            financial_scorer = FinancialScorer(tag="main", encoder_name=SentenceTransformerEncoder.AllMiniLML6V2, version=version)

    def udf(text: pd.DataFrame, context: Context) -> MultiMetricResult:
        results: List[Sequence[float]] = []
        target_embeddings = as_numpy(embedding_dep.get_request_data(context))

        if medical_scorer:
            medical_score = medical_scorer.predict(target_embeddings)
            results.append(medical_score)

        if code_scorer:
            code_score = code_scorer.predict(target_embeddings)
            results.append(code_score)

        if financial_scorer:
            financial_score = financial_scorer.predict(target_embeddings)
            results.append(financial_score)

        return MultiMetricResult(metrics=results)

    topics = [
        topic
        for topic in [
            "medical" if medical else None,
            "code" if code else None,
            "financial" if financial else None,
        ]
        if topic is not None
    ]

    metric_names = [f"{column_name}.topics.{topic}" for topic in topics]

    return MultiMetric(
        names=metric_names,
        input_names=[column_name],
        evaluate=udf,
        cache_assets=cache_assets,
        init=init,
        context_dependencies=[embedding_dep],
    )
