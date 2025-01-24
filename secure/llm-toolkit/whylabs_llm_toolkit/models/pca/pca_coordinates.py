import json
import pickle
from functools import cache
from typing import Any, Dict, List, Optional, Union, cast

import numpy as np
import numpy.typing as npt
from sklearn.decomposition import PCA

from whylabs_llm_toolkit.asset_download import get_asset
from whylabs_llm_toolkit.data.scripts.targets import Asset, AssetStage, SentenceTransformerEncoder, asset_metadata_path


class PCACoordinates:
    def __init__(self, encoder: SentenceTransformerEncoder, stage: AssetStage, version: Optional[int] = None) -> None:
        self._encoder = encoder
        self._stage = stage
        self._version = version
        self._asset = Asset(encoder=encoder, stage=stage, asset_id="pca", version=version)
        self._pca: Optional[PCA] = None

    @cache
    def cache_assets(self) -> str:
        return get_asset(
            self._asset.asset_id,
            tag=self._asset.tag_name(),
            version=self._version,
        )

    @cache
    def init(self) -> PCA:
        if self._pca is not None:
            return self._pca

        pca_path = self.cache_assets()

        self._pca = pickle.load(open(f"{pca_path}/pca.pkl", "rb"))
        assert self._pca is not None
        return self._pca

    def generate_pca_coordinates(
        self,
        embeddings: Union[npt.NDArray[Any], List[List[Any]]],
    ) -> npt.NDArray[np.float64]:
        """
        Generate PCA coordinates for the embeddings.

        Args:
            embeddings: The single embedding to generate PCA coordinates for.

        Returns:
            The PCA coordinates in a numpy array. The outer shape is the same as the input embeddings, and the inner
            shape is the number of PCA components (3).
        """
        pca = self.init()
        embeddings_array = np.array(embeddings)

        original_shape = embeddings_array.shape

        if embeddings_array.ndim == 3:
            # Reshape 3D input to 2D
            embeddings_array = embeddings_array.reshape(-1, original_shape[-1])
        elif embeddings_array.ndim > 3:
            raise ValueError(f"Input dimensionality {embeddings_array.ndim} is not supported. Expected 2D or 3D input.")

        pca_result = cast(npt.NDArray[np.float64], pca.transform(embeddings_array))  # pyright: ignore[reportUnknownMemberType]

        if len(original_shape) == 3:
            # Reshape the result back to 3D
            pca_result = pca_result.reshape(original_shape[0], original_shape[1], -1)

        return pca_result

    def get_metadata(self) -> Dict[str, str]:
        metadata: Dict[str, str] = json.load(open(f"{self.cache_assets()}/{asset_metadata_path}", "r"))

        return {
            "encoder": metadata.get("encoder", ""),
            "encoder_revision": metadata.get("encoder_revision", ""),
            "sha": metadata.get("sha", metadata.get("git_sha", "")),
            "toolkit_version": metadata.get("toolkit_version", ""),
            "asset_version": metadata.get("asset_version", ""),
            "data_tag": metadata.get("data_tag", ""),
            "data_version": metadata.get("data_version", ""),
        }
