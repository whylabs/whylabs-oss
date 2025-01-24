from typing import Optional, Union, cast

import numpy as np
import numpy.typing as npt
import torch
from setfit import SetFitHead, SetFitModel
from setfit.modeling import LogisticRegression

from langkit.cache.setfit_model import load_setfit_model
from langkit.tensor_util import device
from whylabs_llm_toolkit.asset_download import get_asset
from whylabs_llm_toolkit.data.scripts.targets import Asset, AssetStage, SentenceTransformerEncoder


class SetfitClassifier:
    def __init__(
        self, encoder: SentenceTransformerEncoder, stage: AssetStage, version: Optional[int] = None, local_path: Optional[str] = None
    ) -> None:
        self._encoder = encoder
        self._stage = stage
        self._version = version
        self._asset = Asset(encoder=encoder, stage=stage, asset_id="setfit_classifier", version=version)
        self._setfit_model: Optional[SetFitModel] = None
        self._local_path = local_path

    def cache_assets(self) -> str:
        return self._local_path or get_asset(
            self._asset.asset_id,
            tag=self._asset.tag_name(),
            version=self._version,
        )

    def init(self) -> SetFitModel:
        if self._setfit_model is not None:
            return self._setfit_model

        model_path = self.cache_assets()

        self._setfit_model = load_setfit_model(model_path)
        return self._setfit_model

    def predict_embeddings(
        self,
        embeddings: npt.ArrayLike,
        as_numpy: bool = True,
    ) -> npt.NDArray[np.float64]:
        model = self.init()

        head = cast(Optional[Union[SetFitHead, LogisticRegression]], model.model_head)  # pyright: ignore[reportUnknownMemberType]

        assert head is not None
        tensor = torch.from_numpy(embeddings)  # pyright: ignore[reportUnknownMemberType]
        tensor = tensor.to(device)
        probs = cast(torch.Tensor, head.predict_proba(tensor))  # pyright: ignore[reportUnknownMemberType]

        outputs = cast(npt.NDArray[np.float64], model._output_type_conversion(probs.cpu(), as_numpy=as_numpy))  # pyright: ignore[reportUnknownMemberType, reportPrivateUsage]
        return outputs
