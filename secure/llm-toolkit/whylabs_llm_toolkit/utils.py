import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Any, List, Optional, Union, cast

import chromadb
import numpy as np
import numpy.typing as npt
import pandas as pd
from chromadb.api.types import IncludeEnum

from whylabs_llm_toolkit.asset_download import get_asset
from whylabs_llm_toolkit.data.scripts.targets import SentenceTransformerEncoder

logger = logging.getLogger(__name__)


def process_embeddings(
    harm_embeddings: Union[pd.DataFrame, npt.NDArray[Any]],
) -> Optional["np.ndarray[Any, Any]"]:
    """
    Normalizes embeddings so the models can perform cosine similarity search.
    Accepts a) a pandas DataFrame with schema as expected from the asset API - with columns index and sentence_embedding.
    or b) a numpy array.
    """
    if isinstance(harm_embeddings, pd.DataFrame):
        if harm_embeddings.empty:
            return None
        embeddings: npt.NDArray[Any] = np.stack(cast(List[npt.NDArray[Any]], harm_embeddings["sentence_embedding"].tolist()))
    else:  # harm_embeddings is a numpy array
        embeddings = harm_embeddings
    try:
        np_embeddings = embeddings.astype(np.float32)
        embeddings_norm = np_embeddings / np.linalg.norm(np_embeddings, axis=1, keepdims=True)
        return embeddings_norm
    except Exception as e:
        raise ValueError(f"Unable to process embeddings. Error: {e}")


@dataclass
class AssetPath:
    asset_id: str
    tag: str
    zip_path: str
    extract_path: str


class AssetHandler:
    def __init__(self, dataset: str, asset_type: str):
        self.dataset = dataset
        self.asset_id = f"{dataset}_{asset_type}"
        self.asset_path = None

    def _download_asset(self, filename: str, tag: str = "0", version: Optional[int] = None):
        asset_path = get_asset(self.asset_id, tag, version)
        self.asset_path = asset_path
        df = pd.read_parquet(os.path.join(asset_path, filename))
        return df

    def asset_path_return(self):
        return self.asset_path

    def version_return(self):
        if self.asset_path is None:
            raise ValueError("No asset path found")
        else:
            asset_path = self.asset_path
            components = asset_path.split("/")

        if len(components) >= 2:
            version = components[-2]
            return version
        else:
            raise ValueError("Path does not contain enough components to extract version")

    @lru_cache
    def get_embeddings(self, tag: Optional[str], encoder_name: str, version: Optional[int] = None) -> Optional[pd.DataFrame]:
        if not tag:
            return None
        # TODO we probably have to add the encoder version that we're using here as well
        if isinstance(encoder_name, SentenceTransformerEncoder):
            encoder_name = encoder_name.value.name
        filename = f"embeddings_{encoder_name}_{self.dataset}.parquet"
        harm_embeddings = self._download_asset(filename, tag, version)
        return harm_embeddings

    def download_dataset(self, tag: Optional[str], version: Optional[int] = None) -> Optional[pd.DataFrame]:
        if not tag:
            return None
        filename = f"{self.dataset}_df.parquet"
        df = self._download_asset(filename, tag=tag, version=version)
        return df

    def _save_chroma_collection(self, collection: chromadb.Collection, directory: str):
        persistent_client = chromadb.PersistentClient(path=directory)
        new_collection = persistent_client.create_collection(
            name=collection.name,
            metadata={"hnsw:space": "cosine"},  # this metric is 'cosine distance'
        )
        all_data = collection.get(include=[IncludeEnum.documents, IncludeEnum.metadatas, IncludeEnum.embeddings])
        new_collection.add(  # pyright: ignore[reportUnknownMemberType]
            ids=all_data["ids"],
            embeddings=all_data["embeddings"],
            metadatas=all_data["metadatas"],
            documents=all_data["documents"],
        )


class DatasetHandler(AssetHandler):
    def __init__(self, dataset: str):
        super().__init__(dataset, "dataset")


class ChromaHandler(AssetHandler):
    def __init__(
        self,
        dataset: str,
        tag: str,
    ):
        self.asset_path = None
        super().__init__(dataset, asset_type="chroma")
        self.collection = self.get_chroma_db(path=self.dataset, tag=tag)

    def version_return(self):
        if self.asset_path is None:
            raise ValueError("No asset path found")
        else:
            asset_path = self.asset_path
            components = asset_path.split("/")

        if len(components) >= 2:
            version = components[-2]
            return version
        else:
            raise ValueError("Path does not contain enough components to extract version")

    def get_chroma_db(self, tag: str = "main", path: Optional[str] = None) -> chromadb.Collection:
        # Load chromaDB
        path = get_asset(asset_id=self.asset_id, tag=tag)
        collection_name = f"{self.dataset}_embeddings"
        # Connect to chromaDB
        client = chromadb.PersistentClient(path=path)
        collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},  # this metric is 'cosine distance'
        )
        return collection


class BenchmarkHandler(AssetHandler):
    def __init__(self, dataset: str):
        super().__init__(dataset, "benchmark")
