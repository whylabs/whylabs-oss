from functools import lru_cache, partial
from typing import Optional

import pandas as pd
import tiktoken

from langkit.core.metric import Metric, SingleMetric, SingleMetricResult, UdfInput


@lru_cache
def _get_encoder(encoding: str):
    return tiktoken.get_encoding(encoding)


def token_metric(column_name: str, encoding: Optional[str] = None) -> Metric:
    encoding_arg = encoding or "cl100k_base"

    def cache_assets():
        _get_encoder(encoding_arg)

    def init():
        _get_encoder(encoding_arg)

    def udf(text: pd.DataFrame) -> SingleMetricResult:
        encoder = _get_encoder(encoding_arg)
        encoding_len = [len(encoder.encode(it)) for it in UdfInput(text).iter_column_rows(column_name)]
        return SingleMetricResult(encoding_len)

    return SingleMetric(
        name=f"{column_name}.stats.token_count",
        input_names=[column_name],
        evaluate=udf,
        init=init,
        cache_assets=cache_assets,
    )


prompt_token_metric = partial(token_metric, column_name="prompt")
response_token_metric = partial(token_metric, column_name="response")
