# Standard library imports
import logging
from dataclasses import dataclass
from typing import Any, List, Literal, Optional, Sequence, Union, cast, overload

import chromadb
import numpy as np
import numpy.typing as npt
from chromadb.api.types import IncludeEnum

# Local/project-specific imports
from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder
from whylabs_llm_toolkit.eval.evaluation_metrics import BinaryClassificationResult
from whylabs_llm_toolkit.models import base_chroma as base_models
from whylabs_llm_toolkit.models.base_chroma import ScorerResultChroma as ScorerResult
from whylabs_llm_toolkit.settings import get_settings
from whylabs_llm_toolkit.utils import ChromaHandler

# Logger initialization
logger = logging.getLogger(__name__)


@dataclass
class ChromaScorer(base_models.ChromaScorer):
    def __init__(
        self,
        dataset: str,
        tag: str,
        encoder_name: SentenceTransformerEncoder,
        version: Optional[int] = None,
        neighbors_num: int = 1,
    ):
        self.dataset = dataset  # This is the name of the dataset, ex. injections
        self.encoder_name = encoder_name
        self._version = version
        self.ds_handler = ChromaHandler(self.dataset, tag=tag)
        self.encoder = None
        self.collection = self.ds_handler.collection
        assert neighbors_num > 0
        self.neighbors_num = neighbors_num

    @overload
    # text input
    def predict(self, inputs: List[str]) -> Sequence[float]:
        ...

    @overload
    # embeddings input
    def predict(self, inputs: npt.NDArray[np.float64]) -> Sequence[float]:
        ...

    @overload
    # text and neighbor argument
    def predict(self, inputs: List[str], return_neighbor: Literal[True]) -> ScorerResult:
        ...

    @overload
    # text and neighbor argument
    def predict(self, inputs: npt.NDArray[np.float64], return_neighbor: Literal[True]) -> ScorerResult:
        ...

    def predict(
        self, inputs: Union[npt.NDArray[np.float64], List[str]], return_neighbor: Optional[bool] = None
    ) -> Union[ScorerResult, Sequence[float]]:
        if isinstance(inputs, np.ndarray):
            # Embeddings input
            return self._process_embeddings(inputs, return_neighbor)
        else:
            # Float input
            if inputs and inputs[0] and all(isinstance(x, float) for x in inputs[0]):
                embeddings = cast(npt.NDArray[np.float64], np.asarray(inputs))
            # Text input
            else:
                embeddings = self.encode(inputs)
            return self._process_embeddings(embeddings, return_neighbor)

    def encode(self, inputs: List[str]) -> npt.NDArray[np.float64]:
        if self.encoder is None:
            try:
                self.encoder = self.encoder_name.get_sentence_transformers()
            except ImportError:
                raise ImportError("Sentence-transformers not available - Please install the [eval] extra to use this method")
        embeddings: npt.NDArray[np.float64] = cast(npt.NDArray[np.float64], self.encoder.encode(inputs))  # pyright: ignore[reportUnknownMemberType]
        return embeddings

    def return_collection(self) -> Optional[chromadb.Collection]:
        return self.collection

    def evaluate(self) -> dict[str, BinaryClassificationResult]:
        return {}

    def _process_embeddings(
        self, target_embeddings: npt.NDArray[np.float64], return_neighbor: Optional[bool] = None
    ) -> Union[ScorerResult, Sequence[float]]:
        query_embeddings = self._normalize_embeddings(target_embeddings)
        results = self._query_collection(query_embeddings, return_neighbor)
        query_results: dict[str, Any] = cast(dict[str, Any], results)
        metrics = self._calculate_metrics(query_results)

        if return_neighbor:
            return self._create_scorer_result(query_results, metrics)
        else:
            return metrics

    def _normalize_embeddings(self, embeddings: npt.NDArray[np.float64]) -> List[List[float]]:
        if embeddings.ndim == 1:
            embeddings = embeddings.reshape(1, -1)
        target_norms = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        return target_norms.tolist()

    def _query_collection(self, query_embeddings: List[List[float]], return_neighbor: Optional[bool]) -> chromadb.QueryResult:
        assert self.collection is not None
        result: chromadb.QueryResult = self.collection.query(  # pyright: ignore[reportUnknownMemberType]
            query_embeddings=query_embeddings,  # pyright: ignore[reportArgumentType]
            n_results=self.neighbors_num,
            include=[IncludeEnum.metadatas, IncludeEnum.distances, IncludeEnum.embeddings]
            if return_neighbor
            else [IncludeEnum.distances, IncludeEnum.metadatas],
        )
        return result

    def _calculate_metrics(self, query_results: dict[str, Any]) -> Sequence[float]:
        metrics: List[float] = []
        for distance, metadata in zip(query_results["distances"], query_results["metadatas"]):
            if get_settings().USE_SIGNAL_COEFFICIENT:
                avg_score = sum([1 - d * m["signal_coefficient"] for d, m in zip(distance, metadata)]) / self.neighbors_num
            else:
                avg_score = sum([1 - d for d in distance]) / self.neighbors_num
            metrics.append(avg_score)
        return metrics

    def _create_scorer_result(self, query_results: dict[str, Any], metrics: Sequence[float]) -> ScorerResult:
        neighbor_embeddings: List[npt.NDArray[np.float64]] = query_results["embeddings"]
        metadata = query_results["metadatas"]
        label = [[int(m["label"]) for m in sublist if m] for sublist in metadata]
        vendor = [[str(m["vendor"]) for m in sublist if m] for sublist in metadata]
        sublabel = [[str(m["sublabel"]) for m in sublist if m] for sublist in metadata]
        signal_coefficient = [[float(m["signal_coefficient"]) for m in sublist if m] for sublist in metadata]

        return ScorerResult(
            metrics=metrics,
            id=cast(Sequence[str], query_results["ids"]),
            neighbor_embeddings=neighbor_embeddings,
            label=label,
            vendor=vendor,
            sublabel=sublabel,
            signal_coefficient=signal_coefficient,
        )

    def delete_embedding(self, embedding: npt.NDArray[np.float64]):
        target_norms = embedding / np.linalg.norm(embedding, axis=1, keepdims=True)
        assert self.collection is not None
        query_results = self.collection.query(  # pyright: ignore[reportUnknownMemberType]
            query_embeddings=target_norms.tolist(), n_results=1, include=[IncludeEnum.metadatas, IncludeEnum.distances]
        )
        assert query_results["distances"] is not None
        assert query_results["ids"] is not None
        for i, distance in enumerate(query_results["distances"]):
            if distance[0] > 0.01:
                raise ValueError(f"Embedding {i} is not similar to any injection embeddings.")
        self.collection.delete(query_results["ids"][0])

    def delete_embedding_by_id(self, id: str):
        self.collection.delete(cast(chromadb.IDs, id))

    # Add example to chromaDB with metadata fields
    def add_example(self, id: str, embedding: Optional[npt.NDArray[np.float64]], text: str, metadata: dict[str, Union[int, float, str]]):
        if embedding is None:
            self.encoder = self.encoder_name.get_sentence_transformers()
            embedding = cast(npt.NDArray[np.float64], self.encoder.encode(text))  # pyright: ignore[reportUnknownMemberType]
        assert self.collection is not None
        self.collection.upsert(ids=id, embeddings=[embedding.tolist()], metadatas=[metadata])  # pyright: ignore[reportUnknownMemberType]
