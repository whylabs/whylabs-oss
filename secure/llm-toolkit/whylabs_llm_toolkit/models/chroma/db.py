from dataclasses import dataclass
from typing import List, Literal, Optional, Sequence, Union, cast, overload

import chromadb
import numpy as np
import numpy.typing as npt
import pandas as pd
from chromadb.api import ClientAPI
from chromadb.api.types import URI, Document, Embedding, IDs, Loadable, Metadata
from chromadb.config import Settings as ChromaSettings

from langkit.metrics.themes.additional_data import AdditionalData
from whylabs_llm_toolkit.asset_download import get_asset
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts.targets import Asset, AssetId, AssetStage, SentenceTransformerEncoder
from whylabs_llm_toolkit.models.chroma.chroma_id import short_sha256_base64
from whylabs_llm_toolkit.settings import get_settings


@dataclass(frozen=True)
class ChromaResult:
    metrics: Sequence[float]
    id: Sequence[Sequence[str]]
    signal_coefficient: Optional[Sequence[float]]


@dataclass(frozen=True)
class ChromaNeighborResult:
    metrics: Sequence[float]
    id: Sequence[Sequence[str]]
    neighbor_embeddings: List[List[Embedding]]
    signal_coefficient: Optional[Sequence[float]]


@dataclass(frozen=True)
class ValidatedQueryResult:
    ids: List[IDs]
    embeddings: Optional[List[List[Embedding]]]
    documents: Optional[List[List[Document]]]
    uris: Optional[List[List[URI]]]
    data: Optional[List[Loadable]]
    metadatas: List[List[Metadata]]
    distances: List[List[float]]

    @staticmethod
    def from_query_result(result: chromadb.QueryResult) -> "ValidatedQueryResult":
        assert result["metadatas"] is not None
        assert result["distances"] is not None

        return ValidatedQueryResult(
            ids=result["ids"],
            embeddings=result["embeddings"],
            documents=result["documents"],
            uris=result["uris"],
            data=result["data"],
            metadatas=result["metadatas"],
            distances=result["distances"],
        )


def _get_chromadb_asset_id(label: Optional[Labels]) -> AssetId:
    if label is None:
        return cast(AssetId, "chromadb")
    elif label.name == "code":
        return cast(AssetId, "chromadb_code")
    elif label.name == "medical":
        return cast(AssetId, "chromadb_medical")
    elif label.name == "financial":
        return cast(AssetId, "chromadb_financial")
    elif label.name == "hate":
        return cast(AssetId, "chromadb_hate")
    elif label.name == "toxic":
        return cast(AssetId, "chromadb_toxic")
    elif label.name == "harmful":
        return cast(AssetId, "chromadb_harmful")
    elif label.name == "innocuous":
        return cast(AssetId, "chromadb_innocuous")
    else:
        raise ValueError(f"chromadb asset id: Invalid label: {label}")


class ChromaVectorDB:
    def __init__(
        self,
        encoder: SentenceTransformerEncoder,
        stage: AssetStage = "prod",
        version: Optional[int] = None,
        neighbor_num: Optional[int] = None,
        local_path: Optional[str] = None,
        additional_data_url: Optional[str] = None,
        label: Optional[Labels] = None,
    ) -> None:
        self._encoder = encoder
        self._stage = stage
        self._version = version
        asset_id = _get_chromadb_asset_id(label)
        self._asset = Asset(encoder=encoder, stage=stage, asset_id=asset_id, version=version)
        self._client_api: Optional[ClientAPI] = None
        self._collection: Optional[chromadb.Collection] = None
        self._neighbors_num = neighbor_num or 14
        self._local_path = local_path
        self._additional_data_url = additional_data_url

    def cache_assets(self) -> str:
        if self._additional_data_url:
            AdditionalData(self._additional_data_url).encode_additional_data()

        return self._local_path or get_asset(
            self._asset.asset_id,
            tag=self._asset.tag_name(),
            version=self._version,
        )

    def init(self) -> chromadb.Collection:
        if self._client_api is not None and self._collection is not None:
            return self._collection

        db_path = self.cache_assets()

        self._client_api = chromadb.PersistentClient(path=db_path, settings=ChromaSettings(anonymized_telemetry=False))

        # Create a collection
        self._collection = self._client_api.get_collection(name="collection")

        # Consume additional data
        if self._additional_data_url:
            additional_data = AdditionalData(self._additional_data_url)
            additional_data_embeddings = additional_data.encode_additional_data()

            if isinstance(additional_data_embeddings, pd.DataFrame):
                ids: List[str] = additional_data_embeddings["id"].tolist()
                data: List[Embedding] = additional_data_embeddings["embedding"].tolist()
                self._collection.add(embeddings=data, ids=ids)  # pyright: ignore[reportUnknownMemberType]
            else:
                data = additional_data_embeddings.tolist()
                ids = [short_sha256_base64(str(embedding)) for embedding in data]
                self._collection.add(embeddings=data, ids=ids)  # pyright: ignore[reportUnknownMemberType]

        return self._collection

    def _query_collection(self, query_embeddings: List[List[float]], return_neighbors: bool) -> ValidatedQueryResult:
        collection = self.init()
        include = ["metadatas", "distances", "embeddings"] if return_neighbors else ["distances", "metadatas"]
        result: chromadb.QueryResult = collection.query(  # pyright: ignore[reportUnknownMemberType]
            query_embeddings=query_embeddings,  # pyright: ignore[reportArgumentType]
            n_results=self._neighbors_num,
            include=include,  # pyright: ignore[reportArgumentType]
        )

        return ValidatedQueryResult.from_query_result(result)

    def _create_result(self, query_results: ValidatedQueryResult, metrics: Sequence[float]) -> Union[ChromaResult, ChromaNeighborResult]:
        if query_results.embeddings is not None:
            return ChromaNeighborResult(
                metrics=metrics,
                id=query_results.ids,
                neighbor_embeddings=query_results.embeddings,
                signal_coefficient=None,
            )
        return ChromaResult(
            metrics=metrics,
            id=query_results.ids,
            signal_coefficient=None,
        )

    def _calculate_score(self, query_results: ValidatedQueryResult) -> Sequence[float]:
        settings = get_settings()
        metrics: List[float] = []
        for distance, _metadata in zip(query_results.distances, query_results.metadatas):
            if settings.USE_SIGNAL_COEFFICIENT:
                raise NotImplementedError("Signal coefficient is not implemented")  # TODO
                # avg_score = sum([1 - d * m["signal_coefficient"] for d, m in zip(distance, metadata)]) / self._neighbors_num
            else:
                avg_score = np.mean(np.maximum(1 - np.array(distance), 0)).tolist()
            metrics.append(avg_score)
        return metrics

    @overload
    def lookup_embeddings(self, embeddings: npt.NDArray[np.float64], return_neighbors: Literal[True]) -> ChromaNeighborResult:
        ...

    @overload
    def lookup_embeddings(self, embeddings: npt.NDArray[np.float64], return_neighbors: Literal[False]) -> ChromaResult:
        ...

    def lookup_embeddings(
        self, embeddings: npt.NDArray[np.float64], return_neighbors: Literal[True, False]
    ) -> Union[ChromaResult, ChromaNeighborResult]:
        if embeddings.ndim != 2:
            raise ValueError("Embeddings must be batched (2D)")

        result = self._query_collection(embeddings.tolist(), return_neighbors=return_neighbors)

        metrics = self._calculate_score(result)
        return self._create_result(result, metrics)
