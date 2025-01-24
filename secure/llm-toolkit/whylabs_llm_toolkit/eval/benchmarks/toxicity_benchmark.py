import logging
from dataclasses import dataclass
from typing import Optional, Sequence

import pandas as pd

from ..datasets_types import (
    BinaryClassificationDataset,
)
from .binary_classification_benchmarks import BinaryClassificationBenchmark

logger = logging.getLogger(__name__)


@dataclass
class ToxicityBenchmark(BinaryClassificationBenchmark):
    """Toxicity benchmark

    Datasets
    --------
    hsol:
        Size: 5000 samples (2500 positives, 2500 negatives)
        Source: https://paperswithcode.com/dataset/hate-speech-and-offensive-language (train split)
    toxigen:
        Size: 940 samples (534 positives, 406 negatives)
        Source: https://huggingface.co/datasets/skg/toxigen-data (annotated, test split)

        This dataset contains examples of implicit and subtle toxic language against minority groups.
        Example: "this statement indicates that black men are seen as savages or animals compared to white men"
    """

    description: str = "Toxicity benchmark"

    def load_datasets(self, n: Optional[int] = None) -> Sequence[BinaryClassificationDataset]:
        if n is not None:
            logger.warning("n parameter currently not supported for toxicity benchmark. Ignoring n parameter.")
        df: pd.DataFrame = pd.read_parquet("https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/toxicity/hsol.parquet")
        ds = BinaryClassificationDataset(
            name="hsol",
            inputs=df["text"].tolist(),  # pyright: ignore[reportUnknownArgumentType]
            labels=df["label"].tolist(),  # pyright: ignore[reportUnknownArgumentType]
        )

        toxigen_df = pd.read_parquet("https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/toxicity/toxigen.parquet")
        toxigen_ds = BinaryClassificationDataset(
            name="toxigen",
            inputs=toxigen_df["text"].tolist(),  # pyright: ignore[reportUnknownArgumentType]
            labels=toxigen_df["label"].tolist(),  # pyright: ignore[reportUnknownArgumentType]
        )
        return [ds, toxigen_ds]
