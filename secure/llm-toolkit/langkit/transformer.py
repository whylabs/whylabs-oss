import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from functools import cached_property
from typing import Any, Dict, List, Literal, Optional, Union

import numpy as np
import numpy.typing as npt
import pandas as pd
import torch

from langkit.cache.sentence_transformers import load_sentence_transformer
from langkit.core.context import Context, ContextDependency
from langkit.core.workflow import InputContext
from langkit.metrics.embeddings_types import EmbeddingEncoder, TransformerEmbeddingAdapter
from langkit.onnx_encoder import OnnxSentenceTransformer, TransformerModel
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts.targets import AssetStage, SentenceTransformerEncoder
from whylabs_llm_toolkit.models.setfit.classifier import SetfitClassifier
from whylabs_llm_toolkit.models.setfit.fine_tuned_encoder import FineTunedEncoder
from whylabs_llm_toolkit.settings import get_settings

_logger = logging.getLogger(__name__)


class EmbeddingChoice(ABC):
    @abstractmethod
    def get_encoder(self) -> EmbeddingEncoder:
        raise NotImplementedError()


class SentenceTransformerChoice(EmbeddingChoice):
    def __init__(self, name: str, revision: str):
        self.name = name
        self.revision = revision

    def get_encoder(self) -> EmbeddingEncoder:
        return TransformerEmbeddingAdapter(load_sentence_transformer(self.name, self.revision))


class DefaultChoice(EmbeddingChoice):
    def __init__(self):
        self._settings = get_settings()
        self.encoder = self.get_sentence_transformer_encoder()

    def get_sentence_transformer_encoder(self) -> SentenceTransformerEncoder:
        return SentenceTransformerEncoder.from_string(self._settings.DEFAULT_ENCODER)

    def get_encoder(self) -> EmbeddingEncoder:
        encoder = self.get_sentence_transformer_encoder()
        return TransformerEmbeddingAdapter(encoder.get_sentence_transformers())


class OnnxChoice(EmbeddingChoice):
    def get_encoder(self) -> EmbeddingEncoder:
        return OnnxSentenceTransformer(TransformerModel.AllMiniLM)


@dataclass(frozen=True)
class SentenceTransformerTarget:
    name: str
    revision: str


@dataclass(frozen=True)
class WhyLabsSupportedEncoder:
    """
    These are all of the encoders that we support officially. We generate
    assets that use these encoders and we run evaluations on them.
    """

    official_encoder_name: str

    def get_supported_encoder(self) -> SentenceTransformerEncoder:
        return SentenceTransformerEncoder.from_string(self.official_encoder_name)

    def get_encoder(self) -> EmbeddingEncoder:
        encoder = self.get_supported_encoder()
        return encoder.get_encoder()


@dataclass(frozen=True)
class FineTunedSentenceTransformerChoice:
    official_encoder_name: str
    stage: Optional[AssetStage] = None
    version: Optional[int] = None
    onnx: bool = False

    @cached_property
    def encoder(self) -> EmbeddingEncoder:
        settings = get_settings()
        stage = self.stage or settings.DEFAULT_ASSET_STAGE
        return FineTunedEncoder(
            SentenceTransformerEncoder.from_string(self.official_encoder_name),
            stage=stage,
            version=self.version,
            onnx=self.onnx,
        )


EmbeddingChoiceArg = Union[
    Literal["default"], Literal["onnx"], SentenceTransformerTarget, WhyLabsSupportedEncoder, FineTunedSentenceTransformerChoice
]


class EmbeddingOptions:
    @staticmethod
    def get_encoder(choice: EmbeddingChoiceArg = "default") -> EmbeddingEncoder:
        if choice == "default":
            return DefaultChoice().get_encoder()
        elif choice == "onnx":
            return OnnxChoice().get_encoder()
        elif isinstance(choice, WhyLabsSupportedEncoder):
            return choice.get_encoder()
        elif isinstance(choice, FineTunedSentenceTransformerChoice):
            return choice.encoder
        else:
            return SentenceTransformerChoice(choice.name, choice.revision).get_encoder()

    @staticmethod
    def get_supported_encoder(choice: EmbeddingChoiceArg = "default") -> SentenceTransformerEncoder:
        if isinstance(choice, WhyLabsSupportedEncoder):
            return choice.get_supported_encoder()
        elif isinstance(choice, FineTunedSentenceTransformerChoice):
            return SentenceTransformerEncoder.from_string(choice.official_encoder_name)
        elif choice == "default":
            return DefaultChoice().get_sentence_transformer_encoder()
        else:
            raise ValueError(f"Unsupported encoder {choice}")

    @staticmethod
    def name(embedding_choice: EmbeddingChoiceArg) -> str:
        if embedding_choice == "default":
            default_choice = DefaultChoice()
            choice_str = f"default_{default_choice.encoder.value.name}-{default_choice.encoder.value.revision[:6]}"
        elif embedding_choice == "onnx":
            choice_str = "onnx"
        elif isinstance(embedding_choice, WhyLabsSupportedEncoder):
            _encoder = embedding_choice.get_supported_encoder()
            choice_str = f"official_{_encoder.value.name}-{_encoder.value.revision[:6]}&onnx={_encoder.value.onnx}"
        elif isinstance(embedding_choice, FineTunedSentenceTransformerChoice):
            choice_str = f"fine_tuned_{embedding_choice.official_encoder_name}"
        else:
            choice_str = f"{embedding_choice.name}-{embedding_choice.revision[:6]}"

        return choice_str


