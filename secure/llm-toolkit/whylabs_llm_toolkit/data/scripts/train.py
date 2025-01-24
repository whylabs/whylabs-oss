import json
import logging
import sys
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional, Union

import click
from datasets import Dataset
from optimum.exporters.onnx import main_export  # pyright: ignore[reportUnknownVariableType]
from optimum.onnxruntime import ORTQuantizer
from optimum.onnxruntime.configuration import AutoQuantizationConfig
from setfit import SetFitModel, Trainer, TrainingArguments

from langkit.tensor_util import device
from whylabs_llm_toolkit.data import init_ci_logging
from whylabs_llm_toolkit.data.data import SizeFilter, create_size_filter
from whylabs_llm_toolkit.data.datasets.full_datasets.standard_data import StandardDataset
from whylabs_llm_toolkit.data.labels import all_labels
from whylabs_llm_toolkit.data.scripts.targets import ArtifactPaths, SentenceTransformerEncoder, get_encoder_targets

logger = logging.getLogger(__name__)


def _to_json_params(path: str, params: Union["EmbeddingHyperParams", "ClassifierHyperParams"]) -> None:
    # first we have to map the size_filter keys to strings using the enum names
    obj: Dict[str, Any] = asdict(params)
    size_filter = params.size_filter
    obj["size_filter"] = {label.name: size for label, size in size_filter.items()} if size_filter else {}
    json.dump(obj, open(path, "w"))


@dataclass(frozen=True)
class EmbeddingHyperParams:
    size_filter: Optional[SizeFilter]
    num_epochs: int = 1
    batch_size: int = 16
    sampling_strategy: str = "oversampling"


def train_embedding(name: str, limit: Optional[int] = 500, encoders: Optional[List[str]] = None) -> None:
    """
    Fine tune some checkpoint of a sentence transformer. This is optional.
    """
    hyper_params = EmbeddingHyperParams(
        sampling_strategy="undersampling",
        size_filter=create_size_filter(limit),
    )

    all_data = StandardDataset(hyper_params.size_filter)

    print(all_data)

    for st in get_encoder_targets(encoders):
        logger.info(f"Training encoder model: {st.value.name}")
        model_path = st.get_embedding_path(name)

        # Define the model and training arguments
        model = SetFitModel.from_pretrained(  # pyright: ignore[reportUnknownMemberType]
            st.value.name,
            revision=st.value.revision,
            multi_target_strategy="one-vs-rest",
            use_differentiable_head=True,
            head_params={"out_features": len(all_labels)},
            labels=all_labels,
        ).to(device=device)

        args = TrainingArguments(
            batch_size=hyper_params.batch_size,
            num_epochs=hyper_params.num_epochs,
            evaluation_strategy="no",
            save_strategy="no",
            load_best_model_at_end=True,
            sampling_strategy=hyper_params.sampling_strategy,
        )

        train = all_data.get_data("train")
        eval = all_data.get_data("eval")
        trainer = Trainer(
            model=model,
            args=args,
            train_dataset=Dataset.from_pandas(train),
            eval_dataset=Dataset.from_pandas(eval),
            metric="accuracy",
        )

        # Train only the embedding model
        assert trainer.train_dataset is not None
        assert trainer.eval_dataset is not None
        params = trainer.dataset_to_parameters(trainer.train_dataset)  # pyright: ignore[reportUnknownVariableType,reportUnknownMemberType]
        full_parameters = params + trainer.dataset_to_parameters(trainer.eval_dataset)  # pyright: ignore[reportUnknownMemberType,reportUnknownVariableType]

        trainer.train_embeddings(*full_parameters, args=args)  # pyright: ignore[reportArgumentType]

        logger.info(f"Saving trained embedding model to {model_path}")
        trainer.model.save_pretrained(model_path)  # pyright: ignore[reportUnknownMemberType]
        _to_json_params(f"{model_path}/ft_hyper_params.json", hyper_params)

        # The evaluation metrics use the classifier so we don't care about them here


@dataclass(frozen=True)
class ClassifierHyperParams:
    size_filter: Optional[SizeFilter]
    num_epochs: int = 8
    batch_size: int = 16
    end_to_end: bool = False


