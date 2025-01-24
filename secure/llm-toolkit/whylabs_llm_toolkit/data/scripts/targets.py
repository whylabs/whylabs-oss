import os
from dataclasses import dataclass
from enum import Enum
from functools import cache
from typing import List, Literal, Optional, cast

from optimum.onnxruntime import ORTModelForFeatureExtraction
from sentence_transformers import SentenceTransformer
from setfit import SetFitModel
from transformers import (
    AutoTokenizer,
    pipeline,  # pyright: ignore[reportUnknownVariableType]
)

from langkit.cache.sentence_transformers import load_sentence_transformer
from langkit.cache.setfit_model import load_setfit_model
from langkit.metrics.embeddings_types import (
    EmbeddingEncoder,
    OnnxPipelineEmbeddingAdapter,
    ORTModelTokenizerAdapter,
    TransformerEmbeddingAdapter,
)
from whylabs_llm_toolkit.data.datasets.paths import data_path, results_path
from whylabs_llm_toolkit.data.labels import Labels


@dataclass
class DataPaths:
    def get_exclusion_list_path(self) -> str:
        path = f"{data_path()}/exclusion_list"
        os.makedirs(path, exist_ok=True)
        return path


@dataclass
class ArtifactPaths:
    experiment_name: str
    base_path: str = results_path()

    def get_model_path(self) -> str:
        path = f"{self.base_path}/{self.experiment_name}/model"
        os.makedirs(path, exist_ok=True)
        return path

    def get_eval_path(self) -> str:
        path = f"{self.base_path}/{self.experiment_name}/eval"
        os.makedirs(path, exist_ok=True)
        return path

    def get_benchmark_path(self) -> str:
        path = f"{self.base_path}/{self.experiment_name}/benchmark"
        os.makedirs(path, exist_ok=True)
        return path

    def get_data_path(self) -> str:
        path = f"{self.base_path}/{self.experiment_name}/data"
        os.makedirs(path, exist_ok=True)
        return path

    def get_coordinate_path(self) -> str:
        path = f"{self.base_path}/{self.experiment_name}/pca"
        os.makedirs(path, exist_ok=True)
        return path

    def get_embedding_model_path(self, target: "SentenceTransformerEncoder") -> str:
        model_path = self.get_model_path()
        path = f"{model_path}/{target.name}/embedding_model/"
        os.makedirs(path, exist_ok=True)
        return path

    def get_onnx_embedding_model_path(self, target: "SentenceTransformerEncoder") -> str:
        model_path = self.get_classifier_model_path(target)
        path = f"{model_path}/onnx/"
        os.makedirs(path, exist_ok=True)
        return path

    def get_classifier_model_path(self, target: "SentenceTransformerEncoder") -> str:
        model_path = self.get_model_path()
        path = f"{model_path}/{target.name}/classifier_model/"
        os.makedirs(path, exist_ok=True)
        return path

    def get_chromadb_path(self, target: "SentenceTransformerEncoder", label: Labels, twoclass: bool = False) -> str:
        model_path = self.get_model_path()
        db_name = "chromadb_twoclass" if twoclass else "chromadb"
        path = f"{model_path}/{target.name}/{db_name}/{label.name}"
        os.makedirs(path, exist_ok=True)
        return path

    def get_chromadb_base_path(self, target: "SentenceTransformerEncoder", twoclass: bool = False) -> str:
        model_path = self.get_model_path()
        db_name = "chromadb_twoclass" if twoclass else "chromadb"
        path = f"{model_path}/{target.name}/{db_name}"
        os.makedirs(path, exist_ok=True)
        return path

    def get_eval_results_path(self, target: "SentenceTransformerEncoder") -> str:
        eval_path = self.get_eval_path()
        path = f"{eval_path}/{target.name}/eval_results/"
        os.makedirs(path, exist_ok=True)
        return path

    def get_benchmark_results_path(self, target: "SentenceTransformerEncoder", folder: str = "ID") -> str:
        benchmark_path = self.get_benchmark_path()
        path = f"{benchmark_path}/{target.name}/benchmark_results/{folder}/"
        os.makedirs(path, exist_ok=True)

        return path

    def get_benchmark_histogram_path(self, target: "SentenceTransformerEncoder", folder: str = "ID") -> str:
        benchmark_results_path = self.get_benchmark_results_path(target, folder)
        path = f"{benchmark_results_path}/histograms/"
        os.makedirs(path, exist_ok=True)
        return path

    def get_eval_figure_path(self, target: "SentenceTransformerEncoder") -> str:
        results_path = self.get_eval_results_path(target)
        path = f"{results_path}/figures/"
        os.makedirs(path, exist_ok=True)
        return path

    def get_precomputed_data_path(self, target: "SentenceTransformerEncoder", suffix: Literal["csv", "json"]) -> str:
        """
        This variant of the data includes the embeddings, unlike get_data_path()
        """
        data_path = self.get_data_path()
        path = f"{data_path}/{target.name}_precompute.{suffix}"
        os.makedirs(os.path.dirname(path), exist_ok=True)
        return path

    def get_snapshot_data_path(self, target: "SentenceTransformerEncoder", suffix: Literal["csv", "json"]) -> str:
        """
        A snapshot of all of the data that we use in a particular job.
        """
        data_path = self.get_data_path()
        path = f"{data_path}/{target.name}_snapshot.{suffix}"
        os.makedirs(os.path.dirname(path), exist_ok=True)
        return path

    def get_pca_coordinate_path(self, target: "SentenceTransformerEncoder") -> str:
        coordinate_path = self.get_coordinate_path()
        path = f"{coordinate_path}/{target.name}/pca_coordinates/"
        os.makedirs(path, exist_ok=True)
        return f"{path}/pca.pkl"


