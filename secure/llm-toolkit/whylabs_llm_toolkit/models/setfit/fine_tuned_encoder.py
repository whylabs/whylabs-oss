from typing import Any, Optional, Tuple, Union, cast

import onnxruntime as ort
import torch
from optimum.onnxruntime import ORTModelForFeatureExtraction
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer

from langkit.metrics.embeddings_types import ORTModelTokenizerAdapter
from langkit.tensor_util import device
from whylabs_llm_toolkit.asset_download import get_asset
from whylabs_llm_toolkit.data.scripts.targets import Asset, AssetStage, SentenceTransformerEncoder


class FineTunedEncoder:
    def __init__(
        self, encoder: SentenceTransformerEncoder, stage: AssetStage = "prod", version: Optional[int] = None, onnx: bool = False
    ) -> None:
        # The setfit classifier is packaged with the encoder that it used during training, regardless of whether or not it was fine-tuned.
        self._asset = Asset(encoder=encoder, stage=stage, asset_id="setfit_classifier", version=version)
        self._onnx = onnx
        self._encoder: Optional[Union[SentenceTransformer, ORTModelTokenizerAdapter]] = None

    def cache_assets(self) -> str:
        return get_asset(
            self._asset.asset_id,
            tag=self._asset.tag_name(),
            version=self._asset.version,
        )

    def init(self) -> Union[SentenceTransformer, ORTModelTokenizerAdapter]:
        if self._encoder is not None:
            return self._encoder

        model_path = self.cache_assets()

        if self._onnx:
            sess_options = ort.SessionOptions()  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]
            sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL  # pyright: ignore[reportUnknownMemberType]
            sess_options.intra_op_num_threads = 1  # Adjust based on your CPU
            sess_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL  # pyright: ignore[reportUnknownMemberType]

            model = ORTModelForFeatureExtraction.from_pretrained(  # pyright: ignore[reportUnknownMemberType]
                f"{model_path}/onnx",
                session_options=sess_options,  # pyright: ignore[reportUnknownArgumentType]
                provider="CPUExecutionProvider",
            )
            tokenizer = cast(
                AutoTokenizer,
                AutoTokenizer.from_pretrained(  # pyright: ignore[reportUnknownMemberType]
                    pretrained_model_name_or_path=f"{model_path}/onnx",
                ),
            )

            self._encoder = ORTModelTokenizerAdapter(model, tokenizer)  # pyright: ignore[reportArgumentType]
        else:
            self._encoder = SentenceTransformer(model_path, device=device)
        return self._encoder

    def encode(self, text: Tuple[str, ...], **kwargs: Any) -> torch.Tensor:
        model = self.init()
        if isinstance(model, ORTModelTokenizerAdapter):
            return model.encode(text, **kwargs)
        else:
            return model.encode(list(text), convert_to_numpy=False, convert_to_tensor=True)  # pyright: ignore[reportUnknownMemberType]
