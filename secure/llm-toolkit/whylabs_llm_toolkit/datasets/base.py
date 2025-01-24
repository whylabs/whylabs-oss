import json
import logging
from typing import Any, List, Optional, Sequence, Tuple, cast

import numpy as np
import pandas as pd
from pandas.core.groupby.generic import DataFrameGroupBy

from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder
from whylabs_llm_toolkit.models.semantic_similarity import get_scorer
from whylabs_llm_toolkit.models.semantic_similarity.base import Scorer
from whylabs_llm_toolkit.utils import AssetHandler

logger = logging.getLogger(__name__)
DATASETS_COLUMN_SCHEMA = ["text", "label", "source", "properties"]


class Dataset:
    def __init__(
        self,
        dataset: str,
        tag: str,
        encoder_name: SentenceTransformerEncoder,
        version: Optional[int] = None,
    ):
        self.dataset = dataset
        self.ds_handler = AssetHandler(self.dataset, "dataset")
        self.tag = tag
        self.encoder_name = encoder_name
        self.added_source_data: List[Tuple[Sequence[str], str]] = []

        df = self.ds_handler.download_dataset(tag=tag, version=version)
        if df is None:
            df = pd.DataFrame(columns=DATASETS_COLUMN_SCHEMA)
        self.df = df
        try:
            self.df_embeddings: Optional[pd.DataFrame] = self.ds_handler.get_embeddings(tag=tag, version=version, encoder_name=encoder_name)  # noqa: F821
            self.scorer = get_scorer(self.dataset, tag=tag, version=version, encoder_name=encoder_name)
        except FileNotFoundError:
            logger.warning(f"embeddings not found for encoder {encoder_name}: generating new scorer for this encoder")
            self.scorer = get_scorer(self.dataset, tag="", encoder_name=encoder_name)  # returns scorer with empty embeddings
            self.df_embeddings = self._generate_df_embeddings(df, self.scorer)
            self.scorer.set_reference_embeddings(self.df_embeddings)
        if self.df_embeddings is None:  # if tag is "", create empty df_embeddings
            self.df_embeddings = pd.DataFrame(columns=["index", "sentence_embedding"])

    def _generate_df_embeddings(self, df: pd.DataFrame, scorer: Scorer) -> pd.DataFrame:
        positive_df = df[(df["label"] == 1)]
        sentences: Sequence[str] = positive_df["text"].tolist()
        index_list: Sequence[int] = list(positive_df.index)  # pyright: ignore[reportUnknownArgumentType, reportUnknownMemberType]
        sentence_embeddings: np.ndarray[Any, Any] = scorer.encode(sentences)
        df_embeddings = pd.DataFrame(columns=["index", "sentence_embedding"])
        df_embeddings["index"] = index_list
        df_embeddings["sentence_embedding"] = sentence_embeddings.tolist()
        return df_embeddings

    def get_scorer(self):
        return self.scorer

    def add_bulk_examples(self, df: pd.DataFrame) -> None:
        """
        This should be used when you want to add a large number of examples to the dataset, with the
        expected df schema. Columns should be ["text", "label", "source", "properties"]
        """
        for column in DATASETS_COLUMN_SCHEMA:
            if column not in df.columns:
                raise ValueError(f"Column {column} not found in the dataframe. Please ensure the schema is correct.")
        dfs: DataFrameGroupBy[Any] = df.groupby(["source", "properties", "label"])  # pyright: ignore[reportUnknownMemberType]
        for group, df in dfs:
            source, properties, label = group
            self.add_examples(cast(Sequence[str], df["text"].tolist()), label, source, **json.loads(properties))

    def remove_examples(self, indices: Sequence[int]) -> None:
        # get examples being removed
        self.df = self.df.reset_index(drop=True)
        if self.df_embeddings is not None:
            self.df_embeddings = self.df_embeddings.reset_index(drop=True)
            self.df_embeddings = self.df_embeddings.drop(indices)
            self.scorer.set_reference_embeddings(self.df_embeddings)
            self.df_embeddings = self.df_embeddings.reset_index(drop=True)

        removed_examples = cast(Sequence[str], self.df.iloc[indices]["text"].tolist())  # pyright: ignore[reportArgumentType, reportCallIssue, reportUnknownMemberType]
        self.added_source_data.append((removed_examples, "removed"))
        self.df = self.df.drop(indices)
        self.df = self.df.reset_index(drop=True)
        if self.df_embeddings is not None:
            assert len(self.df) == len(self.df_embeddings)

    def add_examples(
        self,
        examples: Sequence[str],
        label: int,
        source: str,
        **kwargs: Any,
    ) -> None:
        logger.info(f"Adding new examples to {self.dataset} dataset...")
        properties = kwargs if kwargs else {}
        new_df = pd.DataFrame(
            {
                "text": examples,
                "label": [label] * len(examples),
                "source": [source] * len(examples),
                "properties": [json.dumps(properties)] * len(examples),
            }
        )
        self.df = pd.concat([self.df, new_df])
        self.added_source_data.append((examples, source))
        self.df_embeddings = self._generate_df_embeddings(self.df, self.scorer)
        self.scorer.set_reference_embeddings(self.df_embeddings)
        self.version = 0  # indicates added examples
