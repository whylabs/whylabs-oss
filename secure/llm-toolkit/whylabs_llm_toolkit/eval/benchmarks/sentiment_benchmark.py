import logging
from dataclasses import dataclass
from typing import List, Optional

import pandas as pd

from ..datasets_types import (
    BinaryClassificationDataset,
)
from .binary_classification_benchmarks import BinaryClassificationBenchmark

logger = logging.getLogger(__name__)


@dataclass
class SentimentBenchmark(BinaryClassificationBenchmark):
    """
    Sentiment benchmark

    Datasets
    --------
    imdb_sentiment:
        Size: 5000 samples (2506 positive sentiment, 2494 negative sentiment)
        Source: https://huggingface.co/datasets/imdb

        Label 0: negative sentiment
        Label 1: positive sentiment

    """

    description: str = "Sentiment benchmark"

    def load_datasets(self, n: Optional[int] = None) -> List[BinaryClassificationDataset]:
        if n is not None:
            logger.warning("n parameter currently not supported for sentiment benchmark. Ignoring n parameter.")
        df = pd.read_parquet("https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/sentiment/imdb_sentiment.parquet")
        # df = df.sample(frac=0.05, random_state=42)
        ds = BinaryClassificationDataset(
            name="imdb_sentiment",
            inputs=df["text"].tolist(),  # pyright: ignore[reportUnknownArgumentType]
            labels=df["label"].tolist(),  # pyright: ignore[reportUnknownArgumentType]
        )
        return [ds]