# TODO: Implement AssetNames
# @dataclass
# class AssetNames:


@dataclass(frozen=True)
class SentenceTransformerVersion:
    name: str
    revision: str
    onnx: bool = False


class SentenceTransformerEncoder(Enum):
    ParaphraseMultilingualMpnetBaseV2 = SentenceTransformerVersion(
        name="paraphrase-multilingual-mpnet-base-v2", revision="79f2382ceacceacdf38563d7c5d16b9ff8d725d6"
    )
    AllMiniLML6V2 = SentenceTransformerVersion(name="all-MiniLM-L6-v2", revision="8b3219a92973c328a8e22fadcfa821b5dc75636a")
    ParaphraseMultilingualMiniLML12V2 = SentenceTransformerVersion(
        name="paraphrase-multilingual-MiniLM-L12-v2", revision="bf3bf13ab40c3157080a7ab344c831b9ad18b5eb"
    )
    BGESmallEn_V1_5 = SentenceTransformerVersion(name="BAAI/bge-small-en-v1.5", revision="5c38ec7c405ec4b44b94cc5a9bb96e735b38267a")

    def get_embedding_path(self, experiment_name: str) -> str:
        return ArtifactPaths(experiment_name).get_embedding_model_path(self)

    def get_classifier_path(self, experiment_name: str) -> str:
        return ArtifactPaths(experiment_name).get_classifier_model_path(self)

    def get_setfit_model(self, experiment_name: str) -> SetFitModel:
        return load_setfit_model(self.get_embedding_path(experiment_name))

    def get_setfit_classifier_model(self, experiment_name: str) -> SetFitModel:
        return load_setfit_model(self.get_classifier_path(experiment_name))

    def get_sentence_transformers(self) -> SentenceTransformer:
        return load_sentence_transformer(self.value.name, revision=self.value.revision)

    @cache
    def _get_sentence_transformers_onnx(self) -> EmbeddingEncoder:
        # There is a convention on huggingface that this code assumes, where the onnx models are stored in a subfolder
        # called "onnx" in the model's directory.
        model = ORTModelForFeatureExtraction.from_pretrained(self.value.name, revision=self.value.revision, subfolder="onnx")  # pyright: ignore[reportUnknownMemberType]
        tokenizer = cast(
            AutoTokenizer,
            AutoTokenizer.from_pretrained(  # pyright: ignore[reportUnknownMemberType]
                self.value.name,
                revision=self.value.revision,
            ),
        )

        return OnnxPipelineEmbeddingAdapter(
            pipeline(
                "feature-extraction",
                model=model,  # pyright: ignore[reportArgumentType]
                tokenizer=tokenizer,  # pyright: ignore[reportArgumentType]
                return_tensors="pt",
            )
        )

    @cache
    def _get_sentence_transformers_onnx_norm(self) -> EmbeddingEncoder:
        # There is a convention on huggingface that this code assumes, where the onnx models are stored in a subfolder
        # called "onnx" in the model's directory.
        model = ORTModelForFeatureExtraction.from_pretrained(self.value.name, revision=self.value.revision, subfolder="onnx")  # pyright: ignore[reportUnknownMemberType]
        tokenizer = cast(
            AutoTokenizer,
            AutoTokenizer.from_pretrained(  # pyright: ignore[reportUnknownMemberType]
                self.value.name,
                revision=self.value.revision,
            ),
        )

        return ORTModelTokenizerAdapter(model, tokenizer)  # pyright: ignore[reportArgumentType]

    def get_encoder(self) -> EmbeddingEncoder:
        if self.value.onnx:
            return self._get_sentence_transformers_onnx_norm()
        return TransformerEmbeddingAdapter(self.get_sentence_transformers())

    @staticmethod
    def from_string(name: str) -> "SentenceTransformerEncoder":
        for encoder in SentenceTransformerEncoder:
            if encoder.name == name:
                return encoder
        raise ValueError(f"Unsupported encoder {name}")


AssetStage = Literal["dev", "prod", "local", "local_anthony", "local_felipe", "demo", "local_christine"]
AssetId = Literal[
    "setfit_classifier",
    "data",
    "eval",
    "pca",
    "chromadb",
    "chromadb_code",
    "chromadb_medical",
    "chromadb_financial",
    "chromadb_harmful",
    "chromadb_toxic",
    "chromadb_hate",
    "chromadb_innocuous",
    "chromadb_twoclass",
    "chromadb_twoclass_code",
    "chromadb_twoclass_medical",
    "chromadb_twoclass_financial",
    "chromadb_twoclass_harmful",
    "chromadb_twoclass_toxic",
    "chromadb_twoclass_hate",
    "chromadb_twoclass_innocuous",
]

asset_metadata_path = "metadata.json"
"""
The path within each asset where the metadata json file is stored.
"""


@dataclass
class Asset:
    encoder: SentenceTransformerEncoder
    stage: AssetStage
    asset_id: AssetId
    version: Optional[int] = None

    def tag_name(self) -> str:
        return f"{self.stage}_{self.encoder.value.name}"


def get_encoder_targets(filter_names: Optional[List[str]] = None) -> List[SentenceTransformerEncoder]:
    if not filter_names:
        return [it for it in SentenceTransformerEncoder]
    return [it for it in SentenceTransformerEncoder if it.name in filter_names]
