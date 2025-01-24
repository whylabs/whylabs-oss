import logging
from dataclasses import dataclass
from typing import List, Sequence, cast

import numpy as np
import numpy.typing as npt
from chromadb import IDs
from chromadb.api.types import IncludeEnum

from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder
from whylabs_llm_toolkit.utils import ChromaHandler

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LookupResult:
    id: Sequence[str]
    raw_text: Sequence[str]  # Prompt for which the lookup was performed
    labels: Sequence[float]  # 0 for not an injection, 1 for an injection
    source: Sequence[str]  # Dataset of origin
    properties: Sequence[dict[str, int]]  # Harmful, injection, etc.


@dataclass
class EmbeddingLookup:
    def __init__(self, dataset: str, tag: str, encoder_name: SentenceTransformerEncoder):
        self.dataset = dataset  # Name of the dataset, ex. injections
        self.encoder_name = encoder_name
        self.ds_handler = ChromaHandler(self.dataset, tag=tag)
        self.encoder = self.encoder_name.get_sentence_transformers()
        self.collection = self.ds_handler.collection

    def lookup_embeddings(self, ids: Sequence[str]) -> npt.NDArray[np.float64]:
        results = self.collection.get(ids=ids, include=["embeddings"])  # pyright: ignore[reportArgumentType]
        return np.array(results["embeddings"])

    def getInfo_embeddings(
        self,
        inputs: npt.NDArray[np.float64],
    ) -> LookupResult:
        ids = self._process_embeddings(inputs)
        return self.getInfo(cast(Sequence[str], (ids)))

    def getInfo(
        self,
        ids: Sequence[str],
    ) -> LookupResult:
        if isinstance(ids, str) or isinstance(ids, list):
            ids = [[ids]]  # pyright: ignore[reportAssignmentType]
        return self._lookup_ids(ids)

    def _process_embeddings(self, target_embeddings: npt.NDArray[np.float64]) -> List[IDs]:
        ids = []
        # Check chromaDB loaded properly
        target_norms = target_embeddings / np.linalg.norm(target_embeddings, axis=1, keepdims=True)  # normalize input embeddings
        query_results = self.collection.query(  # pyright: ignore[reportUnknownMemberType]
            query_embeddings=target_norms.tolist(), n_results=1, include=[IncludeEnum.distances]
        )  # filter where label = 1 (injection)
        for i, distance in enumerate(query_results["distances"]):  # pyright: ignore[reportArgumentType]
            if distance[0] > 0.05:
                raise ValueError(f"Embedding {i} is not similar to any injection embeddings.")
        else:
            ids = query_results["ids"]
            return ids

    def _lookup_ids(self, target_ids: Sequence[str]) -> LookupResult:
        flat_ids = [item for sublist in target_ids for item in sublist]  # get ride of nested list
        label: list[float] = []
        raw_text: list[str] = []
        source: list[str] = []
        properties: list[dict[str, int]] = []
        id: Sequence[str] = target_ids
        query_results = None
        for flat_id in flat_ids:
            query_results = self.collection.get(ids=flat_id, include=[IncludeEnum.documents, IncludeEnum.metadatas])
            if query_results["ids"] == []:
                raise ValueError(f"Embedding with id:'{flat_id}' not found in ChromaDB.")
        assert query_results is not None
        # Append raw_text if it exists
        if "documents" in query_results:
            raw_text.append(str(query_results["documents"]))

        metadata = query_results["metadatas"]
        assert metadata is not None
        id = query_results["ids"]

        for item in metadata:
            if item:  # Ensure the item is not None or empty
                label.append(int(item.get("label", 1)))  # Default to 1 if label is missing
                source.append(str(item.get("source", "")))  # Default to empty string if source is missing
                properties.append(item.get("properties", "{}"))  # pyright: ignore[reportArgumentType]

        return LookupResult(id=id, raw_text=raw_text, labels=label, source=source, properties=properties)
