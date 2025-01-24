# pyright: reportUnknownVariableType=false, reportUnknownArgumentType=false, reportUnknownMemberType=false
import logging
from typing import Dict, List, Optional, Union

import click
import matplotlib.pyplot as plt
import pandas as pd

from whylabs_llm_toolkit.data import init_ci_logging
from whylabs_llm_toolkit.data.datasets.code_dataset import CodeDataset
from whylabs_llm_toolkit.data.datasets.control_data import ControlDataset
from whylabs_llm_toolkit.data.datasets.financial_dataset import FinancialDataset
from whylabs_llm_toolkit.data.datasets.hate_dataset import HateDataset
from whylabs_llm_toolkit.data.datasets.injections_dataset import InjectionsDataset
from whylabs_llm_toolkit.data.datasets.medical_dataset import MedicalDataset
from whylabs_llm_toolkit.data.datasets.toxic_dataset import ToxicDataset
from whylabs_llm_toolkit.data.labels import Labels, all_labels
from whylabs_llm_toolkit.data.scripts.predict import predict_probs
from whylabs_llm_toolkit.data.scripts.targets import ArtifactPaths, SentenceTransformerEncoder, get_encoder_targets

_logger = logging.getLogger(__name__)


def show_plot(name: str, df: Union[pd.DataFrame, List[str]], title: str, st: SentenceTransformerEncoder):
    _logger.info(f"Plotting histogram for {title}")
    if isinstance(df, list):
        df = pd.DataFrame(df, columns=all_labels)

    num_columns = len(df.columns)
    fig, axs = plt.subplots(1, num_columns, figsize=(4 * num_columns, 6))
    fig.suptitle(title, fontsize=16)  # Set the main title for the figure

    # Plot histograms
    for i, column in enumerate(df.columns):
        axs[i].hist(df[column], bins=10)
        axs[i].set_xlim(0, 1)  # Set min/max to 0/1 for each subplot
        mean_value = df[column].mean()
        axs[i].set_title(f"{column} (mean: {mean_value:.2f})")

    plt.tight_layout()
    paths = ArtifactPaths(name)
    figure_path = paths.get_eval_figure_path(st)
    plt.savefig(f"{figure_path}/{title}.png")
    plt.close()


@click.command()
@click.option("-n", "--name", type=str, required=True, help="The experiment name. Controls the model output directory.", envvar="NAME")
@click.option("--eval-limit", type=int, required=False, help="An amount to limit the data to, per label", default=None, envvar="EVAL_LIMIT")
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
def cli(name: str, encoders: Optional[List[str]] = None, eval_limit: Optional[int] = None) -> None:
    if eval_limit is not None:
        size_filter = {
            Labels.injection: eval_limit,
            Labels.code: eval_limit,
            Labels.medical: eval_limit,
            Labels.financial: eval_limit,
            Labels.hate: eval_limit,
            Labels.toxic: eval_limit,
            Labels.innocuous: eval_limit,
        }
    else:
        size_filter: Dict[Labels, int] = {}

    logging.basicConfig(level=logging.INFO)
    for st in get_encoder_targets(encoders):
        _logger.info(f"Predicting probabilities for {st.value.name}")

        model = st.get_setfit_classifier_model(name)

        show_plot(
            name, predict_probs(model, InjectionsDataset(size_filter).get_data("eval"), show_progress_bar=True), "injections_data", st
        )
        show_plot(name, predict_probs(model, ToxicDataset(size_filter).get_data("eval"), show_progress_bar=True), "toxic_data", st)
        show_plot(name, predict_probs(model, MedicalDataset(size_filter).get_data("eval"), show_progress_bar=True), "medical_data", st)
        show_plot(name, predict_probs(model, HateDataset(size_filter).get_data("eval"), show_progress_bar=True), "hate_data", st)
        show_plot(name, predict_probs(model, FinancialDataset(size_filter).get_data("eval"), show_progress_bar=True), "financial_data", st)
        show_plot(name, predict_probs(model, CodeDataset(size_filter).get_data("eval"), show_progress_bar=True), "code_data", st)
        show_plot(name, predict_probs(model, ControlDataset(size_filter).get_data("eval"), show_progress_bar=True), "control_data", st)


if __name__ == "__main__":
    init_ci_logging()
    cli()
