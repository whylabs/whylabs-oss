import os
from typing import Any, List, cast

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity  # pyright: ignore[reportUnknownVariableType]
from tqdm import tqdm

from langkit.transformer import WhyLabsSupportedEncoder
from whylabs_llm_toolkit.data.scripts.targets import DataPaths, SentenceTransformerEncoder


class ExclusionList:
    def __init__(self) -> None:
        path = DataPaths().get_exclusion_list_path()
        self.exclusion_list_path = os.path.join(path, "exclusion_list.csv")

    def __validate_exclusion_list(self, exclusion_list: Any) -> None:
        if len(exclusion_list) == 0:
            raise ValueError("Exclusion list is empty")
        if not all(isinstance(uid, str) for uid in exclusion_list):
            raise ValueError("Exclusion list contains non-string values")

    def __load_exclusion_list(self) -> List[str]:
        exclusion_list = pd.read_csv(self.exclusion_list_path)["uid"].tolist()  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]
        self.__validate_exclusion_list(exclusion_list)
        return cast(List[str], exclusion_list)

    def remove_using_exclusion_list(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        This exclusion list is made of samples whose embeddings are very similar to others.
        """
        exclusion_list = self.__load_exclusion_list()
        return df[~df["uid"].isin(exclusion_list)]  # pyright: ignore[reportUnknownMemberType]

    def generate_exclusion_list(self, df: pd.DataFrame, epsilon=0.1) -> pd.DataFrame:
        """
        This exclusion list is made of samples whose embeddings are very similar to others.
        """
        st = SentenceTransformerEncoder.AllMiniLML6V2
        encoder = WhyLabsSupportedEncoder(st.name).get_supported_encoder().get_sentence_transformers()

        embeddings = encoder.encode(cast(List[str], df["text"].values))  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]

        # Initialize mask for rows to keep
        keep_mask = np.ones(len(df), dtype=bool)
        all_indices = list(range(len(df)))
        # Iterate through rows using iterrows()
        for idx in tqdm(range(len(df)), desc="Pruning similar embeddings"):
            if keep_mask[idx]:  # Only check if current row hasn't been marked for removal
                # Get remaining indices after current position
                remaining_indices = all_indices[idx + 1 :]

                if remaining_indices:  # Check if there are remaining indices to compare
                    # Compute cosine similarity with remaining rows
                    similarities = cosine_similarity([embeddings[idx]], embeddings[remaining_indices])[0]  # pyright: ignore[reportUnknownVariableType]

                    # Find indices where similarity is very high (distance close to 0)
                    # Cosine distance = 1 - cosine similarity
                    similar_indices = np.where(1 - similarities <= epsilon)[0]  # pyright: ignore[reportUnknownArgumentType]

                    # Mark similar rows for removal
                    # Add idx+1 because we compared with rows after current index
                    keep_mask[similar_indices + (idx + 1)] = False
        # write uid columns of rows to remove to a file
        # Return pruned DataFrame
        df["keep_mask"] = keep_mask
        uids_to_remove = df[~df["keep_mask"]]["uid"]  # pyright: ignore[reportUnknownVariableType]
        return uids_to_remove.to_frame()