def train_classifier(name: str, skip_fine_tuning: bool = True, limit: Optional[int] = None, encoders: Optional[List[str]] = None) -> None:
    """
    This trains the classifier using the pre-trained encoder from train_embedding.
    """

    size_filter = create_size_filter(limit)
    all_data = StandardDataset(size_filter)

    print(all_data)

    for st in get_encoder_targets(encoders):
        hyper_params = ClassifierHyperParams(
            # TODO Loss is undetectable by the time we get to 5k iterations. Should work more on picking really good examples than
            # flooding with data
            size_filter=size_filter,
            batch_size=128 if st != SentenceTransformerEncoder.AllMiniLML6V2 else 32,
        )
        # Define the model and training arguments

        if skip_fine_tuning:
            # Define the model and training arguments
            model = SetFitModel.from_pretrained(  # pyright: ignore[reportUnknownMemberType]
                st.value.name,
                revision=st.value.revision,
                multi_target_strategy="one-vs-rest",
                use_differentiable_head=True,
                head_params={"out_features": len(all_labels)},
                labels=all_labels,
                device=device,
            )
        else:
            model_path = st.get_embedding_path(name)
            logger.info(f"Training classifiers using pre trained encoder at: {model_path}")
            model = SetFitModel.from_pretrained(  # pyright: ignore[reportUnknownMemberType]
                # st.value.name, #model_path, # load the previously trained model
                model_path,  # load the previously trained model
                local_files_only=True,
                multi_target_strategy="one-vs-rest",
                use_differentiable_head=True,
                # head_params={"out_features": len(all_labels)},
                labels=all_labels,
                device=device,
            )
            # json.load(open(f"{model_path}/ft_hyper_params.json"))
            # copy over the hyper params from the fine tuning
            json.dump(
                json.load(open(f"{model_path}/ft_hyper_params.json")),
                open(f"{st.get_classifier_path(name)}/classifier_hyper_params.json", "w"),
            )

        args = TrainingArguments(
            batch_size=hyper_params.batch_size,
            num_epochs=hyper_params.num_epochs,
            evaluation_strategy="no",
            save_strategy="no",
            load_best_model_at_end=True,
            end_to_end=hyper_params.end_to_end,
        )
        train = all_data.get_data("train")

        eval = all_data.get_data("eval")

        trainer = Trainer(
            model=model,
            args=args,
            train_dataset=Dataset.from_pandas(train),
            eval_dataset=Dataset.from_pandas(eval),
            metric="accuracy",
        )

        # Train only the classifier
        assert trainer.train_dataset is not None
        params = trainer.dataset_to_parameters(trainer.train_dataset)  # pyright: ignore[reportUnknownVariableType,reportUnknownMemberType]
        trainer.train_classifier(*params, args=args)  # pyright: ignore[reportArgumentType]

        trainer.model.save_pretrained(st.get_classifier_path(name))  # pyright: ignore[reportUnknownMemberType]
        _to_json_params(f"{st.get_classifier_path(name)}/classifier_hyper_params.json", hyper_params)

        metrics = trainer.evaluate()
        print(metrics)


def convert_to_onnx(name: str, encoders: Optional[List[str]] = None) -> None:
    for st in get_encoder_targets(encoders):
        paths = ArtifactPaths(name)
        base_model_path = paths.get_classifier_model_path(st)
        onnx_model_path = paths.get_onnx_embedding_model_path(st)

        # Just convert the model to onnx format, don't optimize yet
        main_export(
            model_name_or_path=base_model_path,
            output=onnx_model_path,
            task="feature-extraction",
        )

        # optimizer = ORTOptimizer.from_pretrained(onnx_model_path)
        # config = OptimizationConfig(
        #         optimization_level=2, enable_transformers_specific_optimizations=False, enable_gelu_approximation=True
        #     )
        # optimizer.optimize(optimization_config=config, save_dir=onnx_model_path, file_suffix=None)

        quantizer = ORTQuantizer.from_pretrained(onnx_model_path)

        # Dynamic quantization
        # AWS machines should have avx512_vnni, but mine doesn't
        dqconfig = AutoQuantizationConfig.avx2(is_static=False, per_channel=False)
        quantizer.quantize(dqconfig, save_dir=onnx_model_path, file_suffix=None)


@click.command()
@click.option("-n", "--name", type=str, required=True, help="The experiment name. Controls the model output directory.", envvar="NAME")
@click.option("--classifier", type=bool, is_flag=True, required=False, help="Train the classifier.")
@click.option("--optimize", type=bool, is_flag=True, required=False, help="Optimize the classifier model with optimum.")
@click.option("--embedding", type=bool, is_flag=True, required=False, help="Train the embedding.")
@click.option("--skip-fine-tuning", type=bool, is_flag=True, required=False, help="Train the embedding.")
@click.option(
    "--limit",
    type=int,
    required=False,
    help="An amount to limit the data to, per label. Doesn't apply to the sentence transformer fine tuning.",
    default=None,
    envvar="LIMIT",
)
@click.option(
    "--ft-limit",
    type=int,
    required=False,
    help="An amount to limit the data to, per label, for the fine tuning process. Fine tuning requires much less data and training time "
    "scales far worse with additional data. Best to use a really good subset of data with lower volume.",
    default=None,
    envvar="FT_LIMIT",
)
@click.option(
    "-e",
    "--encoders",
    type=str,
    required=False,
    multiple=True,
    help=f"""
Which sentence transformers to use, from: {str(list([it.name for it in SentenceTransformerEncoder.__members__.values()]))}
""",
    envvar="ENCODERS",
)
def cli(
    name: str,
    classifier: bool,
    embedding: bool,
    skip_fine_tuning: bool = False,
    limit: Optional[int] = None,
    optimize: bool = False,
    ft_limit: Optional[int] = None,
    encoders: Optional[List[str]] = None,
) -> None:
    if classifier:
        train_classifier(name, limit=limit, skip_fine_tuning=skip_fine_tuning, encoders=encoders)
        if optimize:
            convert_to_onnx(name, encoders)
    elif embedding:
        train_embedding(name, limit=ft_limit, encoders=encoders)
    else:
        print("Specify either --classifier or --embedding")
        sys.exit(1)


if __name__ == "__main__":
    init_ci_logging()
    cli()
