import logging
from dataclasses import dataclass
from functools import partial
from typing import Dict, List, Optional, Tuple

import click
import pandas as pd

from langkit.core.metric import MetricCreator, WorkflowOptions
from langkit.core.workflow import Workflow
from langkit.metrics.injections_chroma_twoclass import injections_twoclass_metric_chroma
from langkit.metrics.wf_option_util import WorkflowOptionUtil
from langkit.transformer import WhyLabsSupportedEncoder
from whylabs_llm_toolkit.data.data import DataGroup
from whylabs_llm_toolkit.data.datasets.control_data import PurpleLLamaFRRDataset, SafeGuardPromptInjectionControlDataset
from whylabs_llm_toolkit.data.datasets.injections_dataset import (
    GarakInjectionsDataset,
    PurpleLlamaInjectionsDataset,
    SafeGuardPromptInjectionDataset,
)
from whylabs_llm_toolkit.data.labels import Labels
from whylabs_llm_toolkit.data.scripts.targets import ArtifactPaths, AssetStage, SentenceTransformerEncoder, get_encoder_targets
from whylabs_llm_toolkit.data.scripts.utils import generate_index_html
from whylabs_llm_toolkit.eval.evaluation_metrics import (
    MetricInput,
    calculate_binary_classification_results,
)
from whylabs_llm_toolkit.rulesets.normalize_scores import thresholds
from whylabs_llm_toolkit.settings import reload_settings

_logger = logging.getLogger(__name__)

_HEAD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Benchmark Results</title>
    <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css">
