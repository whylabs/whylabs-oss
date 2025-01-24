# pyright: reportUnknownMemberType=none
# pyright: reportUnknownParameterType=none
# pyright: reportUnknownArgumentType=none
# pyright: reportUnknownVariableType=none

from dataclasses import dataclass
from typing import Any, List, Literal, Optional, Sequence, Union, overload

import numpy as np
import numpy.typing as npt
import pandas as pd

from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder
from whylabs_llm_toolkit.eval.evaluation_metrics import ResultGroup
from whylabs_llm_toolkit.models import base as base_models
from whylabs_llm_toolkit.models.base import ScorerResult
from whylabs_llm_toolkit.utils import DatasetHandler, process_embeddings


@dataclass
class Scorer(base_models.Scorer):
    def __init__(
        self,
        dataset: str,
        tag: str,
        version: Optional[int] = None,
        encoder_name: SentenceTransformerEncoder = SentenceTransformerEncoder.AllMiniLML6V2,
        neighbors_num: int = 1,
    ):
        self.dataset = dataset
        self.encoder_name = encoder_name
        self.ds_handler = DatasetHandler(self.dataset)
        self.neighbors_num = neighbors_num

        df_embeddings: Optional[pd.DataFrame] = self.ds_handler.get_embeddings(tag, encoder_name, version=version)
        if df_embeddings is None:
            df_embeddings = pd.DataFrame(columns=["index", "sentence_embedding"])
        self.reference_embeddings = process_embeddings(df_embeddings)
        self.encoder = None

    def add_embeddings(self, embeddings: npt.NDArray[Any]):
        embeddings_normalized = process_embeddings(embeddings)
        if self.reference_embeddings is None or embeddings_normalized is None:
            raise ValueError("Reference embeddings not set")
        self.reference_embeddings = np.vstack((self.reference_embeddings, embeddings_normalized))

    def set_reference_embeddings(self, embeddings_df: pd.DataFrame):
        self.reference_embeddings = process_embeddings(embeddings_df)

    def validate_embeddings(self, embeddings_lists):
        """
        Validate if the input list of lists represents valid embeddings.

        Args:
            embeddings_lists (list): A list of lists, where each inner list represents an embedding.

        Returns:
            bool: True if all inner lists are valid embeddings, False otherwise.
        """
        try:
            # Try to convert each inner list to a list of floats
            for embedding_list in embeddings_lists:
                [float(x) for x in embedding_list]
            return True
        except ValueError:
            return False

    def convert_to_ndarray(self, embeddings_lists):
        """
        Convert a list of lists representing embeddings to a NumPy array of float64 data type.

        Args:
            embeddings_lists (list): A list of lists, where each inner list represents an embedding.

        Returns:
            np.ndarray: A NumPy array of float64 data type containing the embeddings.
        """
        if self.validate_embeddings(embeddings_lists):
            return np.array(embeddings_lists, dtype=np.float64)
        else:
            raise ValueError("Invalid input list. Please provide a valid list of embeddings.")

    @overload
    # text input
    def predict(self, inputs: List[str]) -> Sequence[float]:
        ...

    @overload
    # embeddings input
    def predict(self, inputs: npt.NDArray[Any]) -> Sequence[float]:
        ...

    @overload
    # text and neighbor argument
    def predict(self, inputs: List[str], return_neighbor: Literal[True]) -> ScorerResult:
        ...

    @overload
    # text and neighbor argument
    def predict(self, inputs: npt.NDArray[Any], return_neighbor: Literal[True]) -> ScorerResult:
        ...

    def predict(
        self, inputs: Union[npt.NDArray[Any], List[str]], return_neighbor: Optional[bool] = None
    ) -> Union[ScorerResult, Sequence[float]]:
        if isinstance(inputs, np.ndarray):
            # Embeddings input
            return self._process_embeddings(inputs, return_neighbor)
        elif isinstance(inputs, list) and all(isinstance(x, float) for x in inputs[0]):  # pyright: ignore[reportUnnecessaryIsInstance]
            embeddings = self.convert_to_ndarray(inputs)
        elif isinstance(inputs, list):  # pyright: ignore[reportUnnecessaryIsInstance]
            embeddings = self.encode(inputs)
        else:
            raise ValueError("Invalid input type. Must be list or np.ndarray.")
        return self._process_embeddings(embeddings, return_neighbor)

    def encode(self, inputs: List[str]) -> npt.NDArray[np.float64]:
        if self.encoder is None:
            try:
                self.encoder = self.encoder_name.get_sentence_transformers()
            except ImportError:
                raise ImportError("Sentence-transformers not available - Please install the [eval] extra to use this method")
        return self.encoder.encode(inputs)

    def evaluate(self) -> ResultGroup:
        ...

    def _process_embeddings(
        self, target_embeddings: npt.NDArray[np.float64], return_neighbor: Optional[bool] = None
    ) -> Union[ScorerResult, Sequence[float]]:
        if self.reference_embeddings is None:
            raise ValueError("Semantic Similarity Scorer - Reference embeddings not set")
        target_norms = target_embeddings / np.linalg.norm(target_embeddings, axis=1, keepdims=True)
        cosine_similarities = np.dot(self.reference_embeddings, target_norms.T)
        # Sort each column in descending order and take the top N similarities
        N = self.neighbors_num
        top_n_similarities = np.sort(cosine_similarities, axis=0)[-N:]
        # Calculate the average of the top N similarities for each column
        average_top_n_similarities = np.mean(top_n_similarities, axis=0)
        metrics: Sequence[float] = [float(score) for score in average_top_n_similarities]
        if return_neighbor:
            max_similarities_indices = np.argmax(cosine_similarities, axis=0)
            max_reference_embeddings = self.reference_embeddings[max_similarities_indices]
            return ScorerResult(metrics=metrics, neighbor_embeddings=max_reference_embeddings, neighbor_indices=max_similarities_indices)
        else:
            return metrics


@dataclass
class BinaryClassifier:
    def predict(self, inputs: Sequence[str]) -> Sequence[int]:
        raise NotImplementedError("not implemented")


@dataclass
class MultiInputScorer:
    def predict(self, inputs: Sequence[str], context: Sequence[Any]) -> Sequence[float]:
        raise NotImplementedError("not implemented")
