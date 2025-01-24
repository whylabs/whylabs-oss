import logging
from dataclasses import dataclass
from typing import List, Optional

import pandas as pd

from ..datasets_types import (
    BinaryClassificationDataset,
)
from .binary_classification_benchmarks import BinaryClassificationBenchmark

logger = logging.getLogger(__name__)

_REFUSAL_URL = "https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/refusals/chatgpt_refusals.parquet"
_REFUSAL_PT_URL = "https://whylabs-public.s3.us-west-2.amazonaws.com/langkit-benchmark/refusals/chatgpt_refusals_pt.parquet"


@dataclass
class RefusalsBenchmark(BinaryClassificationBenchmark):
    """Refusals benchmark

    Datasets
    --------
    chatgpt_refusals:
        Size: 2346 samples (346 positives, 2000 negatives)
        Source:
            positive samples: https://github.com/maxwellreuter/chatgpt-refusals
            negative samples: https://huggingface.co/datasets/alespalla/chatbot_instruction_prompts (train split)
    """

    description: str = "Refusals benchmark"

    def load_datasets(self, n: Optional[int] = None) -> List[BinaryClassificationDataset]:
        if n is not None:
            logger.warning("n parameter currently not supported for refusals benchmark. Ignoring n parameter.")
        df = pd.read_parquet(_REFUSAL_URL)
        ds = BinaryClassificationDataset(
            name="chatgpt_refusals",
            inputs=df["response"].tolist(),  # pyright: ignore[reportUnknownArgumentType]
            labels=df["label"].tolist(),  # pyright: ignore[reportUnknownArgumentType]
        )
        df_pt = pd.read_parquet(_REFUSAL_PT_URL)
        ds_pt = BinaryClassificationDataset(
            name="chatgpt_refusals_pt",
            inputs=df_pt["response"].tolist(),  # pyright: ignore[reportUnknownArgumentType]
            labels=df_pt["label"].tolist(),  # pyright: ignore[reportUnknownArgumentType]
        )
        return [ds, ds_pt]