@dataclass(frozen=True)
class EmbeddingContextDependency(ContextDependency[Union[torch.Tensor, npt.NDArray[np.float64]]]):
    embedding_choice: EmbeddingChoiceArg
    input_column: str
    _show_progress: bool = False

    def get_verbose_options(self) -> Dict[str, str]:
        return super().get_verbose_options() | {"embedding_choice": EmbeddingOptions.name(self.embedding_choice)}

    def get_verbose_title(self) -> str:
        return f"{self.input_column}.embedding"

    @cached_property
    def _get_encoder(self) -> EmbeddingEncoder:
        return EmbeddingOptions.get_encoder(self.embedding_choice)

    def cache_assets(self) -> None:
        self._get_encoder

    def init(self) -> None:
        self._get_encoder

    def populate_request(self, context: Context, data: pd.DataFrame):
        if self.input_column not in data.columns:
            return

        if self.name() in context.request_data:
            return

        encoder = self._get_encoder
        if self._show_progress:
            items = len(data[self.input_column])  # pyright: ignore[reportUnknownArgumentType]
            _logger.info(f"Encoding {items} items in {self.input_column} column using {self.embedding_choice} encoder")

        embedding = encoder.encode(tuple(data[self.input_column]), show_progress_bar=self._show_progress)  # pyright: ignore[reportUnknownArgumentType]
        context.request_data[self.name()] = embedding


@dataclass(frozen=True)
class SetfitTopicContextDependency(ContextDependency[npt.NDArray[np.float64]]):
    embedding_choice: EmbeddingChoiceArg
    stage: AssetStage
    embedding_context_input_column: str
    _show_progress: bool = False
    version: Optional[int] = None
    local_path: Optional[str] = None

    def get_verbose_options(self) -> Dict[str, str]:
        return super().get_verbose_options() | {"embedding_choice": EmbeddingOptions.name(self.embedding_choice)}

    def get_verbose_title(self) -> str:
        return f"{self.embedding_context_input_column}.setfit_topic"

    @cached_property
    def _classifier(self) -> SetfitClassifier:
        return SetfitClassifier(
            encoder=EmbeddingOptions.get_supported_encoder(self.embedding_choice),
            stage=self.stage,
            version=self.version,
            local_path=self.local_path,
        )

    @cached_property
    def _embedding_context(self) -> EmbeddingContextDependency:
        return EmbeddingContextDependency(self.embedding_choice, self.embedding_context_input_column, self._show_progress)

    def get_dependencies(self) -> List[ContextDependency[Any]]:
        return [self._embedding_context]

    def cache_assets(self) -> None:
        self._classifier.cache_assets()

    def init(self) -> None:
        self._classifier.init()

    def populate_request(self, context: Context, data: pd.DataFrame):
        if self.embedding_context_input_column not in data.columns:
            return

        if self.name() in context.request_data:
            return

        result = self._embedding_context.get_request_data(context)
        if isinstance(result, torch.Tensor):
            request_data = self._embedding_context.get_request_data(context)
            if isinstance(request_data, torch.Tensor):
                target_embeddings: npt.NDArray[np.float64] = request_data.cpu().numpy()
            else:
                target_embeddings = request_data
        else:
            target_embeddings = result

        predictions = self._classifier.predict_embeddings(target_embeddings)

        context.request_data[self.name()] = predictions

    @staticmethod
    def get_label(single_prediction: npt.NDArray[np.float64]) -> Labels:
        default_threshold = 0.65

        # If there is a high likelihood for innocous then don't check the rest
        highest_score = 0
        best_match = Labels.none.name

        for i, score in enumerate(single_prediction):
            if score > highest_score:
                highest_score = score
                best_match = Labels._member_names_[i]

        if highest_score > default_threshold:
            return Labels[best_match]
        else:
            return Labels.none


@dataclass(frozen=True)
class RAGContextDependency(ContextDependency[torch.Tensor]):
    embedding_choice: EmbeddingChoiceArg
    strategy: Literal["combine"] = "combine"
    """
    The strategy for converting the context into embeddings.

    - combine: Combine all the entries in the context into a single string and encode it.
    """
    context_column_name: str = "context"

    def get_verbose_options(self) -> Dict[str, str]:
        return super().get_verbose_options() | {"embedding_choice": EmbeddingOptions.name(self.embedding_choice)}

    def get_verbose_title(self) -> str:
        return f"{self.context_column_name}.context"

    @cached_property
    def _get_encoder(self) -> EmbeddingEncoder:
        return EmbeddingOptions.get_encoder(self.embedding_choice)

    def cache_assets(self) -> None:
        self._get_encoder

    def init(self) -> None:
        self._get_encoder

    def populate_request(self, context: Context, data: pd.DataFrame):
        if self.context_column_name not in data.columns:
            return

        if self.name() in context.request_data:
            return

        rag_context = self._get_rag_context(data)

        if self.strategy == "combine":
            combined: List[str] = []
            for row in rag_context:
                row_string = "\n".join([it["content"] for it in row["entries"]])
                combined.append(row_string)
        else:
            raise ValueError(f"Unknown context embedding strategy {self.strategy}")

        encoder = self._get_encoder
        embedding = encoder.encode(tuple(combined))
        context.request_data[self.name()] = embedding

    def _get_rag_context(self, df: pd.DataFrame) -> List[InputContext]:
        context_column: List[InputContext] = df[self.context_column_name].tolist()
        return context_column
