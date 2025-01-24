import logging
import pickle
import sys
from functools import partial
from pprint import pprint
from typing import List, Optional, cast

import click
import pandas as pd
from sklearn.decomposition import PCA

from langkit.core.workflow import Workflow, WorkflowResult
from langkit.transformer import WhyLabsSupportedEncoder
from whylabs_llm_toolkit.data import init_ci_logging
from whylabs_llm_toolkit.data.data import create_size_filter
from whylabs_llm_toolkit.data.datasets.full_datasets.standard_data import StandardDataset

# from whylabs_llm_toolkit.data.datasets.injections_dataset import InjectionsControlDataset
from whylabs_llm_toolkit.data.scripts.targets import ArtifactPaths, SentenceTransformerEncoder, get_encoder_targets
from whylabs_llm_toolkit.data.steps.pca_step import pca_step

_logger = logging.getLogger(__name__)


def extract_features(st: SentenceTransformerEncoder, data: pd.DataFrame) -> WorkflowResult:
    embedding_choice = WhyLabsSupportedEncoder(st.name)
    wf = Workflow(metrics=[partial(pca_step, embedding_choice)])

    result = wf.run(data)
    print()
    print(f"Result for {st}")
    pprint(result)
    print()

    result.metrics.reset_index(drop=True, inplace=True)
    data.reset_index(drop=True, inplace=True)
    return result


def generate_precomputed_data(name: str, st: SentenceTransformerEncoder, data: pd.DataFrame) -> None:
    data = data.drop_duplicates(subset=["text"])  # TODO this should happen in the DataGroup class so it always happens
    paths = ArtifactPaths(name)
    result = extract_features(st, data)
    joined = pd.concat([result.metrics, data], axis=1)
    csv_path = paths.get_precomputed_data_path(st, "csv")
    _logger.info(f"Writing csv to {csv_path}")
    joined.to_csv(paths.get_precomputed_data_path(st, "csv"), index=False)
    joined.to_json(paths.get_precomputed_data_path(st, "json"), orient="records", lines=True)  # pyright: ignore[reportUnknownMemberType]

    # write another version without the 'embeddings' column to paths.get_snapshot_data_path()
    snapshot = joined.drop(columns=["embeddings"])
    snapshot.to_csv(paths.get_snapshot_data_path(st, "csv"), index=False)
    snapshot.to_json(paths.get_snapshot_data_path(st, "json"), orient="records", lines=True)  # pyright: ignore[reportUnknownMemberType]

    assert result.outputs, "Expect the data pipeline workflow to also return outputs"
    # outputs = {result for result in result.outputs.values}
    # combine all of the sub dicts into one
    outputs = {k: v for d in result.outputs.values() for k, v in d.items()}
    pca: PCA = cast(PCA, outputs["pca"])

    pickle.dump(pca, open(paths.get_pca_coordinate_path(st), "wb"))

    if result.validation_results.report:
        print("Validation failure:")
        pprint(result.validation_results.report)
        sys.exit(1)

    # print out aggregate performance info
    time_per_entry = result.perf_info.context_total_sec / len(data)
    print(f"Average encoding time per entry: {time_per_entry:.3f} seconds")


@click.command()
@click.option("-n", "--name", type=str, required=True, help="The experiment name. Controls the model output directory.", envvar="NAME")
@click.option("--limit", type=int, required=False, help="An amount to limit the data to, per label", default=None, envvar="LIMIT")
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
def cli(name: str, limit: Optional[int] = None, encoders: Optional[List[str]] = None) -> None:
    size_filter = create_size_filter(limit)
    all = StandardDataset(size_filter)
    data = all.get_data("train")

    print(all)
    # TODO generate an artifact in a new step that contains the experimentally determined thresholds

    print(f"Running data process with encoders {encoders}")
    for st in get_encoder_targets(encoders):
        generate_precomputed_data(name, st, data)


if __name__ == "__main__":
    init_ci_logging()
    cli()
