import logging
from dataclasses import dataclass
from typing import List, Optional, Union

import pandas as pd

from ..datasets_types import (
    BinaryClassificationDataset,
    MultiInputBinaryClassificationDataset,
)
from .binary_classification_benchmarks import BinaryClassificationBenchmark

logger = logging.getLogger(__name__)


@dataclass
class ConsistencyBenchmark(BinaryClassificationBenchmark):
    """Consistency benchmark"""

    description: str = "Consistency benchmark"

    def load_datasets(self, n: Optional[int] = None) -> List[Union[BinaryClassificationDataset, MultiInputBinaryClassificationDataset]]:
        if n is not None:
            logger.warning("n parameter currently not supported for consistency benchmark. Ignoring n parameter.")
        df: pd.DataFrame = pd.read_parquet(
            "https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/hallucinations/wiki_bio_gpt3_hallucination.parquet"
        )
        ds = MultiInputBinaryClassificationDataset(
            name="wiki_bio_gpt3",
            inputs=df["sentence"].tolist(),  # pyright: ignore[reportUnknownArgumentType]
            labels=df["label"].tolist(),  # pyright: ignore[reportUnknownArgumentType]
            context=df["gpt_samples"].tolist(),  # pyright: ignore[reportUnknownArgumentType]
        )
        return [ds]
