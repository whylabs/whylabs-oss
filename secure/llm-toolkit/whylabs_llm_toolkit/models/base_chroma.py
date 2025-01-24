from dataclasses import dataclass
from typing import Any, List, Literal, Optional, Sequence, Union, overload

import numpy as np
import numpy.typing as npt  # for typing numpy arrays


@dataclass(frozen=True)
class ScorerResultChroma:
    metrics: Sequence[float]
    id: Sequence[Sequence[str]]
    neighbor_embeddings: List[npt.NDArray[np.float64]]
    label: Sequence[Sequence[int]]
    vendor: Sequence[Sequence[str]]
    sublabel: Sequence[Sequence[str]]
    signal_coefficient: Sequence[Sequence[float]]


@dataclass
class ChromaScorer:
    @overload
    def predict(self, inputs: List[str]) -> Sequence[float]:
        """
        Predict cosine similarity scores for a list of input texts.

        Args:
            - inputs (List[str]): A list of input text strings.

        Returns:
            Sequence[float]: A sequence of prediction scores corresponding to the input texts.
        """
        ...

    @overload
    def predict(self, inputs: npt.NDArray[np.float64]) -> Sequence[float]:
        """
        Predict scores for a numpy array of embeddings.

        Args:
            - inputs (npt.NDArray[np.float64]): A numpy array of input embeddings.

        Returns:
            Sequence[float]: A sequence of prediction scores corresponding to the input embeddings.
        """
        ...

    @overload
    def predict(self, inputs: List[str], return_neighbor: Literal[True]) -> ScorerResultChroma:
        """
        Predict scores for a list of input texts and returns score and the nearest neighbor information.
        Scorerclass return type has field metrics and neighbor_embeddings.

        Args:
            - inputs (List[str]): A list of input text strings.
            - return_neighbor (Literal[True]): Flag indicating whether to return nearest neighbor information.

        Returns:
            ScorerResult: An object containing prediction scores and nearest neighbor information.
        """
        ...

    @overload
    def predict(self, inputs: npt.NDArray[np.float64], return_neighbor: Literal[True]) -> ScorerResultChroma:
        """
        Predict scores for a list of emeddings and returns score and the nearest neighbor information.
        Scorerclass return type has field metrics and neighbor_embeddings.

        Args:
            - inputs (npt.NDArray[np.float64]): A numpy array of input embeddings.
            - return_neighbor (Literal[True]): Flag indicating whether to return nearest neighbor information.

        Returns:
            ScorerResult: A result object containing prediction scores and nearest neighbor information.
        """
        ...

    def predict(
        self, inputs: Union[npt.NDArray[np.float64], List[str]], return_neighbor: Optional[bool] = None
    ) -> Union[ScorerResultChroma, Sequence[float]]:
        """
        Predict scores for input texts or embeddings and optionally return the nearest neighbor information.

        Args:
            - inputs: (Union[npt.NDArray[np.float64], List[str]]): list of input text strings or embeddings.
            - return_neighbor (Optional[bool]): Optional flag to return nearest neighbor. Defaults to None.

        Returns:
            Union[ScorerResult, Sequence[float]]: A sequence of prediction scores or a ScorerResult object
            containing scores and nearest neighbor information, depending on the value of `return_neighbor`.
        """
        raise NotImplementedError("not implemented")


@dataclass
class MultiInputScorer:
    def predict(self, inputs: Sequence[str], context: Sequence[Any]) -> Sequence[float]:
        raise NotImplementedError("not implemented")