</head>"""


class SGInjectionOODDataset(DataGroup):
    def __init__(self, size_filter: Optional[Dict[Labels, int]] = None):
        super().__init__(
            [
                SafeGuardPromptInjectionControlDataset(),
                SafeGuardPromptInjectionDataset(),
            ],
            size_filter=size_filter,
        )


def get_whylabs_injection_preds(
    texts: List[str], paths: ArtifactPaths, st: SentenceTransformerEncoder, stage: Optional[AssetStage] = None
) -> Tuple[List[float], float]:
    options: WorkflowOptions = {}
    WorkflowOptionUtil.set_embedding_choice(options, WhyLabsSupportedEncoder(st.name))
    if stage is not None:  # if stage is provided, don't use the model from paths
        inj_metric: MetricCreator = partial(injections_twoclass_metric_chroma, column_name="prompt", stage=stage, neighbors_num=10)
    else:
        inj_metric: MetricCreator = partial(
            injections_twoclass_metric_chroma,
            column_name="prompt",
            local_path=paths.get_chromadb_path(st, Labels.injection, twoclass=True),
            neighbors_num=10,
        )

    wf = Workflow(
        metrics=[
            inj_metric(),
        ],
        options=options,
    )
    results = wf.run(pd.DataFrame({"prompt": texts}))
    total_latency = results.perf_info.metrics_total_sec + results.perf_info.context_total_sec
    scores_list: List[float] = results.metrics["prompt.similarity.injection"].tolist()
    return scores_list, total_latency


@dataclass
class ReportInput:
    df: pd.DataFrame
    len_pos: int
    len_neg: int
    threshold: float


class InjectionReportBuilder:
    def __init__(self, paths: ArtifactPaths, st: SentenceTransformerEncoder, stage: Optional[AssetStage] = None):
        self.paths = paths
        self.st = st
        self.stage = stage
        self.metric_input = None

    def build(self, data: pd.DataFrame, name: str = "") -> ReportInput:
        paths = self.paths
        st = self.st
        stage = self.stage
        labels = [1 if label == "injection" else 0 for label in data["dataset"].tolist()]  # pyright: ignore[reportUnknownVariableType]
        texts: List[str] = data["text"].tolist()
        scores_whylabs, total_whylabs_latency = get_whylabs_injection_preds(texts, paths, st, stage=stage)  # pyright: ignore[reportArgumentType]
        threshold_sensitivity = thresholds.get("prompt.similarity.injection")
        if threshold_sensitivity is not None:
            threshold = threshold_sensitivity.medium
        else:
            threshold = 0.5
        preds_whylabs = [1 if score > threshold else 0 for score in scores_whylabs]

        whylabs_metric_input = MetricInput(
            labels=labels,
            scores=scores_whylabs,
            predictions=preds_whylabs,
            time=total_whylabs_latency,
            threshold=threshold,
        )
        len_pos = sum(whylabs_metric_input.labels)
        len_neg = len(whylabs_metric_input.labels) - len_pos
        support = len(whylabs_metric_input.labels)
        threshold = whylabs_metric_input.threshold
        whylabs_results = calculate_binary_classification_results(whylabs_metric_input)
        whylabs_precision, whylabs_recall, whylabs_avg_latency = None, None, None
        if whylabs_results.results[0].time is not None:
            whylabs_avg_latency = round(1000 * whylabs_results.results[0].time / support, 1)
        if whylabs_results.results[0].precision is not None:
            if len_neg == 0:
                whylabs_precision = None
            else:
                whylabs_precision = round(whylabs_results.results[0].precision, 3)
        if whylabs_results.results[0].recall is not None:
            whylabs_recall = round(whylabs_results.results[0].recall, 3)
        benchmark_df = pd.DataFrame(columns=["Avg. Latency(ms)", "Precision", "Recall"])
        benchmark_df.loc[f"{name} Prompt Injections"] = [whylabs_avg_latency, whylabs_precision, whylabs_recall]
        benchmark_df = benchmark_df.fillna("-")  # pyright: ignore[reportUnknownMemberType]

        return ReportInput(benchmark_df, len_pos, len_neg, threshold if threshold is not None else 0)


def write_safeguard_injection_benchmark_results(
    paths: ArtifactPaths, st: SentenceTransformerEncoder, stage: Optional[AssetStage] = None
) -> str:
    report_builder = InjectionReportBuilder(paths, st, stage)

    data = SGInjectionOODDataset().get_data("test")
    safeguard_report = report_builder.build(data, name="SafeGuard")
    html_table = safeguard_report.df.to_html()  # pyright: ignore[reportUnknownMemberType]
    html_content = f"""<h1>Injections</h1>
        <h2> Safeguard Prompt Injections</h2>

        {html_table}
        <p> The data used for the benchmark was sourced from the
        <a href="https://huggingface.co/datasets/xTRam1/safe-guard-prompt-injection">Safeguard Prompt Injections dataset</a>,
        with <b> {safeguard_report.len_pos} </b> positive and <b> {safeguard_report.len_neg} </b> negative samples.  </p>
        <p> The results from WhyLabs were calculated using <b> prompt.similarity.injection </b>
        metric with a threshold of <b> {str(round(safeguard_report.threshold, 3))} </b> </p> """

    frr_data = PurpleLLamaFRRDataset().get_data("test")
    purplellama_data = PurpleLlamaInjectionsDataset().get_data("test")
    combined_purplellama_data = pd.concat([frr_data, purplellama_data], ignore_index=True)
    purplellama_report = report_builder.build(combined_purplellama_data, name="PurpleLlama")
    purplellama_html_table = purplellama_report.df.to_html()  # pyright: ignore[reportUnknownMemberType]
    purplellama_content = f"""
    <h2> PurpleLlama</h2>
    {purplellama_html_table}
    <p> The metrics above were generated using the
    <a href=https://github.com/meta-llama/PurpleLlama/blob/main/CybersecurityBenchmarks/datasets/frr/frr.json>
    PurpleLlama's FRR Dataset</a>,
    with <b>{purplellama_report.len_neg}</b> negative examples,
        and the security-violating examples from the
        <a href=https://github.com/meta-llama/PurpleLlama/blob/b82b1a09a6728a2e6a621b05bbf7494d88d75452/CybersecurityBenchmarks/datasets/prompt_injection/prompt_injection.json>
        PurpleLlama's Prompt Injections dataset </a>
        with  <b>{purplellama_report.len_pos}</b> positive examples, using the <b> prompt.similarity.injection </b> metric,
        with a threshold of {purplellama_report.threshold}  </p>
        """

    garak_data = GarakInjectionsDataset().get_data("test")
    garak_report = report_builder.build(garak_data, name="Garak In the Wild")
    garak_html_table = garak_report.df.to_html()  # pyright: ignore[reportUnknownMemberType]
    garak_html_content = f"""
        <h2> Garak In The Wild Prompt Injections</h2>

        {garak_html_table}
        <p> The data used for the benchmark was sourced from the
        <a href="https://github.com/NVIDIA/garak/blob/main/garak/data/inthewild_jailbreak_llms.txt">NVIDIA's garak project</a>,
        with <b> {garak_report.len_pos} </b> positive and <b> {garak_report.len_neg} </b> negative samples.  </p>
        <p> The results from WhyLabs were calculated using <b> prompt.similarity.injection </b>
        metric with a threshold of <b> {str(round(garak_report.threshold, 3))} </b> </p> """

    return html_content + purplellama_content + garak_html_content


def write_market_performance_benchmark_results(
    name: str, st: SentenceTransformerEncoder = SentenceTransformerEncoder.AllMiniLML6V2, stage: Optional[AssetStage] = None
) -> None:
    paths = ArtifactPaths(name)
    injection_html = write_safeguard_injection_benchmark_results(paths, st, stage=stage)
    comparison_path = paths.get_benchmark_results_path(st, "Comparison")
    with open(f"{comparison_path}/bencmark_report.html", "w") as file:
        file.write(_HEAD_HTML + injection_html)


@click.command()
@click.option("-n", "--name", type=str, required=True, help="The experiment name. Controls the model output directory.", envvar="NAME")
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
def cli(name: str, encoders: Optional[List[str]] = None):
    """
    Generate benchmark report for the specified encoders
    """
    reload_settings()
    for st in get_encoder_targets(encoders):
        write_market_performance_benchmark_results(name, st)
    paths = ArtifactPaths(name)
    benchmark_folder = paths.get_benchmark_path()
    generate_index_html(benchmark_folder)
    reload_settings()


if __name__ == "__main__":
    cli()
