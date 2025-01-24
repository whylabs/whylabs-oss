import pandas as pd

from langkit.core.metric import Metric, SingleMetric, SingleMetricResult
from whylabs_llm_toolkit.models.chroma.chroma_id import short_sha256_base64


def id_step() -> Metric:
    def udf(text: pd.DataFrame) -> SingleMetricResult:
        return SingleMetricResult(text["text"].map(short_sha256_base64).tolist())  # pyright: ignore[reportUnknownMemberType]h

    return SingleMetric(
        name="uid",
        input_names=["text"],
        evaluate=udf,
    )
